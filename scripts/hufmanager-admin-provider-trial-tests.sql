-- Admin-angelegte Provider (admin-create-user) <-> kanonischer Slim-Trial.
-- Aufruf: psql -v mig_body=/pfad/zu/trial-migration-bodies.sql -v legacy=0|1 -f scripts/hufmanager-admin-provider-trial-tests.sql
--   mig_body: 20260924120000 + 20260925080000 ohne BEGIN/COMMIT (auf PROD bereits live; lokal nachziehen)
--   legacy=1: Negativkontrolle = altes admin-create-user (kein signup_app im Auth-Insert) -> T1/T7 müssen FAIL sein
-- Laeuft komplett in einer Transaktion und endet mit ROLLBACK.
--
-- Simuliert admin-create-user v133+Fix exakt:
--   1. auth.admin.createUser  -> INSERT auth.users mit user_metadata {full_name, role, [signup_app]}
--      (handle_new_user -> profiles, danach user_roles provider -> Trial-Trigger)
--   2. anschliessendes profiles-Update (plan_override, subscription_plan='pro' bei Override, ...)
\set ON_ERROR_STOP 1
BEGIN;
\i :mig_body
CREATE TEMP TABLE r(t text, ok boolean, info text);

-- Metadaten so, wie admin-create-user sie baut (legacy=1: ohne signup_app)
CREATE TEMP TABLE cfg AS SELECT (:legacy)::int = 1 AS legacy;
CREATE FUNCTION pg_temp.meta(p_standard boolean) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('full_name','QA Admin Provider','role','provider')
         || CASE WHEN p_standard AND NOT (SELECT legacy FROM cfg) THEN '{"signup_app":"hufmanager"}'::jsonb ELSE '{}'::jsonb END
$$;
CREATE FUNCTION pg_temp.admin_create(p_id uuid, p_email text, p_plan_override text, p_password text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          CASE WHEN p_password IS NULL THEN NULL ELSE crypt(p_password, gen_salt('bf')) END,
          pg_temp.meta(p_plan_override IS NULL), '{"provider":"email","providers":["email"]}', now(), now(), now());
  UPDATE public.profiles
     SET full_name = 'QA Admin Provider',
         is_manually_managed = (p_plan_override IS NOT NULL),
         email = p_email,
         plan_override = p_plan_override,
         subscription_plan = CASE WHEN p_plan_override IS NOT NULL THEN 'pro' ELSE subscription_plan END,
         access_valid_until = CASE WHEN p_plan_override IN ('lifetime_grant','employee') THEN '2099-12-31'::timestamptz
                                   WHEN p_plan_override = 'manual_cash_1y' THEN now() + interval '1 year' ELSE access_valid_until END
   WHERE id = p_id;
END $$;
CREATE FUNCTION pg_temp.ent_count(p_id uuid) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.product_entitlements WHERE user_id = p_id AND product = 'HUFMANAGER' $$;
CREATE FUNCTION pg_temp.trial_events(p_id uuid) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.hm_lifecycle_events WHERE subject_id = p_id AND event_name = 'trial_started' $$;
CREATE FUNCTION pg_temp.ent_md5(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT md5(coalesce(string_agg(to_jsonb(e)::text, '|' ORDER BY e.id), '')) FROM public.product_entitlements e WHERE user_id = p_id $$;

-- T1 Admin-Standard-Provider neu (ohne Passwort = Einladungs-Pfad)
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d1', 't1-admin-std@example.invalid', NULL, NULL);
INSERT INTO r SELECT 'T1a signup_app=hufmanager', signup_app = 'hufmanager', coalesce(signup_app,'NULL') FROM profiles WHERE id = '00000000-0000-4000-8000-0000000000d1';
INSERT INTO r SELECT 'T1b genau 1 HUFMANAGER_SLIM-Entitlement', pg_temp.ent_count('00000000-0000-4000-8000-0000000000d1') = 1, pg_temp.ent_count('00000000-0000-4000-8000-0000000000d1')::text;
INSERT INTO r SELECT 'T1c TRIAL_ACTIVE, exakt 14 Tage',
  bool_and(plan = 'HUFMANAGER_SLIM' AND status = 'TRIAL_ACTIVE' AND trial_status = 'ACTIVE' AND trial_ends_at - trial_started_at = interval '14 days'),
  coalesce(string_agg(status || ' ' || (trial_ends_at - trial_started_at)::text, ','), 'none')
  FROM product_entitlements WHERE user_id = '00000000-0000-4000-8000-0000000000d1';
INSERT INTO r SELECT 'T1d Zugang true', public._hm_has_hufmanager_access_v1('00000000-0000-4000-8000-0000000000d1'), '';
INSERT INTO r SELECT 'T1e genau 1 trial_started-Event', pg_temp.trial_events('00000000-0000-4000-8000-0000000000d1') = 1, pg_temp.trial_events('00000000-0000-4000-8000-0000000000d1')::text;

-- T2 erneuter Aufruf: gleiche E-Mail (GoTrue lehnt ab -> hier: unique-Verletzung), Trial-Writer erneut, Rolle erneut
SELECT pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d1') AS t2_before \gset
DO $$ BEGIN
  BEGIN
    PERFORM pg_temp.admin_create('00000000-0000-4000-8000-0000000000d9', 't1-admin-std@example.invalid', NULL, NULL);
    RAISE NOTICE 'T2: zweiter Insert mit gleicher E-Mail NICHT abgelehnt';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
INSERT INTO r SELECT 'T2a Writer erneut -> skipped_existing_entitlement',
  public.hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000d1', 'admin_reinvite') = 'skipped_existing_entitlement', '';
INSERT INTO user_roles(user_id, role) VALUES ('00000000-0000-4000-8000-0000000000d1', 'provider') ON CONFLICT DO NOTHING;
INSERT INTO r SELECT 'T2b kein zweiter Trial, Entitlement unverändert',
  pg_temp.trial_events('00000000-0000-4000-8000-0000000000d1') = 1 AND pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d1') = :'t2_before', '';
-- T2c auch nach Entfernen des Entitlements kein neuer Trial (einmal pro Identität)
SAVEPOINT t2c;
DELETE FROM product_entitlements WHERE user_id = '00000000-0000-4000-8000-0000000000d1';
SELECT public.hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000d1', 'retry') AS t2c_res \gset
ROLLBACK TO SAVEPOINT t2c;
-- Ergebnisse aus Savepoints erst nach dem Rollback eintragen (sonst mit verworfen)
INSERT INTO r SELECT 'T2c Trial bereits genutzt -> skipped_trial_already_used', :'t2c_res' = 'skipped_trial_already_used', :'t2c_res';

-- T3 bestehendes Paid-Entitlement bleibt unverändert
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d3', 't3-paid@example.invalid', 'copecart_pro', NULL);
INSERT INTO product_entitlements(user_id, product, plan, status, billing_status, source)
VALUES ('00000000-0000-4000-8000-0000000000d3', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'VERIFIED_PAID', 'MANUAL');
SELECT pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d3') AS t3_before \gset
INSERT INTO r SELECT 'T3a Writer -> skipped_existing_entitlement',
  public.hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000d3', 'x') = 'skipped_existing_entitlement', '';
UPDATE profiles SET signup_app = 'hufmanager' WHERE id = '00000000-0000-4000-8000-0000000000d3';
INSERT INTO user_roles(user_id, role) VALUES ('00000000-0000-4000-8000-0000000000d3', 'provider') ON CONFLICT DO NOTHING;
INSERT INTO r SELECT 'T3b Paid unverändert, kein Trial-Event',
  pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d3') = :'t3_before' AND pg_temp.trial_events('00000000-0000-4000-8000-0000000000d3') = 0, '';

-- T4 Lifetime / Barzahlung / Beta / CopeCart-Overrides: kein unbeabsichtigter Trial
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d4', 't4-lifetime@example.invalid', 'lifetime_grant', NULL);
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d5', 't4-cash@example.invalid', 'manual_cash_1y', 'Pw-Test-12345!');
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d6', 't4-beta@example.invalid', 'beta_tester', NULL);
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000da', 't4-cc@example.invalid', 'copecart_starter', NULL);
INSERT INTO r SELECT 'T4 Override-Pläne: 0 Entitlements, 0 Trial-Events, signup_app NULL',
  bool_and(pg_temp.ent_count(id) = 0 AND pg_temp.trial_events(id) = 0 AND signup_app IS NULL), string_agg(coalesce(plan_override,'-'), ',')
  FROM profiles WHERE id IN ('00000000-0000-4000-8000-0000000000d4','00000000-0000-4000-8000-0000000000d5','00000000-0000-4000-8000-0000000000d6','00000000-0000-4000-8000-0000000000da');

-- T5 Mitarbeiter: Override employee und echter Mitarbeiter (app_metadata role=employee)
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d7', 't5-emp-override@example.invalid', 'employee', NULL);
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-0000000000db', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't5-emp@example.invalid',
        '{"full_name":"T5","signup_app":"hufmanager"}', '{"role":"employee"}', now(), now(), now());
INSERT INTO r SELECT 'T5a employee-Override -> kein Trial', pg_temp.ent_count('00000000-0000-4000-8000-0000000000d7') = 0 AND pg_temp.trial_events('00000000-0000-4000-8000-0000000000d7') = 0, '';
INSERT INTO r SELECT 'T5b echter Mitarbeiter (auch mit signup_app) -> keine Provider-Rolle, kein Trial',
  NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = '00000000-0000-4000-8000-0000000000db' AND role = 'provider')
  AND pg_temp.ent_count('00000000-0000-4000-8000-0000000000db') = 0, '';

-- T6 Einladung ohne Passwort -> Passwort setzen + Login: derselbe Trial, kein Neustart
SELECT pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d1') AS t6_before \gset
UPDATE auth.users SET encrypted_password = crypt('Neues-Pw-12345!', gen_salt('bf')), last_sign_in_at = now(), updated_at = now()
 WHERE id = '00000000-0000-4000-8000-0000000000d1';
INSERT INTO r SELECT 'T6 nach Passwortsetzung/Login unverändert',
  pg_temp.ent_md5('00000000-0000-4000-8000-0000000000d1') = :'t6_before' AND pg_temp.trial_events('00000000-0000-4000-8000-0000000000d1') = 1, '';

-- T7 Passwort direkt vergeben -> identisches Entitlement-Verhalten
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000d8', 't7-admin-pw@example.invalid', NULL, 'Pw-Test-12345!');
INSERT INTO r SELECT 'T7 Passwort-Pfad: signup_app, 1x TRIAL_ACTIVE 14 Tage',
  bool_and(p.signup_app = 'hufmanager' AND e.status = 'TRIAL_ACTIVE' AND e.trial_ends_at - e.trial_started_at = interval '14 days')
  AND count(*) = 1, count(*)::text
  FROM profiles p JOIN product_entitlements e ON e.user_id = p.id AND e.product = 'HUFMANAGER' WHERE p.id = '00000000-0000-4000-8000-0000000000d8';

-- T8 Fehler beim Trial-Start: Anlage bleibt konsistent (kein halber Billing-State, kein Zugang, Issue protokolliert)
SAVEPOINT t8;
CREATE OR REPLACE FUNCTION public.hm_start_hufmanager_slim_trial_v1(p_user_id uuid, p_reason text DEFAULT 'provider_signup')
RETURNS text LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced trial failure'; END $$;
SELECT pg_temp.admin_create('00000000-0000-4000-8000-0000000000dc', 't8-fail@example.invalid', NULL, NULL);
SELECT
  (EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-4000-8000-0000000000dc' AND signup_app = 'hufmanager')
   AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = '00000000-0000-4000-8000-0000000000dc' AND role = 'provider')) AS t8a,
  (pg_temp.ent_count('00000000-0000-4000-8000-0000000000dc') = 0 AND pg_temp.trial_events('00000000-0000-4000-8000-0000000000dc') = 0
   AND NOT public._hm_has_hufmanager_access_v1('00000000-0000-4000-8000-0000000000dc')) AS t8b,
  (SELECT count(*) FROM hm_lifecycle_reconciliation_issues WHERE issue_type = 'TRIAL_START_UNEXPECTED_ERROR'
     AND subject_id = '00000000-0000-4000-8000-0000000000dc') AS t8c \gset
ROLLBACK TO SAVEPOINT t8;
INSERT INTO r VALUES ('T8a Nutzer+Profil+Provider-Rolle angelegt', :'t8a'::boolean, ''),
                     ('T8b kein Entitlement, kein Event, kein Zugang', :'t8b'::boolean, ''),
                     ('T8c Reconciliation-Issue TRIAL_START_UNEXPECTED_ERROR', :'t8c'::int >= 1, :'t8c');
INSERT INTO r SELECT 'T8d Writer nach Rollback wieder original', md5(pg_get_functiondef('public.hm_start_hufmanager_slim_trial_v1(uuid,text)'::regprocedure)) = '1f4be16b5c047efb5b53afc9a63ed92d', '';

-- Ergebnis
SELECT (CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END) || t || CASE WHEN info <> '' THEN ' [' || info || ']' ELSE '' END FROM r;
SELECT 'SUMMARY ' || count(*) FILTER (WHERE ok) || '/' || count(*) || CASE WHEN (SELECT legacy FROM cfg) THEN ' (legacy/Negativkontrolle)' ELSE '' END FROM r;
ROLLBACK;
