-- HufManager Slim — Manual-Access-Writer (20260929090000) Tests T1–T12 + Security S1–S10.
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
CREATE FUNCTION pg_temp.w(p_id uuid, p_type text, p_until timestamptz, p_actor uuid) RETURNS text LANGUAGE sql AS $$
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

-- T1 Standard → 14-Tage-Trial (unverändert), Writer nicht beteiligt
INSERT INTO r SELECT 'T1 Standard: TRIAL_ACTIVE 14 Tage, Zugang',
  (e).status = 'TRIAL_ACTIVE' AND (e).trial_ends_at - (e).trial_started_at = interval '14 days'
  AND pg_temp.acc('00000000-0000-4000-9000-000000000051') AND pg_temp.ev_n('00000000-0000-4000-9000-000000000051','manual_access_granted') = 0,
  (e).status::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-000000000051') e) x;

-- Override-Anlage (Admin, ohne signup_app) → heute KEIN Entitlement
INSERT INTO r SELECT 'T0 Override-Anlage ohne Writer: kein Entitlement, kein Zugang',
  pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 0 AND NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b1'), '';

-- T2 Lifetime
INSERT INTO r SELECT 'T2a Lifetime-Grant', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T2b Lifetime: ACTIVE/NONE/manual, kein Ende, kein Trial, Zugang',
  (e).status = 'ACTIVE' AND (e).billing_status = 'NONE' AND (e).billing_provider = 'manual' AND (e).current_period_end IS NULL
  AND (e).trial_status = 'NONE' AND (e).source = 'MANUAL_GRANT'
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','trial_started') = 0
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_granted') = 1
  AND pg_temp.acc('00000000-0000-4000-9000-0000000000b1'),
  (e).status::text || '/' || (e).billing_status::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b1') e) x;
INSERT INTO r SELECT 'T2c Audit-Event: actor, grant_type, reason, kein PII',
  metadata->>'actor_id' = '00000000-0000-4000-9000-0000000000a1' AND metadata->>'grant_type' = 'MANUAL_LIFETIME'
  AND metadata->>'reason' = 'QA Testgrund' AND source = 'admin' AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM'
  AND metadata::text NOT LIKE '%@%', ''
  FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1' AND event_name = 'manual_access_granted';

-- T3 Manual Cash 1Y → Zugang exakt bis Enddatum
INSERT INTO r SELECT 'T3a Fixed-Term-Grant', pg_temp.w('00000000-0000-4000-9000-0000000000b2','MANUAL_FIXED_TERM', now() + interval '1 year','00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T3b Fixed-Term: Ende gesetzt, Zugang, kein Trial',
  (e).current_period_end = now() + interval '1 year' AND (e).billing_status = 'NONE' AND pg_temp.acc('00000000-0000-4000-9000-0000000000b2')
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b2','trial_started') = 0, ''
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b2') e) x;
UPDATE public.product_entitlements SET current_period_end = now() + interval '1 second' WHERE user_id = '00000000-0000-4000-9000-0000000000b2';
INSERT INTO r SELECT 'T3c 1 s vor Ende: Zugang true', pg_temp.acc('00000000-0000-4000-9000-0000000000b2'), '';
UPDATE public.product_entitlements SET current_period_end = now() WHERE user_id = '00000000-0000-4000-9000-0000000000b2';
INSERT INTO r SELECT 'T3d exakt am Ende: Zugang false', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b2'), '';

-- T4 abgelaufenes Manual Cash → kein Zugang (auch in RLS-Gate und Kontext)
SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b3','MANUAL_FIXED_TERM', now() + interval '30 days','00000000-0000-4000-9000-0000000000a1');
UPDATE public.product_entitlements SET current_period_end = now() - interval '1 day' WHERE user_id = '00000000-0000-4000-9000-0000000000b3';
INSERT INTO r SELECT 'T4a abgelaufen: _hm_has… false', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b3'), '';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b3","role":"authenticated"}', true);
INSERT INTO r SELECT 'T4b abgelaufen: has_hufmanager_access_v1() false', NOT public.has_hufmanager_access_v1(), '';
INSERT INTO r SELECT 'T4c abgelaufen: Kontext has_access=false, reason LOCKED', NOT has_access AND reason_code = 'LOCKED', reason_code FROM public.get_hufmanager_access_context_v1();
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b1","role":"authenticated"}', true);
INSERT INTO r SELECT 'T2d Lifetime: Kontext ACTIVE_MANUAL', has_access AND reason_code = 'ACTIVE_MANUAL', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- T5 Employee → kein eigenes Provider-Abo
INSERT INTO r SELECT 'T5a Writer lehnt Mitarbeiter ab',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000e1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'target_not_provider', '';
INSERT INTO r SELECT 'T5b Mitarbeiter: kein Entitlement, kein Trial', pg_temp.ent_n('00000000-0000-4000-9000-0000000000e1') = 0
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000e1','trial_started') = 0, '';

-- T6 Beta (Modell offen): mit und ohne Enddatum technisch möglich, nie VERIFIED_PAID
INSERT INTO r SELECT 'T6a Beta ohne Ende', pg_temp.w('00000000-0000-4000-9000-0000000000b4','BETA_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000000b4')).billing_status = 'NONE', '';
INSERT INTO r SELECT 'T6b Beta mit Ende', pg_temp.w('00000000-0000-4000-9000-0000000000b4','BETA_ACCESS',now() + interval '90 days','00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000000b4')).current_period_end IS NOT NULL AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b4') = 1, '';

-- T7 CopeCart-Override ohne Payment Evidence → nie VERIFIED_PAID, kein Zugang aus Legacy-Strings
UPDATE public.profiles SET plan_override = 'copecart_pro', subscription_plan = 'pro', subscription_status = 'active', access_valid_until = '2099-12-31'
 WHERE id = '00000000-0000-4000-9000-0000000000b5';
INSERT INTO r SELECT 'T7a Legacy-Strings geben keinen Zugang', NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b5') AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b5') = 0, '';
INSERT INTO r SELECT 'T7b Writer erzeugt nie VERIFIED_PAID',
  NOT EXISTS (SELECT 1 FROM public.product_entitlements WHERE source = 'MANUAL_GRANT' AND billing_status <> 'NONE'), '';
INSERT INTO r SELECT 'T7c unbekannte Grant-Art (z. B. Planstring) abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b5','copecart_pro',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'invalid_grant_type', '';

-- T8 echte CopeCart-Zahlung → bestehender Pfad bleibt zuständig
INSERT INTO public.hufi_data_events (source, source_event_id, event_type, product_id, is_test, occurred_at, received_at, payload_sha256, payload)
VALUES ('copecart', 'qa-ma-pay-1', 'payment.succeeded', '3a97bd25', false, now(), now(), md5('qa-ma-pay-1'), '{}');
INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, domain_event_key, provider_subscription_id)
VALUES ('payment_succeeded', '00000000-0000-4000-9000-0000000000b6', now(), 'copecart', 'qa-ma-pay-1', 'OBSERVED_EVENT', 'qa-ma-pay-1', 'qa-sub-1');
INSERT INTO r SELECT 'T8a Zahlung → ACTIVE/VERIFIED_PAID über Projektor',
  (e).status = 'ACTIVE' AND (e).billing_status = 'VERIFIED_PAID' AND pg_temp.acc('00000000-0000-4000-9000-0000000000b6'),
  (e).status::text || '/' || (e).billing_status::text || '/' || coalesce((e).billing_provider,'-') FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b6') e) x;

-- T11 Paid-Nutzer wird nie verschlechtert
SELECT pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b6') AS paid_before \gset
INSERT INTO r SELECT 'T11a Grant auf Paid → skipped', pg_temp.w('00000000-0000-4000-9000-0000000000b6','MANUAL_FIXED_TERM',now() + interval '10 days','00000000-0000-4000-9000-0000000000a1') = 'skipped_paid_entitlement', '';
INSERT INTO r SELECT 'T11b Revoke auf Paid → skipped', pg_temp.w('00000000-0000-4000-9000-0000000000b6','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'skipped_not_manual', '';
INSERT INTO r SELECT 'T11c Paid-Entitlement byte-identisch', pg_temp.ent_md5('00000000-0000-4000-9000-0000000000b6') = :'paid_before', '';

-- T9 Grant wiederholen → idempotent
SELECT count(*) AS ev_before FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1' \gset
INSERT INTO r SELECT 'T9a gleicher Lifetime-Grant → unchanged', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a2') = 'unchanged', '';
INSERT INTO r SELECT 'T9b kein neues Event, genau 1 Entitlement',
  (SELECT count(*) FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b1') = :ev_before
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 1, '';

-- T10 Revoke → Zugang endet, Historie bleibt; Re-Grant möglich
INSERT INTO r SELECT 'T10a Revoke', pg_temp.w('00000000-0000-4000-9000-0000000000b1','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_revoked', '';
INSERT INTO r SELECT 'T10b nach Revoke: LOCKED, kein Zugang, Events erhalten',
  (e).status = 'LOCKED' AND NOT pg_temp.acc('00000000-0000-4000-9000-0000000000b1')
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_granted') = 1
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000000b1','manual_access_revoked') = 1, (e).status::text
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b1') e) x;
INSERT INTO r SELECT 'T10c Revoke wiederholt → unchanged', pg_temp.w('00000000-0000-4000-9000-0000000000b1','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'unchanged', '';
INSERT INTO r SELECT 'T10d Re-Grant nach Revoke', pg_temp.w('00000000-0000-4000-9000-0000000000b1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T10d2 nach Re-Grant: Zugang, genau 1 Entitlement',
  pg_temp.acc('00000000-0000-4000-9000-0000000000b1') AND pg_temp.ent_n('00000000-0000-4000-9000-0000000000b1') = 1, '';
INSERT INTO r SELECT 'T10e Revoke auf Trial-Nutzer → skipped', pg_temp.w('00000000-0000-4000-9000-000000000051','REVOKE_MANUAL_ACCESS',NULL,'00000000-0000-4000-9000-0000000000a1') = 'skipped_not_manual'
  AND pg_temp.acc('00000000-0000-4000-9000-000000000051'), '';

-- T12 bestehender Legacy-Manual-Grant (Backfill) → nur per expliziter Admin-Aktion migriert
INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source, migration_version, metadata)
VALUES ('00000000-0000-4000-9000-0000000000b7', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'VERIFIED_PAID', 'NONE',
        'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT', 'hufmanager-slim-legacy-backfill-v1', '{"legacy_plan_override":"manual_cash_1y"}');
INSERT INTO r SELECT 'T12a Legacy unverändert ohne Aktion (Zugang true)', pg_temp.acc('00000000-0000-4000-9000-0000000000b7')
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000000b7')).source = 'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT', '';
INSERT INTO r SELECT 'T12b explizite Migration per Admin-Aktion',
  pg_temp.w('00000000-0000-4000-9000-0000000000b7','MANUAL_FIXED_TERM', now() + interval '120 days','00000000-0000-4000-9000-0000000000a1') = 'manual_access_granted', '';
INSERT INTO r SELECT 'T12c danach kanonisch: manual, NONE, Ende, Legacy-Metadaten erhalten, Zugang',
  (e2).billing_status = 'NONE' AND (e2).billing_provider = 'manual' AND (e2).current_period_end IS NOT NULL
  AND (e2).metadata ? 'legacy_plan_override' AND pg_temp.acc('00000000-0000-4000-9000-0000000000b7'), ''
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000000b7') e2) x;

-- Security
INSERT INTO r SELECT 'S1 Self-Grant verboten',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000a1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'self_grant_forbidden', '';
INSERT INTO r SELECT 'S2 Nicht-Admin-Akteur (auch via service_role) abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000b2')$$) = 'actor_not_admin', '';
INSERT INTO r SELECT 'S3 Mitarbeiter kann sich kein Lifetime geben',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000e1','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000e1')$$) = 'actor_not_admin', '';
INSERT INTO r SELECT 'S4 unbekanntes Ziel abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-00000000ffff','MANUAL_LIFETIME',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'target_not_found', '';
INSERT INTO r SELECT 'S5 Ende bei Lifetime / fehlendes Ende bei Fixed-Term / Vergangenheit abgelehnt',
  pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',now()+interval '1 day','00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_not_allowed'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b4','MANUAL_FIXED_TERM',NULL,'00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid'
  AND pg_temp.err($$SELECT pg_temp.w('00000000-0000-4000-9000-0000000000b4','MANUAL_FIXED_TERM',now()-interval '1 day','00000000-0000-4000-9000-0000000000a1')$$) = 'valid_until_invalid', '';
INSERT INTO r SELECT 'S6 Grund mit E-Mail / leer abgelehnt',
  pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,'Kunde x@y.de','00000000-0000-4000-9000-0000000000a1')$$) = 'reason_contains_email'
  AND pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,' ','00000000-0000-4000-9000-0000000000a1')$$) = 'reason_required', '';

SET LOCAL ROLE authenticated;
-- S7: Provider (nicht Admin) ruft Admin-Wrapper → abgelehnt; Kern-Writer direkt → keine Rechte
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000b2","role":"authenticated"}', true);
INSERT INTO r SELECT 'S7a Provider via Admin-Wrapper → actor_not_admin',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,'Selbstbedienung')$$) = 'actor_not_admin', '';
INSERT INTO r SELECT 'S7b authenticated → Kern-Writer permission denied',
  pg_temp.err($$SELECT public.hm_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b2','MANUAL_LIFETIME',NULL,'Selbst','00000000-0000-4000-9000-0000000000a1')$$) LIKE 'permission denied%', '';
INSERT INTO r SELECT 'S7c authenticated → direkter Entitlement-Insert verboten',
  pg_temp.err($$INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source, migration_version) VALUES ('00000000-0000-4000-9000-0000000000b2','HUFMANAGER','HUFMANAGER_SLIM','ACTIVE','NONE','NONE','X','x')$$) LIKE 'permission denied%', '';
INSERT INTO r SELECT 'S7d authenticated → direkter Lifecycle-Insert verboten',
  pg_temp.err($$INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, domain_event_key) VALUES ('manual_access_granted','00000000-0000-4000-9000-0000000000b2',now(),'admin','x','OBSERVED_EVENT','x')$$) LIKE 'permission denied%', '';
-- S8: Admin via Wrapper → erlaubt, Akteur = auth.uid()
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000000a2","role":"authenticated"}', true);
INSERT INTO r SELECT 'S8a Admin-Wrapper erlaubt', public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b5','MANUAL_FIXED_TERM',now() + interval '60 days','Barzahlung Quittung 2026-09') = 'manual_access_granted', '';
INSERT INTO r SELECT 'S8b Admin-Wrapper Self-Grant verboten',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000a2','MANUAL_LIFETIME',NULL,'selbst')$$) = 'self_grant_forbidden', '';
RESET ROLE;
INSERT INTO r SELECT 'S8c Akteur im Audit = auth.uid()', metadata->>'actor_id' = '00000000-0000-4000-9000-0000000000a2', ''
  FROM public.hm_lifecycle_events WHERE subject_id = '00000000-0000-4000-9000-0000000000b5' AND event_name = 'manual_access_granted';
SET LOCAL ROLE anon;
INSERT INTO r SELECT 'S9 anon → Wrapper permission denied',
  pg_temp.err($$SELECT public.hm_admin_set_hufmanager_manual_access_v1('00000000-0000-4000-9000-0000000000b4','MANUAL_LIFETIME',NULL,'anon')$$) LIKE 'permission denied%', '';
RESET ROLE;
INSERT INTO r SELECT 'S10 Projektor/Reconciler ignorieren neue Events (keine offenen Issues)',
  NOT EXISTS (SELECT 1 FROM public.hm_lifecycle_reconciliation_issues i WHERE i.subject_id::text LIKE '00000000-0000-4000-9000-%' AND i.issue_type LIKE 'ENTITLEMENT_PROJECTION%UNEXPECTED%'), '';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
