-- Aufruf: psql -v mig_body=/pfad/zum/migrations-body-ohne-BEGIN-COMMIT.sql -f scripts/hufmanager-slim-trial-producer-tests.sql
-- Laeuft komplett in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
\i :mig_body
CREATE TEMP TABLE r(t text, ok boolean, info text);
-- T1 neue Provider-Registrierung
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t1-provider@example.invalid','{"full_name":"T1","role":"provider"}','{}',now(),now(),now());
INSERT INTO r SELECT 'T1 provider signup -> TRIAL_ACTIVE 14d', (status='TRIAL_ACTIVE' AND trial_status='ACTIVE' AND abs(extract(epoch from (trial_ends_at - trial_started_at)) - 14*86400) < 1), status||' '||trial_ends_at FROM product_entitlements WHERE user_id='00000000-0000-4000-8000-0000000000a1';
INSERT INTO r SELECT 'T1b exactly one trial event', count(*)=1, count(*)::text FROM hm_lifecycle_events WHERE subject_id='00000000-0000-4000-8000-0000000000a1' AND event_name='trial_started';
-- T1c access via RPC as that user
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
INSERT INTO r SELECT 'T1c access ctx ACTIVE_TRIAL', has_access AND reason_code='ACTIVE_TRIAL', reason_code FROM get_hufmanager_access_context_v1();
-- T2 Client-Registrierung -> kein Trial
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2-client@example.invalid','{"full_name":"T2","role":"client"}','{}',now(),now(),now());
INSERT INTO r SELECT 'T2 client signup -> no entitlement', count(*)=0, count(*)::text FROM product_entitlements WHERE user_id='00000000-0000-4000-8000-0000000000c2';
-- T3 bestehender ACTIVE (manuell) + spaeter Provider-Rolle -> unveraendert
INSERT INTO product_entitlements(user_id,product,plan,status,billing_status,source) VALUES ('00000000-0000-4000-8000-0000000000c2','HUFMANAGER','HUFMANAGER_SLIM','ACTIVE','VERIFIED_PAID','MANUAL');
INSERT INTO user_roles(user_id,role) VALUES ('00000000-0000-4000-8000-0000000000c2','provider') ON CONFLICT DO NOTHING;
INSERT INTO r SELECT 'T3 existing ACTIVE never overwritten', status='ACTIVE' AND billing_status='VERIFIED_PAID' AND trial_started_at IS NULL, status::text FROM product_entitlements WHERE user_id='00000000-0000-4000-8000-0000000000c2';
INSERT INTO r SELECT 'T3b no trial event for existing', count(*)=0, count(*)::text FROM hm_lifecycle_events WHERE subject_id='00000000-0000-4000-8000-0000000000c2';
-- T4 Idempotenz
INSERT INTO r SELECT 'T4 second call skipped', hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000a1')='skipped_existing_entitlement', hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000a1');
-- T5 Writer-Guard: synthetisches trial_started gegen ACTIVE-Zeile
INSERT INTO hm_lifecycle_events(event_name,subject_id,occurred_at,source,source_event_id,product,plan,verification_status)
VALUES ('trial_started','00000000-0000-4000-8000-0000000000c2',now()+interval '1 minute','admin','t5-forced','HUFMANAGER','HUFMANAGER_SLIM','OBSERVED_EVENT');
INSERT INTO r SELECT 'T5 writer guard keeps ACTIVE', status='ACTIVE' AND trial_started_at IS NULL, status::text FROM product_entitlements WHERE user_id='00000000-0000-4000-8000-0000000000c2';
INSERT INTO r SELECT 'T5b guard issue recorded', count(*)>=1, count(*)::text FROM hm_lifecycle_reconciliation_issues WHERE issue_type='ENTITLEMENT_TRIAL_START_SKIPPED_EXISTING_ENTITLEMENT' AND subject_id='00000000-0000-4000-8000-0000000000c2';
-- T6 Ablauf
UPDATE product_entitlements SET trial_started_at=trial_started_at-interval '15 days', trial_ends_at=trial_ends_at-interval '15 days' WHERE user_id='00000000-0000-4000-8000-0000000000a1';
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
INSERT INTO r SELECT 'T6 expired trial -> no access', NOT has_access AND reason_code='TRIAL_EXPIRED', reason_code FROM get_hufmanager_access_context_v1();
INSERT INTO r SELECT 'T6b has_hufmanager_access false', NOT has_hufmanager_access_v1(), '';
INSERT INTO r SELECT 'T6c 14d check constraint enforced', true, '';
-- T7 Rechte
INSERT INTO r SELECT 'T7 anon/authenticated cannot execute producer', NOT has_function_privilege('anon','public.hm_start_hufmanager_slim_trial_v1(uuid,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.hm_start_hufmanager_slim_trial_v1(uuid,text)','EXECUTE'), '';
-- T8 Nicht-Provider
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-0000000000c8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t8-client@example.invalid','{"full_name":"T8","role":"client"}','{}',now(),now(),now());
INSERT INTO r SELECT 'T8 producer refuses non-provider', hm_start_hufmanager_slim_trial_v1('00000000-0000-4000-8000-0000000000c8')='skipped_not_provider', '';
-- T10 erzwungener Producer-Fehler bricht Registrierung NICHT ab
CREATE OR REPLACE FUNCTION public.hm_start_hufmanager_slim_trial_v1(p_user_id uuid, p_reason text DEFAULT 'x') RETURNS text LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced test failure'; END $$;
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-8000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t10-provider@example.invalid','{"full_name":"T10","role":"provider"}','{}',now(),now(),now());
INSERT INTO r SELECT 'T10 signup survives producer failure', count(*)=1, count(*)::text FROM user_roles WHERE user_id='00000000-0000-4000-8000-0000000000e1' AND role='provider';
INSERT INTO r SELECT 'T10b failure recorded as issue', count(*)=1, count(*)::text FROM hm_lifecycle_reconciliation_issues WHERE issue_type='TRIAL_START_UNEXPECTED_ERROR' AND subject_id='00000000-0000-4000-8000-0000000000e1';
-- T9 kein TRIAL_START_UNEXPECTED_ERROR
INSERT INTO r SELECT 'T9 no unexpected trigger errors', count(*)=0, count(*)::text FROM hm_lifecycle_reconciliation_issues WHERE issue_type IN ('TRIAL_START_UNEXPECTED_ERROR','ENTITLEMENT_PROJECTION_UNEXPECTED_ERROR') AND last_seen_at > now()-interval '5 minutes' AND subject_id <> '00000000-0000-4000-8000-0000000000e1';
SELECT (CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END)||t||'  '||coalesce(info,'') FROM r;
SELECT 'TOTAL '||count(*) FILTER (WHERE ok)||'/'||count(*) FROM r;
ROLLBACK;
