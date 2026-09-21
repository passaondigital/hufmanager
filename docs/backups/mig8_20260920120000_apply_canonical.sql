-- APPLY Migration #8 mit KANONISCHER Ledger-Version
-- 20260920120000_fix_pending_invite_ghost_merge_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, lokal aus den echten Repo-Bytes (keine Abschrift).
--
-- Eigenschaften:
--   * eine einzige explizite Transaktion: DDL + Ledger-Eintrag gemeinsam atomar
--   * Migrationstext genau EINMAL enthalten; md5-Guard erwartet: 5d426ae10ca2831cb4c0cd016d93d348
--   * Ledger-Guard: #5, Hardening, #6, #7 je genau einmal; #8 noch gar nicht;
--     #9 ebenfalls nicht
--   * Dependency-Guard: #5-Vertrag vollstaendig, #6-Funktion auf b6f62858b4de1b61a9a7503e1668e209
--   * Prestate-Guard: die drei Zielfunktionen muessen exakt auf ihrem
--     Vor-#8-Stand stehen
--   * Poststate-Guard: alle drei auf dem #8-Zielstand, Owner/SECDEF/
--     search_path korrekt, ACLs unveraendert
--   * Side-Effect-Guard: Invite-Tabelle bleibt leer, #6 unveraendert,
--     Triggerzahl unveraendert
--   * KEIN apply_migration, kein db push, kein _prepared, kein Ledger-Repair,
--     kein Vault-Write, kein Edge-Function-Deploy
--
-- ── Was #8 inhaltlich tut ─────────────────────────────────────────────────
-- 7 Statements, 0 DML. Drei Funktionen werden ersetzt:
--
--   1. public.handle_new_user()
--      a) Ghost-Merge-Schleife wird im Invite-Pfad ausgesetzt
--         (IF NOT invite_pending). Das ist der eigentliche Schutz gegen die
--         Cross-Provider-Uebernahme: die heutige Fassung haengt access_grants
--         JEDES Nicht-Demo-Providers auf den neuen Auth-User um.
--         Read-only gemessen: 25 Ghost-Profile tragen einen aktiven Grant
--         eines echten Providers und sind ohne diesen Fix exponiert.
--      b) Rollenvergabe: privilegierte Rollen kommen nur noch aus
--         raw_app_meta_data (serverseitig). Die heutige Fassung liest
--         raw_user_meta_data->>'role', das bei /signup vom Client frei
--         gesetzt werden kann — 'admin' und 'partner' sind damit heute
--         selbst vergebbar. Kein Trigger auf user_roles validiert das.
--
--   2. public.create_pending_client_invite_v1() — TTL ist nicht mehr
--      aufruferkontrolliert (vorher bis 60 Minuten waehlbar), sondern fest
--      15 Minuten. Der Parameter p_ttl_minutes bleibt in der Signatur,
--      wirkt aber nicht mehr.
--
--   3. public.create_invited_customer_with_contact() — E-Mail-Dreiecksprueung
--      (Profil-E-Mail muss zur Auth-E-Mail passen) und gefuehrte
--      Ghost-Finalisierung mit Cross-Provider-Guards.
--
-- ── Bestandsdaten ────────────────────────────────────────────────────────
-- 0 DML. Die 39 Ghost-Profile und 4 Duplikat-Gruppen werden NICHT angefasst.
-- Die UPDATEs stehen in Funktionskoerpern und laufen erst zur Laufzeit —
-- ausgeloest nur vom Invite-Flow, den es ohne Edge-Deploy nicht gibt.
--
-- ── Nach #8 ──────────────────────────────────────────────────────────────
-- #8 ist ohne Edge-Deploy inert, was den Invite-Pfad angeht. Die
-- Rollenvergabe-Korrektur wirkt dagegen SOFORT fuer jede neue Registrierung —
-- das ist beabsichtigt und der Grund, #8 nicht liegenzulassen.
-- Reihenfolge bleibt: #8 -> #9 -> Ghost-Review -> Edge-Deploy.
--
-- Aufruf:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f docs/backups/mig8_20260920120000_apply_canonical.sql

begin;

do $ledger$
declare v_prev int; v_m8 int; v_m9 int;
begin
  select count(*) into v_prev from supabase_migrations.schema_migrations
   where version in ('20260917150000','20260917152500','20260917155000','20260917160000');
  select count(*) into v_m8 from supabase_migrations.schema_migrations where version='20260920120000';
  select count(*) into v_m9 from supabase_migrations.schema_migrations where version='20260920190000';
  if v_prev <> 4 then raise exception 'ABORT: #5/Hardening/#6/#7 nicht vollstaendig (gefunden %)', v_prev; end if;
  if v_m8 <> 0 then raise exception 'ABORT: #8 ist bereits im Ledger (%)', v_m8; end if;
  if v_m9 <> 0 then raise exception 'ABORT: #9 ist bereits angewendet — Reihenfolge verletzt'; end if;
end
$ledger$;

do $deps$
declare v_tbl int; v_has int; v_norm int; v_m6 text;
begin
  select count(*) into v_tbl from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='hm_pending_client_invites';
  select count(*) into v_has from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='_hm_has_active_pending_client_invite';
  select count(*) into v_norm from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='_hm_normalize_email';
  select md5(prosrc) into v_m6 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';
  if v_tbl<>1 or v_has<>1 or v_norm<>1 then
    raise exception 'ABORT: #5-Vertrag unvollstaendig (tbl=%, has=%, norm=%)', v_tbl, v_has, v_norm;
  end if;
  if v_m6 <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: #6-Funktion weicht ab (%)', v_m6; end if;
end
$deps$;

do $prestate$
declare v_hnu text; v_cpci text; v_civc text;
begin
  select md5(prosrc) into v_hnu  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc) into v_cpci from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_pending_client_invite_v1';
  select md5(prosrc) into v_civc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';
  if v_hnu is distinct from 'dc89cc94bbaf69e6a41f55b60b594723' then raise exception 'ABORT: handle_new_user nicht im erwarteten Pre-State (%)', v_hnu; end if;
  if v_cpci is distinct from '098ba120e40e3e51019e74c827959d84' then raise exception 'ABORT: create_pending_client_invite_v1 nicht im erwarteten Pre-State (%)', v_cpci; end if;
  if v_civc is distinct from '0be8f9ca939c9e84d4d59352338d8c62' then raise exception 'ABORT: create_invited_customer_with_contact nicht im erwarteten Pre-State (%)', v_civc; end if;
end
$prestate$;

create temp table _mig8 (t text) on commit drop;

insert into _mig8 (t) values ($MIG8TEXT$-- FINAL ACCEPTANCE P0 (Codex narrow review of the pending-invite contract):
-- Ghost-Merge umgeht die Invite-Unterdrückung.
--
-- ── Befund ──────────────────────────────────────────────────────────────────
-- public.handle_new_user() macht dreierlei, in dieser Reihenfolge, alles in
-- der Transaktion des auth.users-INSERT:
--
--   1. INSERT public.profiles
--   2. INSERT public.user_roles
--        -> AFTER INSERT public.auto_assign_client_to_provider()
--           Hier greift die Pending-Invite-Unterdrückung aus
--           20260917155000 korrekt: kein "erster Provider"-Fallback.
--   3. Ghost-Merge-Schleife über alle Profile mit derselben E-Mail ohne
--      Auth-User:
--        UPDATE public.access_grants SET client_id = NEW.id
--        WHERE ag.client_id = ghost_profile.id AND <kein Demo-Provider>
--
-- Schritt 3 kennt den Invite-Vertrag nicht. Er überträgt JEDEN aktiven Grant
-- des Ghost-Profils auf den neuen Auth-User — unabhängig davon, welchem
-- Provider dieser Grant gehört.
--
--   Provider A besitzt Ghost X mit aktivem Grant
--   Provider B lädt dieselbe E-Mail ein
--   => während auth.users INSERT wandert A's Grant auf den neuen Auth-User
--   => ein FREMDER Grant existiert, bevor
--      create_invited_customer_with_contact() überhaupt läuft
--
-- Die Unterdrückung in Schritt 2 hilft dagegen nicht: sie verhindert nur, dass
-- ein NEUER Fallback-Grant entsteht, nicht dass ein BESTEHENDER umgehängt
-- wird.
--
--   NO GRANT    ist bis zur kanonischen Finalisierung erlaubt.
--   WRONG GRANT ist nie erlaubt.
--
-- ── Gewählte Lösung ─────────────────────────────────────────────────────────
-- 1. handle_new_user(): liegt für NEW.email ein gültiger, offener Pending
--    Invite vor, wird die Ghost-Merge-Schleife KOMPLETT übersprungen. Nicht
--    nur der Grant-Transfer — auch Pferde, Termine, Kontakte und das
--    Soft-Delete des Ghosts bleiben unangetastet.
--
--    Warum komplett und nicht nur der Grant-Transfer: würden die Daten
--    umgehängt, der Grant aber nicht, verlöre der rechtmässige Ghost-Besitzer
--    die Sicht auf genau diese Daten. Das wäre Datenschaden statt Schutz.
--
--    Nichts wird nachträglich gelöscht — der Grant wird gar nicht erst
--    übertragen.
--
-- 2. Die Ghost-Finalisierung wandert dorthin, wo der einladende Provider
--    bekannt und validiert ist: create_invited_customer_with_contact().
--    Erst dort lässt sich CASE A von CASE B unterscheiden.
--
--      CASE A — Provider A besitzt Ghost X, Provider A lädt X selbst ein:
--        sichere Übernahme. Pferde/Termine/Kontakte wandern auf den neuen
--        Auth-User, A's Grant wird mit übertragen, der Ghost wird
--        soft-deleted. Genau der vorgesehene A-Zugriff, nichts sonst.
--
--      CASE B — Provider A besitzt Ghost X, Provider B lädt dieselbe
--        E-Mail ein: FAIL CLOSED. Exception, komplettes Rollback. Kein
--        Grant, kein Merge, Ghost A bleibt Zeichen für Zeichen unverändert.
--        Multi-Provider-Ghost-Merging wird hier bewusst NICHT neu entworfen.
--
-- ── Zusätzlich geschlossen (P1 aus demselben Review) ────────────────────────
-- 3. E-Mail-Vertrag: create_invited_customer_with_contact vergleicht jetzt
--    normalisiert pending_invite.normalized_email == auth.users.email ==
--    p_profile->>'email'. p_profile kommt aus dem Request und war bisher
--    ungeprüft.
-- 4. TTL: create_pending_client_invite_v1 setzt expires_at serverseitig hart
--    auf now() + 15 Minuten. Der Parameter p_ttl_minutes bleibt für die
--    Signaturkompatibilität erhalten, ist aber keine Sicherheitseingabe mehr.
--
-- ── Anwendbarkeit ───────────────────────────────────────────────────────────
-- Follow-up nach 20260917160000. Nur CREATE OR REPLACE auf drei bestehende
-- Funktionen — keine Tabelle, kein Index, keine Policy, kein Grant-Wechsel.
-- Auf einem bereits migrierten Staging sauber anwendbar.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. handle_new_user: Ghost-Merge im Invite-Fall aussetzen
-- ════════════════════════════════════════════════════════════════════════════
-- Identisch zur Live-Fassung (gegen pg_proc.prosrc abgeglichen) bis auf den
-- einen zusätzlichen Guard vor der Schleife.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  requested_app_role text;
  assigned_role app_role;
  ghost_profile RECORD;
  invite_pending boolean;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';
  requested_app_role := NEW.raw_app_meta_data->>'role';

  -- Only app_metadata is trusted for privileged roles. raw_user_meta_data is
  -- retained for the public provider/client signup compatibility path, but can
  -- never create admin or partner authority.
  IF requested_app_role IN ('admin', 'employee', 'partner', 'provider', 'client') THEN
    assigned_role := requested_app_role::app_role;
  ELSIF requested_role = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSE
    assigned_role := 'provider'::app_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name,
    signup_app, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, signup_referrer, landing_path
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Neuer Nutzer'),
    NEW.raw_user_meta_data->>'signup_app',
    NEW.raw_user_meta_data->>'utm_source',
    NEW.raw_user_meta_data->>'utm_medium',
    NEW.raw_user_meta_data->>'utm_campaign',
    NEW.raw_user_meta_data->>'utm_content',
    NEW.raw_user_meta_data->>'utm_term',
    NEW.raw_user_meta_data->>'signup_referrer',
    NEW.raw_user_meta_data->>'landing_path'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    signup_app = COALESCE(public.profiles.signup_app, EXCLUDED.signup_app),
    utm_source = COALESCE(public.profiles.utm_source, EXCLUDED.utm_source),
    utm_medium = COALESCE(public.profiles.utm_medium, EXCLUDED.utm_medium),
    utm_campaign = COALESCE(public.profiles.utm_campaign, EXCLUDED.utm_campaign),
    utm_content = COALESCE(public.profiles.utm_content, EXCLUDED.utm_content),
    utm_term = COALESCE(public.profiles.utm_term, EXCLUDED.utm_term),
    signup_referrer = COALESCE(public.profiles.signup_referrer, EXCLUDED.signup_referrer),
    landing_path = COALESCE(public.profiles.landing_path, EXCLUDED.landing_path);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- NEU (P0 Ghost-Merge): Im Invite-Pfad darf hier NICHTS umgehängt werden.
  -- Diese Schleife kennt den einladenden Provider nicht und würde einen
  -- fremden Ghost-Grant auf den neuen Auth-User übertragen, bevor der
  -- kanonische Vertrag überhaupt läuft. Die Übernahme des EIGENEN Ghosts
  -- erledigt create_invited_customer_with_contact(), das den Provider kennt
  -- und CASE A von CASE B unterscheiden kann.
  invite_pending := public._hm_has_active_pending_client_invite(NEW.email);

  IF NOT invite_pending THEN
    -- Preserve the existing ghost-profile merge behavior. This remains inside
    -- the same auth trigger transaction and does not expand the role boundary.
    FOR ghost_profile IN
      SELECT p.id, p.created_by_provider_id
      FROM public.profiles p
      WHERE p.email = NEW.email
        AND p.id <> NEW.id
        AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
      ORDER BY (p.created_by_provider_id IS NOT NULL) DESC, p.created_at ASC NULLS LAST, p.id ASC
    LOOP
      UPDATE public.horses SET owner_id = NEW.id WHERE owner_id = ghost_profile.id;
      UPDATE public.appointments SET client_id = NEW.id WHERE client_id = ghost_profile.id;
      UPDATE public.contacts SET profile_id = NEW.id WHERE profile_id = ghost_profile.id;

      UPDATE public.access_grants ag
      SET client_id = NEW.id
      WHERE ag.client_id = ghost_profile.id
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles provider_profile
          WHERE provider_profile.id = ag.provider_id
            AND provider_profile.email = ANY(ARRAY[
              'hufbearbeiter.hufmanager@gmail.com', 'pferdebesitzer.hufmanager@gmail.com',
              'mitarbeiter.hufmanager@gmail.com', 'partner.hufmanager@gmail.com',
              'hufmanagerbusiness@gmail.com', 'hufmanagerstallbetreiber@gmail.com'
            ])
        );

      UPDATE public.access_grants ag
      SET is_active = false,
          status = CASE WHEN ag.status IN ('revoked', 'rejected', 'cancelled') THEN ag.status ELSE 'revoked' END,
          revoked_at = COALESCE(ag.revoked_at, now()), updated_at = now()
      WHERE ag.client_id = ghost_profile.id
        AND EXISTS (
          SELECT 1 FROM public.profiles provider_profile
          WHERE provider_profile.id = ag.provider_id
            AND provider_profile.email = ANY(ARRAY[
              'hufbearbeiter.hufmanager@gmail.com', 'pferdebesitzer.hufmanager@gmail.com',
              'mitarbeiter.hufmanager@gmail.com', 'partner.hufmanager@gmail.com',
              'hufmanagerbusiness@gmail.com', 'hufmanagerstallbetreiber@gmail.com'
            ])
        );

      UPDATE public.profiles SET deleted_at = now() WHERE id = ghost_profile.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TTL serverseitig hart auf 15 Minuten
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_pending_client_invite_v1(
  p_provider_id uuid,
  p_email text,
  p_request_id text,
  p_ttl_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_row public.hm_pending_client_invites;
  -- Der Sicherheitsvertrag, nicht verhandelbar. p_ttl_minutes bleibt nur für
  -- die Signaturkompatibilität bestehender Aufrufer erhalten und wird
  -- bewusst ignoriert: ein Aufrufer darf die Lebensdauer eines
  -- Suppression-Fensters nicht bestimmen.
  v_ttl constant interval := interval '15 minutes';
BEGIN
  IF p_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider is required';
  END IF;

  IF nullif(btrim(coalesce(p_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Request id is required';
  END IF;

  IF NOT public.has_role(p_provider_id, 'provider'::app_role) THEN
    RAISE EXCEPTION 'Only providers may invite customers';
  END IF;

  v_email := public._hm_normalize_email(p_email);
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  PERFORM public._hm_expire_pending_client_invites(v_email);

  SELECT * INTO v_row
  FROM public.hm_pending_client_invites
  WHERE provider_id = p_provider_id
    AND request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_row.normalized_email <> v_email THEN
      RAISE EXCEPTION 'Request id already used for a different email';
    END IF;

    IF v_row.consumed_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'invite_id', v_row.id, 'request_id', v_row.request_id,
        'status', 'already_completed', 'expires_at', v_row.expires_at,
        'user_id', v_row.consumed_user_id
      );
    END IF;

    IF v_row.invalidated_at IS NULL AND v_row.expires_at > now() THEN
      RETURN jsonb_build_object(
        'invite_id', v_row.id, 'request_id', v_row.request_id,
        'status', 'pending', 'expires_at', v_row.expires_at,
        'user_id', v_row.user_id
      );
    END IF;

    UPDATE public.hm_pending_client_invites
    SET invalidated_at = NULL,
        invalidated_reason = NULL,
        cleanup_required = false,
        user_id = NULL,
        bound_at = NULL,
        created_at = now(),
        expires_at = now() + v_ttl
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'invite_id', v_row.id, 'request_id', v_row.request_id,
      'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hm_pending_client_invites
    WHERE normalized_email = v_email
      AND consumed_at IS NULL
      AND invalidated_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Another invite for this email is already pending';
  END IF;

  INSERT INTO public.hm_pending_client_invites (
    request_id, provider_id, normalized_email, expires_at
  )
  VALUES (
    p_request_id, p_provider_id, v_email, now() + v_ttl
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'invite_id', v_row.id, 'request_id', v_row.request_id,
    'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_client_invite_v1(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_client_invite_v1(uuid, text, text, integer) TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Kanonischer Vertrag: E-Mail-Dreiecksvergleich + Ghost-Finalisierung
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

REVOKE ALL ON FUNCTION public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb) TO service_role;
$MIG8TEXT$);

do $apply8$
declare s text; h text;
begin
  select t into s from _mig8;
  h := md5(s);
  if h <> '5d426ae10ca2831cb4c0cd016d93d348' then
    raise exception 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', h;
  end if;
  execute s;
end
$apply8$;

do $poststate$
declare
  v_hnu text; v_cpci text; v_civc text;
  v_acl_hnu text; v_acl_cpci text; v_acl_civc text;
  v_bad int;
begin
  select md5(prosrc), coalesce(array_to_string(proacl,' | '),'NULL') into v_hnu, v_acl_hnu
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc), coalesce(array_to_string(proacl,' | '),'NULL') into v_cpci, v_acl_cpci
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_pending_client_invite_v1';
  select md5(prosrc), coalesce(array_to_string(proacl,' | '),'NULL') into v_civc, v_acl_civc
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';

  if v_hnu  <> '5cb9eee610c378ead795a285475ccd08'  then raise exception 'ABORT: handle_new_user nicht auf #8-Zielstand (%)', v_hnu; end if;
  if v_cpci <> 'cd138b57c0236f214dd8307d024717cb' then raise exception 'ABORT: create_pending_client_invite_v1 nicht auf #8-Zielstand (%)', v_cpci; end if;
  if v_civc <> 'fabfebb739ca83ad11c8fcae60fac2a6' then raise exception 'ABORT: create_invited_customer_with_contact nicht auf #8-Zielstand (%)', v_civc; end if;

  if v_acl_hnu  <> '=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL handle_new_user veraendert ("%")', v_acl_hnu; end if;
  if v_acl_cpci <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL create_pending_client_invite_v1 veraendert ("%")', v_acl_cpci; end if;
  if v_acl_civc <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL create_invited_customer_with_contact veraendert ("%")', v_acl_civc; end if;

  -- Alle drei muessen SECURITY DEFINER mit festem search_path und Owner postgres sein.
  select count(*) into v_bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname in ('handle_new_user','create_pending_client_invite_v1','create_invited_customer_with_contact')
     and (not p.prosecdef
          or coalesce(array_to_string(p.proconfig,','),'NULL') <> 'search_path=public'
          or pg_get_userbyid(p.proowner) <> 'postgres');
  if v_bad <> 0 then raise exception 'ABORT: % Funktion(en) mit falschem SECDEF/search_path/Owner', v_bad; end if;

  -- Tenant-kritisch: die beiden service-role-Funktionen duerfen fuer untrusted
  -- Rollen nicht ausfuehrbar sein.
  if has_function_privilege('anon','public.create_pending_client_invite_v1(uuid, text, text, integer)','EXECUTE')
     or has_function_privilege('authenticated','public.create_pending_client_invite_v1(uuid, text, text, integer)','EXECUTE')
     or has_function_privilege('anon','public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb)','EXECUTE') then
    raise exception 'ABORT: untrusted Rolle hat EXECUTE auf einer der Invite-Funktionen';
  end if;
end
$poststate$;

do $sideeffects$
declare v_rows bigint; v_m6 text; v_trg int;
begin
  select count(*) into v_rows from public.hm_pending_client_invites;
  select md5(prosrc) into v_m6 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';
  select count(*) into v_trg from pg_trigger t join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where not t.tgisinternal and n.nspname in ('public','auth');

  if v_rows <> 0 then raise exception 'ABORT: hm_pending_client_invites hat jetzt % Zeile(n) — #8 darf nichts schreiben.', v_rows; end if;
  if v_m6 <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: #6-Funktion wurde veraendert (%)', v_m6; end if;
  if v_trg <> 191 then raise exception 'ABORT: Triggerzahl veraendert (erwartet 191, gefunden %)', v_trg; end if;
end
$sideeffects$;

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
select '20260920120000',
       'fix_pending_invite_ghost_merge_v1',
       ARRAY[t]::text[],
       'passaondigital@gmail.com',
       NULL,
       NULL
from _mig8;

commit;
