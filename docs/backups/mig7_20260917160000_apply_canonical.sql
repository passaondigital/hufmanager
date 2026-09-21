-- APPLY Migration #7 mit KANONISCHER Ledger-Version
-- 20260917160000_add_create_invited_customer_with_contact_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, lokal aus den echten Repo-Bytes (keine Abschrift).
--
-- Eigenschaften:
--   * eine einzige explizite Transaktion: DDL + Ledger-Eintrag gemeinsam atomar
--   * Migrationstext steht genau EINMAL drin: er wird von dort ausgefuehrt
--     UND von dort in statements geschrieben
--   * md5-Guard auf den Migrationstext, erwartet: 78906327a982fbb643760065f633bfed
--   * Ledger-Guard: #5, Hardening und #6 muessen exakt einmal stehen, #7 noch
--     gar nicht, #8/#9 ebenfalls nicht
--   * Dependency-Guard: der #5-Vertrag muss vollstaendig stehen und die
--     #6-Funktion unveraendert sein (prosrc b6f62858b4de1b61a9a7503e1668e209)
--   * Prestate-Guard: die Zielfunktion darf noch NICHT existieren
--   * Poststate-Guard: prosrc == 0be8f9ca939c9e84d4d59352338d8c62,
--     SECURITY DEFINER, search_path=public, Owner postgres, und KEIN EXECUTE
--     fuer PUBLIC/anon/authenticated/authenticator
--   * KEIN apply_migration, kein db push, kein _prepared, kein Ledger-Repair,
--     kein Vault-Write, kein Edge-Function-Deploy
--
-- ── Was #7 inhaltlich tut ──────────────────────────────────────────────────
-- Drei Statements, 0 DML: es legt public.create_invited_customer_with_contact
-- NEU an (die Funktion existiert in Production noch nicht, es wird nichts
-- ueberschrieben) und setzt deren Rechte auf service_role-only.
--
-- Das ist die Stelle, die den vorgesehenen Zugriff TATSAECHLICH erteilt — und
-- zwar nur gegen einen gueltigen, an genau diese user_id gebundenen Invite
-- desselben Providers.
--
--   NO GRANT    ist im Fehlerfall erlaubt.
--   WRONG GRANT ist nie erlaubt.
--
-- ── WARNUNG: #7 ist inert, aber der Edge-Deploy danach ist es NICHT ────────
-- Ohne Deploy ruft niemand diese Funktion auf — #7 ist folgenlos und darf
-- beliebig lange so stehen bleiben.
--
-- Ein Edge-Deploy nach #7, aber VOR #8, waere dagegen gefaehrlich: das heute
-- laufende public.handle_new_user() enthaelt eine BEDINGUNGSLOSE
-- Ghost-Merge-Schleife, die access_grants jedes Nicht-Demo-Providers auf den
-- neuen Auth-User umhaengt. Erst #8 schaltet diese Schleife im Invite-Pfad ab.
-- #7 wuerde den dadurch entstehenden Fremd-Grant zwar erkennen und abbrechen,
-- kann ihn aber nicht rueckgaengig machen — er wurde eine Transaktion frueher
-- zusammen mit dem auth.users-INSERT committet.
-- Read-only gemessen: 25 Ghost-Profile tragen aktuell einen aktiven Grant
-- eines echten Providers und waeren exponiert.
--
-- Verbindliche Reihenfolge: #7 -> #8 -> #9 -> Ghost-Review -> Edge-Deploy.
--
-- Aufruf:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f docs/backups/mig7_20260917160000_apply_canonical.sql

begin;

-- ── Ledger-Guard ──────────────────────────────────────────────────────────
do $ledger$
declare v_m5 int; v_hard int; v_m6 int; v_m7 int; v_later text;
begin
  select count(*) into v_m5   from supabase_migrations.schema_migrations where version = '20260917150000';
  select count(*) into v_hard from supabase_migrations.schema_migrations where version = '20260917152500';
  select count(*) into v_m6   from supabase_migrations.schema_migrations where version = '20260917155000';
  select count(*) into v_m7   from supabase_migrations.schema_migrations where version = '20260917160000';
  select string_agg(version, ', ' order by version) into v_later
  from supabase_migrations.schema_migrations
  where version in ('20260920120000','20260920190000');

  if v_m5 <> 1 or v_hard <> 1 or v_m6 <> 1 then
    raise exception 'ABORT: Vorbedingungen fehlen (#5=%, Hardening=%, #6=%)', v_m5, v_hard, v_m6;
  end if;
  if v_m7 <> 0 then
    raise exception 'ABORT: #7 ist bereits im Ledger (%)', v_m7;
  end if;
  if v_later is not null then
    raise exception 'ABORT: spaetere Kettenglieder bereits angewendet (%) — Reihenfolge verletzt.', v_later;
  end if;
end
$ledger$;

-- ── Dependency-Guard: #5-Vertrag und #6-Funktion ──────────────────────────
do $deps$
declare v_tbl int; v_has int; v_norm int; v_m6md5 text;
begin
  select count(*) into v_tbl from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'hm_pending_client_invites';
  select count(*) into v_has from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = '_hm_has_active_pending_client_invite';
  select count(*) into v_norm from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = '_hm_normalize_email';
  select md5(p.prosrc) into v_m6md5 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  if v_tbl <> 1 or v_has <> 1 or v_norm <> 1 then
    raise exception 'ABORT: #5-Vertrag unvollstaendig (tbl=%, has=%, norm=%)', v_tbl, v_has, v_norm;
  end if;
  if v_m6md5 <> 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception 'ABORT: #6-Funktion weicht ab (%) — erwartet b6f62858b4de1b61a9a7503e1668e209', v_m6md5;
  end if;
end
$deps$;

-- ── Prestate-Guard: Zielfunktion darf noch nicht existieren ───────────────
do $prestate$
declare v_cnt int;
begin
  select count(*) into v_cnt from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'create_invited_customer_with_contact';
  if v_cnt <> 0 then
    raise exception 'ABORT: create_invited_customer_with_contact existiert bereits (%) — #7 wuerde ueberschreiben.', v_cnt;
  end if;
end
$prestate$;

create temp table _mig7 (t text) on commit drop;

insert into _mig7 (t) values ($MIG7TEXT$-- FINAL ACCEPTANCE P0: kanonischer Invite-Vertrag.
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
$MIG7TEXT$);

do $apply7$
declare s text; h text;
begin
  select t into s from _mig7;
  h := md5(s);
  if h <> '78906327a982fbb643760065f633bfed' then
    raise exception 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', h;
  end if;
  execute s;
end
$apply7$;

-- ── Poststate-Guard ───────────────────────────────────────────────────────
do $poststate$
declare
  v_oid oid; v_md5 text; v_owner text; v_secdef boolean; v_cfg text;
  v_acl text; v_ret text; v_args text;
begin
  select p.oid, md5(p.prosrc), pg_get_userbyid(p.proowner), p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL'),
         format_type(p.prorettype, NULL),
         pg_get_function_identity_arguments(p.oid)
    into v_oid, v_md5, v_owner, v_secdef, v_cfg, v_acl, v_ret, v_args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_invited_customer_with_contact';

  if v_oid is null then
    raise exception 'ABORT: Funktion wurde nicht angelegt.';
  end if;
  if v_md5 <> '0be8f9ca939c9e84d4d59352338d8c62' then
    raise exception 'ABORT: prosrc-md5 % entspricht nicht dem #7-Zielwert', v_md5;
  end if;
  if v_owner <> 'postgres' then
    raise exception 'ABORT: Owner ist "%" statt postgres', v_owner;
  end if;
  if not v_secdef then
    raise exception 'ABORT: Funktion ist nicht SECURITY DEFINER';
  end if;
  if v_cfg <> 'search_path=public' then
    raise exception 'ABORT: search_path ist "%" statt search_path=public', v_cfg;
  end if;
  if v_ret <> 'jsonb' or v_args <> 'p_provider_id uuid, p_user_id uuid, p_profile jsonb, p_contact jsonb' then
    raise exception 'ABORT: Signaturdrift (ret=%, args=%)', v_ret, v_args;
  end if;

  -- Tenant-kritisch: kein EXECUTE fuer untrusted Rollen, kein PUBLIC-Grant.
  if has_function_privilege('anon', v_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_oid, 'EXECUTE')
     or has_function_privilege('authenticator', v_oid, 'EXECUTE') then
    raise exception 'ABORT: untrusted Rolle hat EXECUTE (acl=%)', v_acl;
  end if;
  if not has_function_privilege('service_role', v_oid, 'EXECUTE') then
    raise exception 'ABORT: service_role fehlt EXECUTE (acl=%)', v_acl;
  end if;
  if v_acl like '=%' then
    raise exception 'ABORT: PUBLIC hat einen Grant (acl=%)', v_acl;
  end if;
end
$poststate$;

-- ── Nichts anderes darf sich bewegt haben ─────────────────────────────────
do $sideeffects$
declare v_rows bigint; v_m6md5 text;
begin
  select count(*) into v_rows from public.hm_pending_client_invites;
  select md5(p.prosrc) into v_m6md5 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  if v_rows <> 0 then
    raise exception 'ABORT: hm_pending_client_invites hat jetzt % Zeile(n) — #7 darf nichts schreiben.', v_rows;
  end if;
  if v_m6md5 <> 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception 'ABORT: #6-Funktion wurde veraendert (%)', v_m6md5;
  end if;
end
$sideeffects$;

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
select '20260917160000',
       'add_create_invited_customer_with_contact_v1',
       ARRAY[t]::text[],
       'passaondigital@gmail.com',
       NULL,
       NULL
from _mig7;

commit;
