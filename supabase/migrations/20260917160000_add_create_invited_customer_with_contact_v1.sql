-- FINAL ACCEPTANCE P0: kanonischer Invite-Vertrag.
--
-- Gegenstück zu
--   20260917150000_add_pending_client_invite_contract_v1.sql (der Vertrag)
--   20260917155000_fix_invite_tenant_auto_assign_v1.sql      (die Unterdrückung)
--
-- Aufgeteilt ist die Verantwortung so:
--
--   · Der Pending Invite unterdrückt im Trigger nur den generischen
--     "erster Provider"-Fallback. Er erteilt NIE Zugriff.
--   · Diese Funktion ist die EINZIGE Stelle, die den vorgesehenen Grant
--     anlegt — und nur gegen einen gültigen, an genau diese user_id
--     gebundenen Invite desselben Providers.
--
--   NO GRANT    ist im Fehlerfall erlaubt.
--   WRONG GRANT ist nie erlaubt.
--
-- ── Warum der Invite an die user_id gebunden sein muss ──────────────────────
-- Der Trigger kennt beim auth.users-INSERT nur die E-Mail. Ohne Bindung
-- könnte ein Provider einen offenen Invite auf eine Adresse legen und danach
-- einen FREMDEN Selbst-Signup derselben Adresse einsammeln — das wäre ein
-- WRONG GRANT. Deshalb bindet die Edge Function den Invite direkt nach
-- createUser über bind_pending_client_invite_v1() an die erzeugte user_id,
-- und diese Funktion akzeptiert ausschliesslich gebundene Invites. Ein
-- Selbst-Signup wird nie gebunden; er bekommt in diesem Fenster lediglich
-- keinen Fallback-Provider ("kein Grant"), nie einen falschen.
--
-- ── Idempotenz ──────────────────────────────────────────────────────────────
-- Alle Schreibschritte sind Upserts, und der Verbrauch des Invites läuft in
-- derselben Transaktion. Ein Retry mit denselben Argumenten findet den bereits
-- verbrauchten Invite dieses Providers wieder, stellt denselben Endzustand
-- sicher und meldet 'already_completed' — kein zweiter Kunde, kein zweiter
-- Grant, kein zweiter Kontakt.
--
-- Provider B kann denselben Invite nicht claimen: der Provider-Vergleich
-- schlägt fehl, bevor irgendetwas geschrieben wird.

CREATE OR REPLACE FUNCTION public.create_invited_customer_with_contact(
  p_provider_id uuid,
  p_user_id uuid,
  p_profile jsonb,
  p_contact jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_full_name text;
  v_email text;
  v_owner_id uuid;
  v_user_email text;
  v_invite public.hm_pending_client_invites;
  v_already_completed boolean := false;
BEGIN
  IF p_provider_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Provider and invited user are required';
  END IF;

  IF jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'Customer profile must be a JSON object';
  END IF;

  IF NOT public.has_role(p_provider_id, 'provider'::app_role) THEN
    RAISE EXCEPTION 'Only providers may invite customers';
  END IF;

  SELECT public._hm_normalize_email(u.email) INTO v_user_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Invited user does not exist';
  END IF;

  -- ── Tenant-Bindung: gültiger, gebundener Invite dieses Providers ──────────
  -- Zuerst der offene Invite. FOR UPDATE serialisiert konkurrierende Aufrufe
  -- auf derselben Zeile, damit zwei parallele Retries nicht beide "offen"
  -- sehen.
  SELECT * INTO v_invite
  FROM public.hm_pending_client_invites
  WHERE user_id = p_user_id
    AND consumed_at IS NULL
    AND invalidated_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Retry nach erfolgreichem Durchlauf: derselbe Invite ist bereits
    -- verbraucht. Das ist kein Fehler, sondern der definierte
    -- already-completed-Zustand.
    SELECT * INTO v_invite
    FROM public.hm_pending_client_invites
    WHERE consumed_user_id = p_user_id
      AND consumed_at IS NOT NULL
    ORDER BY consumed_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No valid pending invite for this user';
    END IF;

    v_already_completed := true;
  END IF;

  IF v_invite.provider_id <> p_provider_id THEN
    RAISE EXCEPTION 'Invited user is not marked for this provider';
  END IF;

  IF v_invite.normalized_email <> v_user_email THEN
    RAISE EXCEPTION 'Invited user does not match the pending invite';
  END IF;

  v_full_name := nullif(btrim(coalesce(p_profile->>'full_name', '')), '');
  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Customer full_name is required';
  END IF;

  v_email := nullif(btrim(coalesce(p_profile->>'email', '')), '');

  -- Kein Blind-INSERT: handle_new_user() hat die Zeile in aller Regel schon
  -- angelegt. ON CONFLICT DO UPDATE ergänzt genau die Einladungsfelder und
  -- lässt alles andere unangetastet.
  INSERT INTO public.profiles AS p (
    id, full_name, email, created_by_provider_id,
    force_password_reset, onboarding_completed, has_logged_in, invited_at
  )
  VALUES (
    p_user_id, v_full_name, v_email, p_provider_id,
    true, false, false, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(nullif(btrim(EXCLUDED.full_name), ''), p.full_name),
    email = coalesce(EXCLUDED.email, p.email),
    -- Niemals einen fremden Provider überschreiben.
    created_by_provider_id = coalesce(p.created_by_provider_id, EXCLUDED.created_by_provider_id),
    force_password_reset = true,
    onboarding_completed = coalesce(p.onboarding_completed, false),
    has_logged_in = coalesce(p.has_logged_in, false),
    invited_at = coalesce(p.invited_at, EXCLUDED.invited_at)
  RETURNING p.created_by_provider_id INTO v_owner_id;

  IF v_owner_id IS DISTINCT FROM p_provider_id THEN
    RAISE EXCEPTION 'Customer profile already belongs to another provider';
  END IF;

  -- handle_new_user() setzt die Rolle bereits anhand der User-Metadaten;
  -- das hier ist die Absicherung für den Fall, dass die Metadaten fehlen.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'client'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Der vorgesehene Zugriff — genau einer, genau für diesen Provider. Gleiche
  -- Flags wie auto_create_access_grant_for_client sie fuer einen
  -- provider-erstellten Kunden setzt; der Trigger selbst greift hier nicht
  -- (siehe Kopfkommentar von 20260917155000).
  INSERT INTO public.access_grants (
    provider_id, client_id, is_active,
    can_view_basic, can_view_medical, can_create_appointments
  )
  VALUES (p_provider_id, p_user_id, true, true, true, true)
  ON CONFLICT (client_id, provider_id) DO NOTHING;

  -- Kein stiller Teilzustand: wenn nach dem Upsert kein AKTIVER Grant fuer
  -- den vorgesehenen Provider steht (z.B. weil ein frueher bewusst
  -- widerrufener Grant desselben Providers existiert), wird hier abgebrochen
  -- statt dieser Widerruf still ueberschrieben oder der Kunde ohne Zugriff
  -- angelegt.
  IF NOT EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.provider_id = p_provider_id
      AND ag.client_id = p_user_id
      AND ag.is_active = true
      AND coalesce(ag.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Access for the inviting provider could not be established (existing revoked grant?)';
  END IF;

  -- Kein Fremd-Grant darf diesen Durchlauf überleben. Das ist die letzte
  -- Verteidigungslinie: sollte trotz Unterdrückung irgendein anderer Provider
  -- einen Grant auf diesen frisch eingeladenen Kunden haben, bricht der Invite
  -- ab (Rollback) statt ihn stillschweigend zu akzeptieren.
  IF EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.client_id = p_user_id
      AND ag.provider_id <> p_provider_id
      AND ag.is_active = true
  ) THEN
    RAISE EXCEPTION 'Invited customer already has access granted to another provider';
  END IF;

  -- Kontakt nur einmal pro Provider/Profil.
  SELECT c.id INTO v_contact_id
  FROM public.contacts c
  WHERE c.provider_id = p_provider_id
    AND c.profile_id = p_user_id
    AND c.deleted_at IS NULL
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (
      provider_id, profile_id, full_name, email, category
    )
    VALUES (
      p_provider_id, p_user_id, v_full_name, v_email,
      coalesce(nullif(p_contact->>'category', ''), 'client')::contact_category
    )
    RETURNING id INTO v_contact_id;
  END IF;

  -- Invite in derselben Transaktion verbrauchen. Schlägt irgendein Schritt
  -- oben fehl, rollt auch das hier zurück und der Invite bleibt offen — der
  -- Retry findet denselben Vertrag wieder vor.
  IF NOT v_already_completed THEN
    UPDATE public.hm_pending_client_invites
    SET consumed_at = now(),
        consumed_user_id = p_user_id
    WHERE id = v_invite.id
      AND consumed_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile_id', p_user_id,
    'contact_id', v_contact_id,
    'full_name', v_full_name,
    'invite_id', v_invite.id,
    'status', CASE WHEN v_already_completed THEN 'already_completed' ELSE 'completed' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb) TO service_role;
