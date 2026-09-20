-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Cross-Provider-Ghost-Übernahme beim Invite (Release-Blocker 1)
--
-- Browser-E2E vom 2026-09-20, beide Provider-Sichten reproduziert:
-- Provider A besitzt Ghost-Kunde + Pferd. Provider B lädt dieselbe E-Mail ein.
-- Ergebnis war: Ghost von A soft-deleted, Pferd auf den Kunden von B
-- umgehängt, A verliert Kunde und Pferd.
--
-- Ursache: Die CASE-B-Erkennung in create_invited_customer_with_contact()
-- stützte sich ausschliesslich auf
--   a) access_grants mit fremdem provider_id  -> an einem Ghost NIE vorhanden,
--      weil der Grant erst beim Invite entsteht, und
--   b) contacts mit fremdem provider_id       -> kann fehlen (der contacts-
--      Write der Kundenanlage lief im Test in RLS 403).
-- Damit war für einen per UI angelegten Ghost kein einziger Besitzmarker
-- sichtbar und die Schleife fiel in CASE A.
--
-- Fix: zusätzlich profiles.created_by_provider_id prüfen. Dieser Marker wird
-- bei jeder Ghost-Anlage gesetzt und ist damit der verlässliche Anker.
--
-- Same-Provider (CASE A) bleibt unverändert: dort ist
-- created_by_provider_id = p_provider_id.
-- Ghosts ohne Marker (created_by_provider_id IS NULL, z. B. Altbestand)
-- verhalten sich wie bisher und laufen weiter durch die beiden Folge-Guards.
-- ════════════════════════════════════════════════════════════════════════════

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
  v_profile_email text;
  v_owner_id uuid;
  v_user_email text;
  v_invite public.hm_pending_client_invites;
  v_already_completed boolean := false;
  v_ghost RECORD;
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

  -- ── Tenant-Bindung: gültiger, gebundener Invite dieses Providers ─────────
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

  -- ── E-Mail-Dreiecksvergleich (P1) ────────────────────────────────────────
  -- Invite == Auth == p_profile, alle drei normalisiert. p_profile stammt aus
  -- dem Request und wird deshalb nie als Wahrheit übernommen, sondern geprüft.
  IF v_invite.normalized_email <> v_user_email THEN
    RAISE EXCEPTION 'Invited user does not match the pending invite';
  END IF;

  v_profile_email := public._hm_normalize_email(p_profile->>'email');
  IF v_profile_email IS NULL THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  IF v_profile_email <> v_user_email THEN
    RAISE EXCEPTION 'Customer email does not match the invited user';
  END IF;

  v_full_name := nullif(btrim(coalesce(p_profile->>'full_name', '')), '');
  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Customer full_name is required';
  END IF;

  v_email := p_profile->>'email';

  -- ── Ghost-Finalisierung (P0) ─────────────────────────────────────────────
  -- handle_new_user() hat die Ghost-Schleife im Invite-Pfad bewusst
  -- ausgelassen. Hier ist der einladende Provider bekannt und validiert, also
  -- lässt sich CASE A sicher von CASE B unterscheiden.
  FOR v_ghost IN
    SELECT p.id, p.created_by_provider_id
    FROM public.profiles p
    WHERE public._hm_normalize_email(p.email) = v_user_email
      AND p.id <> p_user_id
      AND p.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
    ORDER BY p.created_at ASC NULLS LAST, p.id ASC
  LOOP
    -- CASE B (Browser-E2E 2026-09-20): der Ghost trägt den einladenden
    -- Provider NICHT als Ersteller. Dieser Marker ist der einzige, der an
    -- einem Ghost immer gesetzt ist: access_grants entstehen erst beim
    -- Invite (ein Ghost hat nie einen), und der contacts-Write kann fehlen.
    -- Ohne diese Prüfung liefen beide folgenden Guards leer und ein fremder
    -- Ghost samt Pferden wurde übernommen. Fail closed.
    IF v_ghost.created_by_provider_id IS NOT NULL
       AND v_ghost.created_by_provider_id <> p_provider_id THEN
      RAISE EXCEPTION 'An existing customer record for this email belongs to another provider';
    END IF;

    -- CASE B: irgendein aktiver Grant eines ANDEREN Providers am Ghost.
    -- Fail closed — Exception, komplettes Rollback, Ghost bleibt unverändert.
    -- Multi-Provider-Ghost-Merging wird hier nicht entworfen.
    IF EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = v_ghost.id
        AND ag.is_active = true
        AND ag.provider_id <> p_provider_id
    ) THEN
      RAISE EXCEPTION 'An existing customer record for this email belongs to another provider';
    END IF;

    -- Gleiches Prinzip für Kontakte: ein fremder Kontakt am Ghost würde durch
    -- das Umhängen auf den echten Nutzer zeigen.
    IF EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.profile_id = v_ghost.id
        AND c.deleted_at IS NULL
        AND c.provider_id <> p_provider_id
    ) THEN
      RAISE EXCEPTION 'An existing customer record for this email belongs to another provider';
    END IF;

    -- CASE A: der Ghost gehört ausschliesslich dem einladenden Provider.
    UPDATE public.horses SET owner_id = p_user_id WHERE owner_id = v_ghost.id;
    UPDATE public.appointments SET client_id = p_user_id WHERE client_id = v_ghost.id;
    UPDATE public.contacts AS c1 SET profile_id = p_user_id
      WHERE c1.profile_id = v_ghost.id
        AND NOT EXISTS (
          SELECT 1 FROM public.contacts c2
          WHERE c2.provider_id = c1.provider_id
            AND c2.profile_id = p_user_id
            AND c2.deleted_at IS NULL
        );
    UPDATE public.access_grants ag SET client_id = p_user_id
      WHERE ag.client_id = v_ghost.id
        AND ag.provider_id = p_provider_id
        AND NOT EXISTS (
          SELECT 1 FROM public.access_grants existing
          WHERE existing.client_id = p_user_id
            AND existing.provider_id = ag.provider_id
        );
    UPDATE public.profiles SET deleted_at = now() WHERE id = v_ghost.id;
  END LOOP;

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

  -- Der vorgesehene Zugriff — genau einer, genau für diesen Provider.
  INSERT INTO public.access_grants (
    provider_id, client_id, is_active,
    can_view_basic, can_view_medical, can_create_appointments
  )
  VALUES (p_provider_id, p_user_id, true, true, true, true)
  ON CONFLICT (client_id, provider_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.provider_id = p_provider_id
      AND ag.client_id = p_user_id
      AND ag.is_active = true
      AND coalesce(ag.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Access for the inviting provider could not be established (existing revoked grant?)';
  END IF;

  -- Letzte Verteidigungslinie: kein Fremd-Grant darf diesen Durchlauf
  -- überleben. Greift auch, wenn ein Grant auf anderem Weg entstanden ist.
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

  -- Invite in derselben Transaktion verbrauchen.
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
