-- HufManager Slim — Manual-Access-Writer (20260929090000): Owner-Tests T1–T20 + Security S1–S9.
-- Aufruf (NUR lokaler Stack, Migration vorher angewendet):
--   docker exec -i supabase_db_vnschgjxkzzwzefqlrji psql -U postgres -v ON_ERROR_STOP=1 < scripts/hufmanager-manual-access-tests.sql
-- Läuft in einer Transaktion und endet mit ROLLBACK. Zeitablauf wird durch Zurücksetzen von
-- current_period_end simuliert (Testaufbau, kein Writer-Pfad).
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO authenticated, anon;

CREATE FUNCTION pg_temp.mk_user(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta,
          '{"provider":"email","providers":["email"]}', now(), now(), now());
$$;
CREATE FUNCTION pg_temp.ent(p_id uuid) RETURNS public.product_entitlements LANGUAGE sql AS $$
  SELECT * FROM public.product_entitlements WHERE user_id = p_id AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM' $$;
CREATE FUNCTION pg_temp.ent_n(p_id uuid) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.product_entitlements WHERE user_id = p_id AND product = 'HUFMANAGER' $$;
CREATE FUNCTION pg_temp.ev_n(p_id uuid, p_name text) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.hm_lifecycle_events WHERE subject_id = p_id AND event_name::text = p_name $$;
CREATE FUNCTION pg_temp.ent_md5(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT md5(coalesce(string_agg(to_jsonb(e)::text, '|' ORDER BY e.id), '')) FROM public.product_entitlements e WHERE user_id = p_id $$;
CREATE FUNCTION pg_temp.acc(p_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT public._hm_has_hufmanager_access_v1(p_id) $$;
CREATE FUNCTION pg_temp.w(p_id uuid, p_type text, p_until date, p_actor uuid) RETURNS text LANGUAGE sql AS $$
  SELECT public.hm_set_hufmanager_manual_access_v1(p_id, p_type, p_until, 'QA Testgrund', p_actor) $$;
CREATE FUNCTION pg_temp.err(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN 'NO_ERROR'; EXCEPTION WHEN OTHERS THEN RETURN SQLERRM; END $$;

-- Akteure / Ziele
-- A = Admin, P* = Provider ohne signup_app (Admin-Override-Anlage), S = Standard-Provider (Trial), E = Mitarbeiter
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000a1', 'ma-admin@example.invalid', '{"full_name":"QA Admin","role":"provider"}');
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-9000-0000000000a1', 'admin') ON CONFLICT DO NOTHING;
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000a2', 'ma-admin2@example.invalid', '{"full_name":"QA Admin2","role":"provider"}');
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-9000-0000000000a2', 'admin') ON CONFLICT DO NOTHING;
SELECT pg_temp.mk_user('00000000-0000-4000-9000-000000000051', 'ma-std@example.invalid', '{"full_name":"QA Std","role":"provider","signup_app":"hufmanager"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b1', 'ma-life@example.invalid', '{"full_name":"QA Life","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b2', 'ma-cash@example.invalid', '{"full_name":"QA Cash","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b3', 'ma-cash-exp@example.invalid', '{"full_name":"QA CashExp","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b4', 'ma-beta@example.invalid', '{"full_name":"QA Beta","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b5', 'ma-cc@example.invalid', '{"full_name":"QA CC","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b6', 'ma-paid@example.invalid', '{"full_name":"QA Paid","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000b7', 'ma-legacy@example.invalid', '{"full_name":"QA Legacy","role":"provider"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000e1', 'ma-emp@example.invalid', '{"full_name":"QA Emp","role":"employee"}');
DELETE FROM public.user_roles WHERE user_id = '00000000-0000-4000-9000-0000000000e1' AND role <> 'employee';
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-9000-0000000000e1', 'employee') ON CONFLICT DO NOTHING;
-- Grandfather-Fixture (Backfill-Klasse AMBIGUOUS_ACTIVE_ONLY, wie 28 Alt-Provider auf PROD)
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000000f1', 'ma-gf@example.invalid', '{"full_name":"QA GF","role":"provider"}');
INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source, migration_version, metadata)
VALUES ('00000000-0000-4000-9000-0000000000f1', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'UNKNOWN_BILLING_STATE', 'NONE',
        'LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY', 'hufmanager-slim-legacy-backfill-v1', '{"legacy_compatibility_review_required":true}');
SELECT pg_temp.ent_md5('00000000-0000-4000-9000-0000000000f1') AS gf_before \gset

-- T1 Standard → exakt 14 Tage Trial, Writer nicht beteiligt
INSERT INTO r SELECT 'T01 Standard: TRIAL_ACTIVE exakt 14 Tage, Zugang',
  (e).status = 'TRIAL_ACTIVE' AND (e).trial_ends_at - (e).trial_started_at = interval '14 days'
  AND pg_temp.acc('00000000-0000-4000-9000-000000000051') AND pg_temp.ev_n('00000000-0000-4000-9000-000000000051','manual_access_granted') = 0,
  (e).status::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-000000000051') e) x;
INSERT INTO r SELECT 'T00 Override-Anlage ohne Grant: kein Trial, kein Entitlement',
  pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 0 AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','trial_started') = 0, '';

-- T2 Lifetime → permanenter MANUAL_LIFETIME
INSERT INTO r SELECT 'T02a Lifetime-Grant', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T02b Lifetime: ACTIVE/NONE/manual, kein Ende, kein Trial, Zugang',
  (e).status = 'ACTIVE' AND (e).billing_status = 'NONE' AND (e).billing_provider = 'manual' AND (e).current_period_end IS NULL
  AND (e).trial_status = 'NONE' AND (e).source = 'MANUAL_GRANT' AND (e).metadata->>'manual_grant_type' = 'MANUAL_LIFETIME'
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','trial_started') = 0
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_granted') = 1
  AND pg_temp.acc('00000000-0000-4000-9000-0000000000b1'),
  (e).status::text || '/' || (e).billing_status::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b1') e) x;
INSERT INTO r SELECT 'T02c Audit-Event: Akteur, Grant-Art, Grund, Produkt/Plan, keine E-Mail',
  metadata->>'actor_id' = '00000000-0000-4000-9000-0000000000a1' AND metadata->>'grant_type' = 'MANUAL_LIFETIME'
  AND metadata->>'reason' = 'QA Testgrund' AND source = 'admin' AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM'
  AND metadata::text NOT LIKE '%@%', ''
  FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1' AND event_name = 'manual_access_granted';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b1","role":"authenticated"}', true);
INSERT INTO r SELECT 'T02d Lifetime: Kontext ACTIVE_MANUAL', has_access AND reason_code = 'ACTIVE_MANUAL', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- T3 Lifetime wiederholt → idempotent
SELECT count(*) AS ev_before FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1' \gset
INSERT INTO r SELECT 'T03a gleicher Lifetime-Grant (anderer Admin) → unchanged', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a2') = 'unchanged', '';
INSERT INTO r SELECT 'T03b kein neues Event, genau 1 Entitlement',
  (SELECT count(*) FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1') = :ev_before
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 1, '';

-- T4 Cash → Enddatum exakt übernommen
INSERT INTO r SELECT 'T04a Fixed-Term-Grant mit festem Enddatum',
  pg_temp.w('00000000-0000-4000-9000-0000000000b2','MANUAL_FIXED_TERM','2027-01-15','00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T04b letzter Tag 15.01.2027 → Grenze 16.01.2027 00:00 Berlin (= 15.01. 23:00Z), NONE, kein Trial, Zugang',
  (e).current_period_end = '2027-01-15 23:00:00+00' AND (e).billing_status = 'NONE' AND (e).metadata->>'manual_grant_type' = 'MANUAL_FIXED_TERM'
  AND pg_temp.acc('00000000-0000-4000-9000-0000000000b2') AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b2','trial_started') = 0,
  (e).current_period_end::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b2') e) x;

-- T5 Cash ohne Enddatum → BLOCK
INSERT INTO r SELECT 'T05 Fixed-Term ohne Enddatum → valid_until_invalid, nichts geschrieben',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b3','MANUAL_FIXED_TERM',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid'
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b3') = 0, '';

-- T6 Cash abgelaufen → kein Zugang (alle drei Gates); Grenze exakt
SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b3','MANUAL_FIXED_TERM', (now() + interval '30 days')::date,'00000000-0000-4000-9000-0000000000a1');
UPDATE public.product_entitlements SET current_period_end = now() + interval '1 second' WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
INSERT INTO r SELECT 'T06a 1 s vor Ende: Zugang true', pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '';
UPDATE public.product_entitlements SET current_period_end = now() WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
INSERT INTO r SELECT 'T06b exakt am Ende: Zugang false', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '';
UPDATE public.product_entitlements SET current_period_end = now() - interval '1 day' WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b3","role":"authenticated"}', true);
INSERT INTO r SELECT 'T06c abgelaufen: RLS-Gate has_hufmanager_access_v1() false', NOT public.has_hufmanager_access_v1(), '';
INSERT INTO r SELECT 'T06d abgelaufen: Kontext has_access=false, LOCKED', NOT has_access AND reason_code = 'LOCKED', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- T7 Beta mit Enddatum → Zugang bis Datum
INSERT INTO r SELECT 'T07a Beta mit Enddatum', pg_temp.w('00000000-0000-4000-9000-0000000000b4','BETA_ACCESS',(now() + interval '90 days')::date,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T07b Beta: Ende gesetzt, NONE, Zugang, kein Trial',
  (e).current_period_end = public.hm_manual_access_exclusive_end_v1((now() + interval '90 days')::date) AND (e).billing_status = 'NONE' AND (e).metadata->>'manual_grant_type' = 'BETA_ACCESS'
  AND pg_temp.acc('00000000-0000-4000-9000-0000000000b4') AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b4','trial_started') = 0, ''
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b4') e) x;
UPDATE public.product_entitlements SET current_period_end = now() - interval '1 minute' WHERE user_id = '00000000-0000-4000-9000-0000000000b4';
INSERT INTO r SELECT 'T07c Beta nach Enddatum: kein Zugang', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b4'), '';

-- T8 Beta ohne Enddatum → BLOCK
INSERT INTO r SELECT 'T08 Beta ohne Enddatum → valid_until_invalid',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','BETA_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid'
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b5') = 0, '';

-- T9 Employee → kein eigenes Provider-Entitlement
INSERT INTO r SELECT 'T09a Writer lehnt Mitarbeiter ab',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000e1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'target_not_provider', '';
INSERT INTO r SELECT 'T09b Mitarbeiter: kein Entitlement, kein Trial', pg_temp.ent_n('00000000-0000-4000-9000-0000000000e1') = 0
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000e1','trial_started') = 0, '';

-- T10 Legacy-CopeCart-UI → vitest (src/lib/providerPlanGrants.test.ts); DB-Seite: Planstring ist keine Grant-Art
INSERT INTO r SELECT 'T10 Planstring als Grant-Art → invalid_grant_type',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','copecart_pro',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'invalid_grant_type', '';

-- T11 CopeCart-String ohne echte Zahlung → niemals VERIFIED_PAID
UPDATE public.profiles SET plan_override = 'copecart_pro', subscription_plan = 'pro', subscription_status = 'active',
       access_valid_until = '2099-12-31', copecart_subscription_id = 'qa-string-only'
 WHERE id = '00000000-0000-4000-9000-0000000000b5';
INSERT INTO r SELECT 'T11a CopeCart-Strings: kein Entitlement, kein Zugang', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b5') AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b5') = 0, '';
INSERT INTO r SELECT 'T11b Manual-Writer erzeugt nie VERIFIED_PAID',
  NOT EXISTS (SELECT 1 FROM public.product_entitlements WHERE source = 'MANUAL_GRANT' AND billing_status <> 'NONE'), '';
-- Testzahlung (is_test) zählt nicht
INSERT INTO public.hufi_data_events (source, source_event_id, event_type, product_id, is_test, occurred_at, received_at, payload_sha256, payload)
VALUES ('copecart', 'qa-ma-testpay-1', 'payment.made', '3a97bd25', true, now(), now(), md5('qa-ma-testpay-1'), '{}');
INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, domain_event_key, provider_subscription_id)
VALUES ('payment_succeeded', '00000000-0000-4000-9000-0000000000b5', now(), 'copecart', 'qa-ma-testpay-1', 'OBSERVED_EVENT', 'qa-ma-testpay-1', 'qa-sub-t');
INSERT INTO r SELECT 'T11c Testzahlung → kein Entitlement, kein Zugang',
  pg_temp.ent_n('00000000-0000-4000-9000-0000000000b5') = 0 AND NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b5'), '';

-- T12 echte CopeCart-Zahlung → Billing-Lifecycle bleibt zuständig
INSERT INTO public.hufi_data_events (source, source_event_id, event_type, product_id, is_test, occurred_at, received_at, payload_sha256, payload)
VALUES ('copecart', 'qa-ma-pay-1', 'payment.made', '3a97bd25', false, now(), now(), md5('qa-ma-pay-1'), '{}');
INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, domain_event_key, provider_subscription_id)
VALUES ('payment_succeeded', '00000000-0000-4000-9000-0000000000b6', now(), 'copecart', 'qa-ma-pay-1', 'OBSERVED_EVENT', 'qa-ma-pay-1', 'qa-sub-1');
INSERT INTO r SELECT 'T12 echte Zahlung → ACTIVE/VERIFIED_PAID über Projektor',
  (e).status = 'ACTIVE' AND (e).billing_status = 'VERIFIED_PAID' AND (e).source IS DISTINCT FROM 'MANUAL_GRANT' AND pg_temp.acc('00000000-0000-4000-9000-0000000000b6'),
  (e).status::text || '/' || (e).billing_status::text || '/' || coalesce((e).billing_provider,'-') FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b6') e) x;

-- T13 Manual Grant auf Paid-User → Paid nicht verschlechtert
SELECT pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b6') AS paid_before \gset
INSERT INTO r SELECT 'T13a Lifetime/Fixed/Beta auf Paid → skipped_paid_entitlement',
  pg_temp.w('00000000-0000-4000-9000-0000000000b6','MANUAL_FIXED_TERM',(now() + interval '10 days')::date,'00000000-0000-4000-9000-0000000000a1') = 'skipped_paid_entitlement'
  AND pg_temp.w('00000000-0000-4000-9000-0000000000b6','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1') = 'skipped_paid_entitlement'
  AND pg_temp.w('00000000-0000-4000-9000-0000000000b6','BETA_ACCESS',(now() + interval '10 days')::date,'00000000-0000-4000-9000-0000000000a1') = 'skipped_paid_entitlement', '';
INSERT INTO r SELECT 'T13b Revoke auf Paid → skipped_not_manual', pg_temp.w('00000000-0000-4000-9000-0000000000b6','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'skipped_not_manual', '';
INSERT INTO r SELECT 'T13c Paid-Entitlement byte-identisch', pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b6') = :'paid_before', '';

-- T14 Revoke Manual → Zugang endet, Audit bleibt; wiederholbar, Re-Grant möglich
INSERT INTO r SELECT 'T14a Revoke Lifetime', pg_temp.w('00000000-0000-4000-9000-0000000000b1','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_revoked', '';
INSERT INTO r SELECT 'T14b nach Revoke: LOCKED, kein Zugang, Grant+Revoke-Events erhalten',
  (e).status = 'LOCKED' AND NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b1')
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_granted') = 1
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_revoked') = 1, (e).status::text
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b1') e) x;
INSERT INTO r SELECT 'T14c Revoke wiederholt → unchanged', pg_temp.w('00000000-0000-4000-9000-0000000000b1','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'unchanged', '';
INSERT INTO r SELECT 'T14d Re-Grant nach Revoke', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T14e nach Re-Grant: Zugang, genau 1 Entitlement', pg_temp.acc('00000000-0000-4000-9000-0000000000b1') AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 1, '';

-- T15 Revoke darf Trial nicht treffen
SELECT pg_temp.ent_md5('00000000-0000-4000-9000-000000000051') AS trial_before \gset
INSERT INTO r SELECT 'T15a Revoke auf Trial-Nutzer → skipped_not_manual', pg_temp.w('00000000-0000-4000-9000-000000000051','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'skipped_not_manual', '';
INSERT INTO r SELECT 'T15b Trial byte-identisch, Zugang', pg_temp.ent_md5('00000000-0000-4000-9000-000000000051') = :'trial_before' AND pg_temp.acc('00000000-0000-4000-9000-000000000051'), '';

-- T16 Self-Grant → BLOCK (Kern und Wrapper)
INSERT INTO r SELECT 'T16a Self-Grant Kern → self_grant_forbidden',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000a1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'self_grant_forbidden', '';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000a2","role":"authenticated"}', true);
INSERT INTO r SELECT 'T16b Self-Grant Admin-Wrapper → self_grant_forbidden',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000a2','MANUAL_LIFETIME',NULL,'selbst')$$) = 'self_grant_forbidden', '';
RESET ROLE;

-- T17 Nicht-Admin → BLOCK
INSERT INTO r SELECT 'T17a Provider als Akteur (Kern) → actor_not_admin',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000b2')$$) = 'actor_not_admin', '';
INSERT INTO r SELECT 'T17b Mitarbeiter gibt sich selbst Lifetime → actor_not_admin',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000e1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000e1')$$) = 'actor_not_admin', '';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b2","role":"authenticated"}', true);
INSERT INTO r SELECT 'T17c Provider via Admin-Wrapper → actor_not_admin',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b5','MANUAL_LIFETIME',NULL,'Selbstbedienung')$$) = 'actor_not_admin', '';
INSERT INTO r SELECT 'T17d authenticated → Kern-Writer permission denied',
  pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b2','MANUAL_LIFETIME',NULL,'Selbst','00000000-0000-4000-9000-0000000000a1')$$) LIKE 'permission denied%', '';
RESET ROLE;
SET LOCAL ROLE anon;
INSERT INTO r SELECT 'T17e anon → Wrapper permission denied',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,'anon')$$) LIKE 'permission denied%', '';
RESET ROLE;

-- T18 ungültige Grant-Art → BLOCK
INSERT INTO r SELECT 'T18 ungültige Grant-Arten → invalid_grant_type',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','VERIFIED_PAID',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'invalid_grant_type'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','employee',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'invalid_grant_type'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5',NULL,NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'invalid_grant_type', '';

-- T19 Fixed-Term-Enddatum-Manipulation → BLOCK
INSERT INTO r SELECT 'T19a Ende in Vergangenheit / > 5 Jahre / bei Lifetime → abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','MANUAL_FIXED_TERM',(now()-interval '1 day')::date - 1,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','MANUAL_FIXED_TERM',(now()+interval '6 years')::date,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','MANUAL_LIFETIME',(now()+interval '1 day')::date,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_not_allowed', '';
SELECT pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b2') AS cash_before \gset
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b2","role":"authenticated"}', true);
INSERT INTO r SELECT 'T19b Nutzer verlängert eigenes Ende direkt → permission denied',
  pg_temp.err($$UPDATE public.product_entitlements SET current_period_end = '2099-12-31' WHERE user_id = '00000000-0000-4000-9000-0000000000b2'$$) LIKE 'permission denied%', '';
INSERT INTO r SELECT 'T19c Nutzer fügt Entitlement/Lifecycle direkt ein → permission denied',
  pg_temp.err($$INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source, migration_version) VALUES ('00000000-0000-4000-9000-0000000000b2','HUFMANAGER','HUFMANAGER_SLIM','ACTIVE','NONE','NONE','X','x')$$) LIKE 'permission denied%'
  AND pg_temp.err($$INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, domain_event_key) VALUES ('manual_access_granted','00000000-0000-4000-9000-0000000000b2',now(),'admin','x','OBSERVED_EVENT','x')$$) LIKE 'permission denied%', '';
RESET ROLE;
INSERT INTO r SELECT 'T19d Cash-Entitlement unverändert', pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b2') = :'cash_before', '';

-- T20 Grandfather-Provider (AMBIGUOUS_ACTIVE_ONLY) → unverändert, Zugang erhalten
INSERT INTO r SELECT 'T20a Grandfather byte-identisch nach allen Writer-Läufen', pg_temp.ent_md5('00000000-0000-4000-9000-0000000000f1') = :'gf_before', '';
INSERT INTO r SELECT 'T20b Grandfather Zugang weiter true (neue Gate-Bedingung greift nur bei manual)', pg_temp.acc('00000000-0000-4000-9000-0000000000f1'), '';
INSERT INTO r SELECT 'T20c neue Standard-Provider bekommen Trial, nie Grandfather-Klasse',
  NOT EXISTS (SELECT 1 FROM public.product_entitlements WHERE user_id::text LIKE '00000000-0000-4000-9000-%' AND source LIKE 'LEGACY_BACKFILL%'
              AND user_id NOT IN ('00000000-0000-4000-9000-0000000000f1')), '';

-- Bestandsmigration Legacy-Manual (Backfill) nur per expliziter Admin-Aktion
INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source, migration_version, metadata)
VALUES ('00000000-0000-4000-9000-0000000000b7', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'VERIFIED_PAID', 'NONE',
        'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT', 'hufmanager-slim-legacy-backfill-v1', '{"legacy_plan_override":"manual_cash_1y"}');
INSERT INTO r SELECT 'M1 Legacy-Manual ohne Aktion unverändert (Zugang)', pg_temp.acc('00000000-0000-4000-9000-0000000000b7')
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000000b7')).source = 'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT', '';
INSERT INTO r SELECT 'M2 explizite Migration auf gespeichertes Enddatum',
  pg_temp.w('00000000-0000-4000-9000-0000000000b7','MANUAL_FIXED_TERM','2027-02-27','00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'M3 danach kanonisch: manual/NONE statt VERIFIED_PAID, Ende exakt, Legacy-Metadaten erhalten',
  (e2).billing_status = 'NONE' AND (e2).billing_provider = 'manual' AND (e2).current_period_end = '2027-02-27 23:00:00+00'
  AND (e2).metadata ? 'legacy_plan_override' AND pg_temp.acc('00000000-0000-4000-9000-0000000000b7'), ''
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b7') e2) x;

-- D Enddatum inklusiv (letzter Tag) → Grenze Folgetag 00:00 Europe/Berlin, DST-sicher
INSERT INTO r SELECT 'D1 Winter: 15.01.2027 → 2027-01-15 23:00Z', public.hm_manual_access_exclusive_end_v1('2027-01-15') = '2027-01-15 23:00:00+00', '';
INSERT INTO r SELECT 'D2 Sommer: 15.07.2027 → 2027-07-15 22:00Z', public.hm_manual_access_exclusive_end_v1('2027-07-15') = '2027-07-15 22:00:00+00', '';
INSERT INTO r SELECT 'D3 DST-Beginn: letzter Tag 27.03.2027 (Wechsel 28.03.) → 2027-03-27 23:00Z', public.hm_manual_access_exclusive_end_v1('2027-03-27') = '2027-03-27 23:00:00+00', '';
INSERT INTO r SELECT 'D4 DST-Beginn: letzter Tag 28.03.2027 (23-h-Tag) → 2027-03-28 22:00Z', public.hm_manual_access_exclusive_end_v1('2027-03-28') = '2027-03-28 22:00:00+00', '';
INSERT INTO r SELECT 'D5 DST-Ende: letzter Tag 30.10.2027 → 2027-10-30 22:00Z', public.hm_manual_access_exclusive_end_v1('2027-10-30') = '2027-10-30 22:00:00+00', '';
INSERT INTO r SELECT 'D6 DST-Ende: letzter Tag 31.10.2027 (25-h-Tag) → 2027-10-31 23:00Z', public.hm_manual_access_exclusive_end_v1('2027-10-31') = '2027-10-31 23:00:00+00', '';
INSERT INTO r SELECT 'D7 Grenze lokal = Folgetag 00:00 Europe/Berlin',
  bool_and((public.hm_manual_access_exclusive_end_v1(d) AT TIME ZONE 'Europe/Berlin') = (d + 1)::timestamp), ''
  FROM (SELECT generate_series('2027-01-01'::date, '2027-12-31'::date, '1 day')::date d) x;
INSERT INTO r SELECT 'D8 letzter Tag = heute (lokal) erlaubt',
  pg_temp.w('00000000-0000-4000-9000-0000000000b3','MANUAL_FIXED_TERM',(now() AT TIME ZONE 'Europe/Berlin')::date,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'D9 letzter Tag heute: Grenze = nächste lokale Mitternacht, Zugang true',
  (e).current_period_end = (((now() AT TIME ZONE 'Europe/Berlin')::date + 1)::timestamp AT TIME ZONE 'Europe/Berlin')
  AND pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '' FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b3') e) x;
UPDATE public.product_entitlements SET current_period_end = now() + interval '1 millisecond' WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
INSERT INTO r SELECT 'D10 exakt vor Ablauf (Grenze − 1 ms) → Zugang true', pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '';
UPDATE public.product_entitlements SET current_period_end = now() WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
INSERT INTO r SELECT 'D11 exakt ab Folgetag 00:00 lokal (Grenze erreicht) → Zugang false', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '';
INSERT INTO r SELECT 'D12 letzter Tag gestern → abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b4','MANUAL_FIXED_TERM',(now() AT TIME ZONE 'Europe/Berlin')::date - 1,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid', '';
INSERT INTO r SELECT 'D13 Trial-Zeile unberührt: weiter exakt 14 Tage', (e).trial_ends_at - (e).trial_started_at = interval '14 days' AND (e).current_period_end IS NULL, ''
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-000000000051') e) x;

-- Weitere Security
INSERT INTO r SELECT 'S1 unbekanntes / gelöschtes Ziel abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-00000000ffff','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'target_not_found', '';
INSERT INTO r SELECT 'S2 Grund mit E-Mail / leer abgelehnt',
  pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b5','MANUAL_LIFETIME',NULL,'Kunde x@y.de','00000000-0000-4000-9000-0000000000a1')$$) = 'reason_contains_email'
  AND pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b5','MANUAL_LIFETIME',NULL,' ','00000000-0000-4000-9000-0000000000a1')$$) = 'reason_required', '';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000a2","role":"authenticated"}', true);
INSERT INTO r SELECT 'S3 Admin via Wrapper erlaubt', public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b5','MANUAL_FIXED_TERM',(now() + interval '60 days')::date,'Barzahlung Quittung 2026-09') = 'manual_access_granted', '';
RESET ROLE;
INSERT INTO r SELECT 'S4 Akteur im Audit = auth.uid()', metadata->>'actor_id' = '00000000-0000-4000-9000-0000000000a2', ''
  FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b5' AND event_name = 'manual_access_granted';
INSERT INTO r SELECT 'S5 Projektor/Reconciler: keine Fehler-Issues durch neue Events',
  NOT EXISTS (SELECT 1 FROM public.hm_lifecycle_reconciliation_issues i WHERE i.subject_id::text LIKE '00000000-0000-4000-9000-%' AND i.issue_type LIKE '%UNEXPECTED%'), '';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
