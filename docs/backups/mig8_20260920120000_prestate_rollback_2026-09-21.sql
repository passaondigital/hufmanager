-- ROLLBACK / PRE-STATE Migration #8
-- 20260920120000_fix_pending_invite_ghost_merge_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Herkunft der drei Funktionsdefinitionen ────────────────────────────────
-- Keine davon ist rekonstruiert:
--
--   public.handle_new_user()
--     woertliche pg_get_functiondef()-Ausgabe aus Production,
--     base64-transportiert und lokal dekodiert.
--     functiondef md5 = 8af001b16380a9d5b8347dd06dd55024 (4586 Bytes)
--     prosrc md5      = dc89cc94bbaf69e6a41f55b60b594723 (4428 Bytes)
--
--   public.create_pending_client_invite_v1(uuid, text, text, integer)
--     woertliches Statement aus 20260917150000 (#5). Vor dem Einbetten
--     geprueft: der prosrc-md5 dieses Statements ist identisch mit dem in
--     Production laufenden Stand.
--     prosrc md5 = 098ba120e40e3e51019e74c827959d84
--
--   public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb)
--     woertliches Statement aus 20260917160000 (#7), ebenso md5-verifiziert.
--     prosrc md5 = 0be8f9ca939c9e84d4d59352338d8c62
--
-- ── Warum der Rueckweg deterministisch ist ─────────────────────────────────
-- #8 besteht aus 7 Statements, 0 DML: drei CREATE OR REPLACE FUNCTION plus
-- zwei REVOKE/GRANT-Paare. Keine Tabellen-, Index-, Trigger-, Policy- oder
-- RLS-DDL, 0 betroffene Bestandszeilen. Der Rueckweg ist: dieselben drei
-- Funktionen mit ihren alten Definitionen zurueckschreiben und die
-- Ledger-Zeile entfernen. MIG8_DATA_ROLLBACK_LOSSLESS=YES.
--
-- ── Zu den Grants ─────────────────────────────────────────────────────────
-- CREATE OR REPLACE FUNCTION aendert ACLs nicht. Die REVOKE/GRANT-Paare in #8
-- sind wortgleich mit denen aus #5 bzw. #7 und aendern den bestehenden Zustand
-- deshalb ohnehin nicht. Es gibt folglich nichts zurueckzunehmen; der
-- Postcheck unten prueft die ACLs trotzdem explizit.
--
-- handle_new_user behaelt ihre Alt-ACL (EXECUTE fuer PUBLIC/anon/authenticated).
-- Das ist ein BESTEHENDER Legacy-Befund, den weder #8 noch dieser Rollback
-- anfasst. Die Funktion ist RETURNS trigger und damit nicht direkt aufrufbar.
--
-- ── ACHTUNG: was dieser Rollback wieder scharf schaltet ────────────────────
-- Die alte handle_new_user() enthaelt zwei bekannte Schwaechen, die #8
-- schliesst und die hier bewusst wiederhergestellt werden, weil ein Rollback
-- den Vorzustand herstellt und nicht selektiv verbessert:
--   1. bedingungslose Ghost-Merge-Schleife (Cross-Provider-Uebernahme)
--   2. Rollenvergabe aus raw_user_meta_data, die 'admin' und 'partner'
--      vom Client setzbar macht
-- Ein Rollback von #8 ist deshalb nur vertretbar, wenn #8 selbst Schaden
-- angerichtet hat. Sonst ist Vorwaertsrollen die bessere Antwort.
--
-- ── Was diese Datei bewusst NICHT anfasst ─────────────────────────────────
--   * #5-Vertragstabelle, RLS, Policies, die uebrigen vier #5-Funktionen
--   * das search_path-Hardening 20260917152500
--   * #6 / public.auto_assign_client_to_provider()
--   * #1-#4, #9
--   * alle Trigger-Bindungen
--   * Kundendaten, die 39 Ghost-Profile, die 4 Duplikat-Gruppen
--   * auth.users, Pferde, Termine, Rechnungen, Vault, Edge Functions
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ────────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig8_20260920120000_prestate_rollback_2026-09-21.sql

begin;

-- ── Guard 1: #9 darf nicht angewendet sein ────────────────────────────────
-- #9 definiert create_invited_customer_with_contact erneut. Waere es
-- angewendet, wuerde dieser Rollback dessen Cross-Provider-Guard entfernen.
do $guard_chain$
declare v_m9 int;
begin
  select count(*) into v_m9 from supabase_migrations.schema_migrations
   where version = '20260920190000';
  if v_m9 <> 0 then
    raise exception 'ABORT: #9 ist angewendet. #8 darf nicht isoliert zurueckgerollt werden.';
  end if;
end
$guard_chain$;

-- ── Guard 2: es ist wirklich der #8-Stand ─────────────────────────────────
do $guard_state$
declare v_hnu text; v_cpci text; v_civc text;
begin
  select md5(prosrc) into v_hnu  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='handle_new_user';
  select md5(prosrc) into v_cpci from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_pending_client_invite_v1';
  select md5(prosrc) into v_civc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='create_invited_customer_with_contact';

  if v_hnu is null or v_cpci is null or v_civc is null then
    raise exception 'ABORT: eine der drei Funktionen fehlt (hnu=%, cpci=%, civc=%)', v_hnu, v_cpci, v_civc;
  end if;

  if v_hnu = 'dc89cc94bbaf69e6a41f55b60b594723' and v_cpci = '098ba120e40e3e51019e74c827959d84' and v_civc = '0be8f9ca939c9e84d4d59352338d8c62' then
    raise notice 'HINWEIS: alle drei Funktionen sind bereits im Pre-State — #8 war nicht aktiv.';
  elsif v_hnu <> '5cb9eee610c378ead795a285475ccd08' or v_cpci <> 'cd138b57c0236f214dd8307d024717cb' or v_civc <> 'fabfebb739ca83ad11c8fcae60fac2a6' then
    raise exception
      'ABORT: Funktionsstand ist weder #8 noch Pre-State (hnu=%, cpci=%, civc=%). Erst analysieren.',
      v_hnu, v_cpci, v_civc;
  end if;
end
$guard_state$;

-- ── Guard 3: der Invite-Vertrag darf nicht produktiv benutzt worden sein ──
do $guard_used$
declare v_used bigint;
begin
  select count(*) into v_used from public.hm_pending_client_invites;
  if v_used > 0 then
    raise exception
      'ABORT: hm_pending_client_invites enthaelt % Zeile(n) — der Invite-Flow lief bereits. Vor dem Rollback bewerten.',
      v_used;
  end if;
end
$guard_used$;

-- ── 1. handle_new_user() woertlich zurueckschreiben ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role_from_meta TEXT;
  assigned_role app_role;
  ghost_profile RECORD;
BEGIN
  user_role_from_meta := new.raw_user_meta_data->>'role';

  IF user_role_from_meta = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSIF user_role_from_meta = 'admin' THEN
    assigned_role := 'admin'::app_role;
  ELSIF user_role_from_meta = 'partner' THEN
    assigned_role := 'partner'::app_role;
  ELSE
    assigned_role := 'provider'::app_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name,
    signup_app, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, signup_referrer, landing_path
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Neuer Nutzer'),
    new.raw_user_meta_data->>'signup_app',
    new.raw_user_meta_data->>'utm_source',
    new.raw_user_meta_data->>'utm_medium',
    new.raw_user_meta_data->>'utm_campaign',
    new.raw_user_meta_data->>'utm_content',
    new.raw_user_meta_data->>'utm_term',
    new.raw_user_meta_data->>'signup_referrer',
    new.raw_user_meta_data->>'landing_path'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    -- First-Touch: nur setzen, wenn bisher leer
    signup_app      = COALESCE(public.profiles.signup_app, EXCLUDED.signup_app),
    utm_source      = COALESCE(public.profiles.utm_source, EXCLUDED.utm_source),
    utm_medium      = COALESCE(public.profiles.utm_medium, EXCLUDED.utm_medium),
    utm_campaign    = COALESCE(public.profiles.utm_campaign, EXCLUDED.utm_campaign),
    utm_content     = COALESCE(public.profiles.utm_content, EXCLUDED.utm_content),
    utm_term        = COALESCE(public.profiles.utm_term, EXCLUDED.utm_term),
    signup_referrer = COALESCE(public.profiles.signup_referrer, EXCLUDED.signup_referrer),
    landing_path    = COALESCE(public.profiles.landing_path, EXCLUDED.landing_path);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  FOR ghost_profile IN
    SELECT p.id, p.created_by_provider_id
    FROM public.profiles p
    WHERE p.email = new.email
      AND p.id <> new.id
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = p.id
      )
    ORDER BY (p.created_by_provider_id IS NOT NULL) DESC, p.created_at ASC NULLS LAST, p.id ASC
  LOOP
    UPDATE public.horses
    SET owner_id = new.id
    WHERE owner_id = ghost_profile.id;

    UPDATE public.appointments
    SET client_id = new.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.contacts
    SET profile_id = new.id
    WHERE profile_id = ghost_profile.id;

    UPDATE public.access_grants ag
    SET client_id = new.id
    WHERE ag.client_id = ghost_profile.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com',
            'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com',
            'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com',
            'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.access_grants ag
    SET is_active = false,
        status = CASE
          WHEN ag.status IN ('revoked', 'rejected', 'cancelled') THEN ag.status
          ELSE 'revoked'
        END,
        revoked_at = COALESCE(ag.revoked_at, now()),
        updated_at = now()
    WHERE ag.client_id = ghost_profile.id
      AND EXISTS (
        SELECT 1
        FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com',
            'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com',
            'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com',
            'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.profiles
    SET deleted_at = now()
    WHERE id = ghost_profile.id;

    RAISE LOG 'Merged ghost profile % into auth user % for email %', ghost_profile.id, new.id, new.email;
  END LOOP;

  RETURN new;
END;
$function$;

-- ── 2. create_pending_client_invite_v1() auf den #5-Stand ────────────────
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
  v_ttl integer;
  v_row public.hm_pending_client_invites;
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

  v_ttl := greatest(1, least(coalesce(p_ttl_minutes, 15), 60));

  -- Abgelaufene Invites dieser Adresse zuerst schliessen, sonst blockiert der
  -- Unique-Index eine neue, legitime Einladung.
  PERFORM public._hm_expire_pending_client_invites(v_email);

  -- Retry mit demselben request_id: keinen zweiten Invite erzeugen.
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

    -- Abgelaufen oder invalidiert: derselbe Retry darf ihn wiederbeleben,
    -- solange die Adresse frei ist. Das hält den request_id-Vertrag stabil.
    UPDATE public.hm_pending_client_invites
    SET invalidated_at = NULL,
        invalidated_reason = NULL,
        cleanup_required = false,
        user_id = NULL,
        bound_at = NULL,
        created_at = now(),
        expires_at = now() + make_interval(mins => v_ttl)
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'invite_id', v_row.id, 'request_id', v_row.request_id,
      'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
    );
  END IF;

  -- Fremder offener Invite auf dieselbe Adresse: nicht übernehmen.
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
    p_request_id, p_provider_id, v_email, now() + make_interval(mins => v_ttl)
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'invite_id', v_row.id, 'request_id', v_row.request_id,
    'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
  );
END;
$$;

-- ── 3. create_invited_customer_with_contact() auf den #7-Stand ───────────
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

-- ── 4. Genau die eine Ledger-Zeile ───────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260920120000';

-- ── 5. Postcheck im selben Transaktionsblock ─────────────────────────────
do $verify$
declare
  v_hnu text; v_cpci text; v_civc text;
  v_acl_hnu text; v_acl_cpci text; v_acl_civc text;
  v_ledger int; v_prev int; v_m6 text;
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
  select md5(prosrc) into v_m6 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='auto_assign_client_to_provider';

  select count(*) into v_ledger from supabase_migrations.schema_migrations where version='20260920120000';
  select count(*) into v_prev   from supabase_migrations.schema_migrations
   where version in ('20260917150000','20260917152500','20260917155000','20260917160000');

  if v_hnu <> 'dc89cc94bbaf69e6a41f55b60b594723' then raise exception 'ABORT: handle_new_user nicht im Pre-State (%)', v_hnu; end if;
  if v_cpci <> '098ba120e40e3e51019e74c827959d84' then raise exception 'ABORT: create_pending_client_invite_v1 nicht im Pre-State (%)', v_cpci; end if;
  if v_civc <> '0be8f9ca939c9e84d4d59352338d8c62' then raise exception 'ABORT: create_invited_customer_with_contact nicht im Pre-State (%)', v_civc; end if;
  if v_acl_hnu <> '=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL handle_new_user veraendert ("%")', v_acl_hnu; end if;
  if v_acl_cpci <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL create_pending_client_invite_v1 veraendert ("%")', v_acl_cpci; end if;
  if v_acl_civc <> 'postgres=X/postgres | service_role=X/postgres' then raise exception 'ABORT: ACL create_invited_customer_with_contact veraendert ("%")', v_acl_civc; end if;
  if v_m6 <> 'b6f62858b4de1b61a9a7503e1668e209' then raise exception 'ABORT: #6-Funktion veraendert (%)', v_m6; end if;
  if v_ledger <> 0 then raise exception 'ABORT: Ledger-Zeile 20260920120000 noch vorhanden (%)', v_ledger; end if;
  if v_prev <> 4 then raise exception 'ABORT: #5/Hardening/#6/#7 nicht mehr intakt (erwartet 4, gefunden %)', v_prev; end if;

  raise notice 'ROLLBACK #8 OK: drei Funktionen im Pre-State, ACLs unveraendert, #5-#7 intakt.';
end
$verify$;

commit;
