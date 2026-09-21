-- APPLY Migration #9 mit KANONISCHER Ledger-Version
-- 20260920190000_fix_cross_provider_ghost_takeover_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, lokal aus den echten Repo-Bytes (keine Abschrift).
--
-- Eigenschaften:
--   * eine einzige explizite Transaktion, Migrationstext genau EINMAL enthalten
--   * md5-Guard erwartet: 331a090f5cf61dbbc4f52f5d11dc72dc
--   * Ledger-Guard: #5, Hardening, #6, #7, #8 je genau einmal; #9 noch nicht
--   * Dependency-Guard: handle_new_user auf dem #8-Stand, #6-Funktion und der
--     #5-Vertrag unveraendert
--   * Prestate-Guard: Zielfunktion muss exakt auf dem #8-Stand stehen
--   * Poststate-Guard: prosrc == dbbfc981c9ef9e8f1aaa8ccb4adb849a,
--     Owner/SECDEF/search_path/Signatur korrekt, ACL unveraendert, kein
--     EXECUTE fuer anon/authenticated/authenticator
--   * Side-Effect-Guard: Invite-Tabelle leer, handle_new_user und
--     auto_assign_client_to_provider unveraendert
--   * KEIN apply_migration, kein db push, kein _prepared, kein Ledger-Repair,
--     kein Vault-Write, kein Edge-Function-Deploy
--
-- ── Was #9 inhaltlich tut ────────────────────────────────────────────────
-- 3 Statements, 0 DML. Ersetzt ausschliesslich
-- public.create_invited_customer_with_contact und setzt deren Rechte neu
-- (wortgleich zu #8, also ohne ACL-Wirkung).
--
-- Der reine Code-Diff gegen #8 sind VIER Zeilen in der Ghost-Schleife:
--
--   IF v_ghost.created_by_provider_id IS NOT NULL
--      AND v_ghost.created_by_provider_id <> p_provider_id THEN
--     RAISE EXCEPTION 'An existing customer record for this email belongs to another provider';
--   END IF;
--
-- Begruendung laut Kopfkommentar der Migration: ein reproduziertes
-- Browser-E2E vom 2026-09-20, beide Providersichten. #8s CASE-B-Erkennung
-- stuetzte sich auf access_grants (an einem per UI angelegten Ghost NIE
-- vorhanden, weil der Grant erst beim Invite entsteht) und contacts (kann
-- fehlen, der Write lief im Test in RLS-403). Damit war kein einziger
-- Besitzmarker sichtbar und die Schleife fiel faelschlich in CASE A:
-- Provider A verlor Kunde und Pferd an Provider B.
-- profiles.created_by_provider_id wird bei jeder Ghost-Anlage gesetzt und ist
-- damit der verlaessliche Anker.
--
-- Bekannte Restmenge: Ghosts OHNE Marker (created_by_provider_id IS NULL,
-- Altbestand) fallen weiterhin durch die beiden schwaecheren Folge-Guards.
-- Read-only gemessen: das betrifft aktuell 2 Ghost-Profile. Sie gehoeren in
-- den Ghost-Review VOR dem Edge-Deploy.
--
-- ── Nach #9 ─────────────────────────────────────────────────────────────
-- #9 ist ohne Edge-Deploy inert: die Funktion wird nur vom Invite-Flow
-- aufgerufen, den es ohne die neue Edge Function nicht gibt.
-- Reihenfolge: #9 -> Ghost-Review -> Edge-Deploy -> E2E.
--
-- Aufruf:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f docs/backups/mig9_20260920190000_apply_canonical.sql

begin;

do $ledger$
declare v_prev int; v_m9 int;
begin
  select count(*) into v_prev from supabase_migrations.schema_migrations
   where version in ('20260917150000','20260917152500','20260917155000','20260917160000','20260920120000');
  select count(*) into v_m9 from supabase_migrations.schema_migrations where version='20260920190000';
  if v_prev <> 5 then raise exception 'ABORT: #5-#8 nicht vollstaendig (gefunden %)', v_prev; end if;
  if v_m9 <> 0 then raise exception 'ABORT: #9 ist bereits im Ledger (%)', v_m9; end if;
end
$ledger$;

do $deps$
declare v_hnu text; v_aacp text; v_tbl int;
begin
  select md5(prosrc) into v_hnu  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc) into v_aacp from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';
  select count(*) into v_tbl from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='hm_pending_client_invites';
  if v_hnu <> '5cb9eee610c378ead795a285475ccd08' then raise exception 'ABORT: handle_new_user nicht auf #8-Stand (%)', v_hnu; end if;
  if v_aacp <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: #6-Funktion weicht ab (%)', v_aacp; end if;
  if v_tbl <> 1 then raise exception 'ABORT: #5-Vertragstabelle fehlt'; end if;
end
$deps$;

do $prestate$
declare v_md5 text;
begin
  select md5(prosrc) into v_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';
  if v_md5 is distinct from 'fabfebb739ca83ad11c8fcae60fac2a6' then
    raise exception 'ABORT: Zielfunktion nicht auf dem #8-Stand (%)', v_md5;
  end if;
end
$prestate$;

create temp table _mig9 (t text) on commit drop;

insert into _mig9 (t) values ($MIG9TEXT$-- ════════════════════════════════════════════════════════════════════════════
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
$MIG9TEXT$);

do $apply9$
declare s text; h text;
begin
  select t into s from _mig9;
  h := md5(s);
  if h <> '331a090f5cf61dbbc4f52f5d11dc72dc' then
    raise exception 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', h;
  end if;
  execute s;
end
$apply9$;

do $poststate$
declare v_oid oid; v_md5 text; v_acl text; v_owner text; v_secdef boolean;
        v_cfg text; v_ret text; v_args text;
begin
  select p.oid, md5(p.prosrc), coalesce(array_to_string(p.proacl,' | '),'NULL'),
         pg_get_userbyid(p.proowner), p.prosecdef,
         coalesce(array_to_string(p.proconfig,','),'NULL'),
         format_type(p.prorettype,NULL), pg_get_function_identity_arguments(p.oid)
    into v_oid, v_md5, v_acl, v_owner, v_secdef, v_cfg, v_ret, v_args
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';

  if v_md5 <> 'dbbfc981c9ef9e8f1aaa8ccb4adb849a' then raise exception 'ABORT: prosrc-md5 % entspricht nicht dem #9-Zielwert', v_md5; end if;
  if v_owner <> 'postgres' then raise exception 'ABORT: Owner ist "%"', v_owner; end if;
  if not v_secdef then raise exception 'ABORT: SECURITY DEFINER verloren'; end if;
  if v_cfg <> 'search_path=public' then raise exception 'ABORT: search_path ist "%"', v_cfg; end if;
  if v_ret <> 'jsonb' or v_args <> 'p_provider_id uuid, p_user_id uuid, p_profile jsonb, p_contact jsonb' then
    raise exception 'ABORT: Signaturdrift (ret=%, args=%)', v_ret, v_args;
  end if;
  if v_acl <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL veraendert ("%")', v_acl; end if;
  if has_function_privilege('anon', v_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_oid, 'EXECUTE')
     or has_function_privilege('authenticator', v_oid, 'EXECUTE') then
    raise exception 'ABORT: untrusted Rolle hat EXECUTE';
  end if;
  if not has_function_privilege('service_role', v_oid, 'EXECUTE') then
    raise exception 'ABORT: service_role fehlt EXECUTE';
  end if;

  -- Der neue Guard muss tatsaechlich im Funktionstext stehen.
  if (select p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='create_invited_customer_with_contact')
      not like '%v_ghost.created_by_provider_id <> p_provider_id%' then
    raise exception 'ABORT: der #9-Besitzmarker-Guard fehlt im Funktionstext';
  end if;
end
$poststate$;

do $sideeffects$
declare v_rows bigint; v_hnu text; v_aacp text;
begin
  select count(*) into v_rows from public.hm_pending_client_invites;
  select md5(prosrc) into v_hnu  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc) into v_aacp from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';
  if v_rows <> 0 then raise exception 'ABORT: hm_pending_client_invites hat jetzt % Zeile(n)', v_rows; end if;
  if v_hnu <> '5cb9eee610c378ead795a285475ccd08' then raise exception 'ABORT: handle_new_user wurde veraendert (%)', v_hnu; end if;
  if v_aacp <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: #6-Funktion wurde veraendert (%)', v_aacp; end if;
end
$sideeffects$;

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
select '20260920190000',
       'fix_cross_provider_ghost_takeover_v1',
       ARRAY[t]::text[],
       'passaondigital@gmail.com',
       NULL,
       NULL
from _mig9;

commit;
