-- ROLLBACK / PRE-STATE Migration #9
-- 20260920190000_fix_cross_provider_ghost_takeover_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Herkunft der Funktionsdefinition ──────────────────────────────────────
-- Nicht rekonstruiert: das woertliche CREATE-Statement aus
-- 20260920120000 (#8). Vor dem Einbetten geprueft — der prosrc-md5 dieses
-- Statements ist identisch mit dem in Production laufenden Stand:
--   prosrc md5 = fabfebb739ca83ad11c8fcae60fac2a6 (8783 Bytes)
--
-- ── Warum der Rueckweg trivial ist ────────────────────────────────────────
-- #9 besteht aus 3 Statements, 0 DML: ein CREATE OR REPLACE FUNCTION auf
-- public.create_invited_customer_with_contact plus REVOKE und GRANT auf eben
-- dieser Funktion. Der Rueckweg ist: die #8-Fassung zurueckschreiben und die
-- Ledger-Zeile entfernen. MIG9_DATA_ROLLBACK_LOSSLESS=YES.
--
-- CREATE OR REPLACE aendert ACLs nicht, und die REVOKE/GRANT-Paare in #9 sind
-- wortgleich mit denen aus #8. Es gibt nichts zurueckzunehmen; der Postcheck
-- prueft die ACL trotzdem.
--
-- ── ACHTUNG: was dieser Rollback wieder oeffnet ──────────────────────────
-- #9 fuegt genau einen Guard hinzu: profiles.created_by_provider_id als
-- Ghost-Besitzmarker. Ohne ihn stuetzt sich die CASE-B-Erkennung nur auf
-- access_grants (an einem per UI angelegten Ghost NIE vorhanden, weil der
-- Grant erst beim Invite entsteht) und contacts (kann fehlen). Genau dieses
-- Loch hat im Browser-E2E vom 2026-09-20 dazu gefuehrt, dass Provider A
-- Kunde und Pferd an Provider B verlor. Ein Rollback von #9 oeffnet es wieder.
--
-- ── Was diese Datei bewusst NICHT anfasst ────────────────────────────────
--   * handle_new_user (#8-Stand 5cb9eee610c378ead795a285475ccd08)
--   * auto_assign_client_to_provider (#6-Stand b6f62858b4de1b61a9a7503e1668e209)
--   * create_pending_client_invite_v1, den #5-Vertrag, RLS, Policies
--   * #1-#8
--   * Kundendaten, die 39 Ghost-Profile, die 4 Duplikat-Gruppen
--   * auth.users, Pferde, Termine, Rechnungen, Vault, Edge Functions
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ───────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig9_20260920190000_prestate_rollback_2026-09-21.sql

begin;

do $guard_state$
declare v_md5 text;
begin
  select md5(prosrc) into v_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';
  if v_md5 is null then
    raise exception 'ABORT: create_invited_customer_with_contact existiert nicht.';
  end if;
  if v_md5 = 'fabfebb739ca83ad11c8fcae60fac2a6' then
    raise notice 'HINWEIS: Funktion ist bereits auf dem #8-Stand — #9 war nicht aktiv.';
  elsif v_md5 <> 'dbbfc981c9ef9e8f1aaa8ccb4adb849a' then
    raise exception 'ABORT: prosrc-md5 % ist weder #9 noch #8. Erst analysieren.', v_md5;
  end if;
end
$guard_state$;

do $guard_used$
declare v_used bigint;
begin
  select count(*) into v_used from public.hm_pending_client_invites;
  if v_used > 0 then
    raise exception 'ABORT: hm_pending_client_invites enthaelt % Zeile(n) — Invite-Flow lief bereits.', v_used;
  end if;
end
$guard_used$;

-- ── 1. #8-Fassung woertlich zurueckschreiben ─────────────────────────────
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
    SELECT p.id
    FROM public.profiles p
    WHERE public._hm_normalize_email(p.email) = v_user_email
      AND p.id <> p_user_id
      AND p.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
    ORDER BY p.created_at ASC NULLS LAST, p.id ASC
  LOOP
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

-- ── 2. Genau die eine Ledger-Zeile ───────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260920190000';

-- ── 3. Postcheck im selben Transaktionsblock ─────────────────────────────
do $verify$
declare v_md5 text; v_acl text; v_owner text; v_secdef boolean; v_cfg text;
        v_hnu text; v_aacp text; v_ledger int; v_prev int;
begin
  select md5(prosrc), coalesce(array_to_string(proacl,' | '),'NULL'),
         pg_get_userbyid(proowner), prosecdef, coalesce(array_to_string(proconfig,','),'NULL')
    into v_md5, v_acl, v_owner, v_secdef, v_cfg
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';
  select md5(prosrc) into v_hnu  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc) into v_aacp from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';
  select count(*) into v_ledger from supabase_migrations.schema_migrations where version='20260920190000';
  select count(*) into v_prev   from supabase_migrations.schema_migrations
   where version in ('20260917150000','20260917152500','20260917155000','20260917160000','20260920120000');

  if v_md5 <> 'fabfebb739ca83ad11c8fcae60fac2a6' then raise exception 'ABORT: nicht auf #8-Stand (%)', v_md5; end if;
  if v_acl <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL veraendert ("%")', v_acl; end if;
  if v_owner <> 'postgres' or not v_secdef or v_cfg <> 'search_path=public' then
    raise exception 'ABORT: Attribute veraendert (owner=%, secdef=%, cfg=%)', v_owner, v_secdef, v_cfg;
  end if;
  if v_hnu <> '5cb9eee610c378ead795a285475ccd08' then raise exception 'ABORT: handle_new_user veraendert (%)', v_hnu; end if;
  if v_aacp <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: auto_assign_client_to_provider veraendert (%)', v_aacp; end if;
  if v_ledger <> 0 then raise exception 'ABORT: Ledger-Zeile 20260920190000 noch vorhanden (%)', v_ledger; end if;
  if v_prev <> 5 then raise exception 'ABORT: #5-#8 nicht mehr intakt (erwartet 5, gefunden %)', v_prev; end if;

  raise notice 'ROLLBACK #9 OK: Funktion auf #8-Stand, ACL/Attribute unveraendert, #5-#8 intakt.';
end
$verify$;

commit;
