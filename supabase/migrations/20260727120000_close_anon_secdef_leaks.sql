-- Schließt die in AUDIT_REPORT.md (Phase 1A, 27.07.2026) live gegen PROD
-- verifizierten Lücken F-1 bis F-4.
--
-- Gemeinsames Muster der Funktions-Befunde: SECURITY DEFINER ohne
-- auth.uid()-Bezug + Postgres-Default GRANT EXECUTE TO PUBLIC = für anon
-- aufrufbar und damit an der RLS vorbei.
--
-- Bewusst über GRANTs statt über Funktionskörper gelöst, wo es geht: die
-- Funktionskörper sind teilweise über das Lovable-Dashboard entstanden und
-- liegen nicht vollständig im Repo. Ein REVOKE braucht den Körper nicht zu
-- kennen und kann ihn folglich auch nicht kaputtmachen.
--
-- Aufrufer vor dem Fix geprüft:
--   search_profiles_universal      → UniversalSearch.tsx, HorseTransferWizard.tsx (eingeloggt)
--   search_horse_by_readable_id    → ConnectionSearch.tsx (eingeloggt)
--   get_user_role                  → ensureProfile.ts, useProfileGuardian.tsx,
--                                    BotschafterAuth.tsx (alle mit eigener ID, eingeloggt)
--   search_profile_by_readable_id  → PartnerPublicProfile.tsx (ÖFFENTLICH!) +
--                                    4 eingeloggte Aufrufer → braucht Körper-Fix

-- ─── F-1: search_horse_by_readable_id ───────────────────────────────────────
-- Pferdename, Foto, Rasse und owner_id waren ohne Login über die EQID
-- abrufbar (live verifiziert: EQID-800144 → "Sunny" + owner_id).
REVOKE EXECUTE ON FUNCTION public.search_horse_by_readable_id(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_horse_by_readable_id(text) TO authenticated, service_role;

-- ─── F-2a: search_profiles_universal ────────────────────────────────────────
-- ILIKE-Suche ab 2 Zeichen → komplettes Nutzerverzeichnis (Klarname, PLZ,
-- Rolle, UUID) inkl. Kunden abziehbar. is_discoverable ist als Gate
-- wirkungslos, weil es der Spalten-Default ist (72 von 72 auf true).
REVOKE EXECUTE ON FUNCTION public.search_profiles_universal(text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_profiles_universal(text, integer) TO authenticated, service_role;

-- ─── F-3: get_user_role ─────────────────────────────────────────────────────
-- Nimmt eine beliebige user_id entgegen → Rollen-Enumeration, in Kombination
-- mit F-2 eine vollständige Systemübersicht inkl. "welches Konto ist Admin".
-- is_admin() wird BEWUSST nicht angefasst: die Funktion wird in RLS-Policies
-- verwendet, die auch für anon ausgewertet werden.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

-- ─── F-2b: search_profile_by_readable_id ────────────────────────────────────
-- Muss für anon erreichbar bleiben: /partner/:prid ist eine gewollte
-- öffentliche Visitenkarte. Deshalb hier ein Körper-Fix statt REVOKE.
-- Ohne Login werden nur noch Dienstleister-Profile herausgegeben — Kunden
-- (Pferdebesitzer) haben keine öffentliche Profilseite und dürfen über eine
-- geratene KID auch nicht auffindbar sein. Eingeloggte Nutzer sehen
-- unverändert alle Rollen (LinkAppUserModal sucht Kunden per KID).
-- Basis: supabase/migrations/20260719080000_fix_minor_idor_functions.sql
CREATE OR REPLACE FUNCTION public.search_profile_by_readable_id(search_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  clean_id TEXT;
BEGIN
  clean_id := UPPER(TRIM(REPLACE(search_id, '#', '')));

  IF char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_build_object(
    'found', true,
    'id', p.id,
    'readable_id', p.readable_id,
    'full_name', COALESCE(p.full_name, 'Unbekannt'),
    'avatar_url', p.avatar_url,
    'role', (SELECT role FROM public.user_roles WHERE user_id = p.id LIMIT 1)
  )
  INTO result
  FROM public.profiles p
  WHERE p.readable_id = clean_id
    AND p.deleted_at IS NULL
    AND p.is_discoverable = true
    AND (
      auth.uid() IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id
          AND ur.role::text IN ('provider', 'partner', 'admin')
      )
    );

  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$function$;

-- ─── F-4: provider_id IS NULL als Schreib-Schlupfloch ───────────────────────
-- services/offers/feedbacks: der Zweig "OR provider_id IS NULL" macht jede
-- herrenlose Zeile für JEDEN eingeloggten Nutzer änder- und löschbar.
-- "auth.uid() IS NOT NULL" ist keine Mandantentrennung.
-- Das Frontend setzt provider_id in allen vier Insert-Pfaden bereits korrekt
-- (Services.tsx, Angebote.tsx, Auffassen.tsx, LandingServicesEditor.tsx) —
-- der NULL-Zweig wird von keinem legitimen Pfad gebraucht.

-- Die 3 herrenlosen feedbacks-Zeilen (provider_id IS NULL) werden gelöscht.
-- Entscheidung Pascal, 27.07.2026: löschen, nicht zuordnen.
-- Muss VOR der Policy-Änderung laufen: danach wären sie für niemanden mehr
-- löschbar. Läuft in derselben Transaktion wie die Policies — schlägt etwas
-- fehl, wird auch die Löschung zurückgerollt.
DELETE FROM public.feedbacks WHERE provider_id IS NULL;

DROP POLICY IF EXISTS "Providers can insert services" ON public.services;
CREATE POLICY "Providers can insert services" ON public.services
FOR INSERT WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update own services" ON public.services;
CREATE POLICY "Providers can update own services" ON public.services
FOR UPDATE USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can delete own services" ON public.services;
CREATE POLICY "Providers can delete own services" ON public.services
FOR DELETE USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can insert offers" ON public.offers;
CREATE POLICY "Providers can insert offers" ON public.offers
FOR INSERT WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update own offers" ON public.offers;
CREATE POLICY "Providers can update own offers" ON public.offers
FOR UPDATE USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can delete own offers" ON public.offers;
CREATE POLICY "Providers can delete own offers" ON public.offers
FOR DELETE USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can insert feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can insert feedbacks" ON public.feedbacks
FOR INSERT WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can update own feedbacks" ON public.feedbacks
FOR UPDATE USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers can delete own feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can delete own feedbacks" ON public.feedbacks
FOR DELETE USING (provider_id = auth.uid());

-- ─── F-10: Voice-Guthaben wird bei Webhook-Wiederholung doppelt gutgeschrieben
-- CopeCart wiederholt IPN-Zustellungen, bis 200 zurückkommt. Schlägt die
-- Antwort einmal fehl (Timeout, Deploy), lief add_purchased_voice_credits
-- bisher ein zweites Mal und schrieb den Betrag erneut gut.
-- Zwei Ebenen: der EXISTS-Check fängt den Normalfall ab, der Unique-Index
-- fängt die Race Condition bei zwei gleichzeitigen Zustellungen.
CREATE UNIQUE INDEX IF NOT EXISTS hufi_voice_credit_tx_order_uniq
  ON public.hufi_voice_credit_transactions (copecart_order_id)
  WHERE copecart_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.add_purchased_voice_credits(
  p_user_id uuid,
  p_amount_cents integer,
  p_copecart_order_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS public.hufi_voice_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hufi_voice_credits;
  v_new_expiry timestamptz := now() + interval '12 months';
BEGIN
  v_row := public.ensure_hufi_voice_credits_current(p_user_id);

  -- Bereits verbuchte CopeCart-Bestellung: unverändert zurückgeben.
  IF p_copecart_order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.hufi_voice_credit_transactions
    WHERE copecart_order_id = p_copecart_order_id
  ) THEN
    RETURN v_row;
  END IF;

  UPDATE public.hufi_voice_credits
    SET purchased_balance_cents = purchased_balance_cents + p_amount_cents,
        purchased_expires_at    = GREATEST(COALESCE(purchased_expires_at, v_new_expiry), v_new_expiry),
        updated_at              = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

  INSERT INTO public.hufi_voice_credit_transactions
      (user_id, amount_cents, source, type, description, copecart_order_id)
    VALUES (p_user_id, p_amount_cents, 'purchased', 'purchase', p_description, p_copecart_order_id);

  RETURN v_row;
END;
$$;
