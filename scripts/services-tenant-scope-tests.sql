-- P0 Leistungskatalog: positive + negative Tenant-Tests.
-- Aufruf: psql -v mig_body=supabase/migrations/20260924220000_scope_services_read_and_foreign_service_guard_v1.sql -f scripts/services-tenant-scope-tests.sql
-- Laeuft komplett in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO PUBLIC;

-- Fixtures: Provider A/B, Mitarbeiter E (von A), Kunde C (aktiver Grant A), Kunde D (revoked Grant A),
-- Admin X, fremder Provider R.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-a@example.invalid','{"full_name":"A","role":"provider"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-b@example.invalid','{"full_name":"B","role":"provider"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-00000000e0e0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-e@example.invalid','{"full_name":"E","role":"employee"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-00000000c0c0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-c@example.invalid','{"full_name":"C","role":"client"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-00000000d0d0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-d@example.invalid','{"full_name":"D","role":"client"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-00000000f0f0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-x@example.invalid','{"full_name":"X","role":"client"}','{}',now(),now(),now()),
 ('00000000-0000-4000-8000-000000001111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sv-r@example.invalid','{"full_name":"R","role":"provider"}','{}',now(),now(),now());
INSERT INTO user_roles(user_id, role) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','provider'),('00000000-0000-4000-8000-00000000b0b0','provider'),
 ('00000000-0000-4000-8000-000000001111','provider'),('00000000-0000-4000-8000-00000000c0c0','client'),
 ('00000000-0000-4000-8000-00000000d0d0','client'),('00000000-0000-4000-8000-00000000f0f0','admin')
ON CONFLICT DO NOTHING;
INSERT INTO product_entitlements(user_id,product,plan,status,billing_status,source)
SELECT u, 'HUFMANAGER','HUFMANAGER_SLIM','ACTIVE','VERIFIED_PAID','MANUAL'
FROM unnest(ARRAY['00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000b0b0']::uuid[]) u
ON CONFLICT DO NOTHING;
INSERT INTO employee_profiles(provider_id, user_id, full_name, email, status)
VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000e0e0','E','sv-e@example.invalid','active');
INSERT INTO access_grants(provider_id, client_id, is_active, status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000c0c0',true,'active'),
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000d0d0',false,'revoked');
INSERT INTO services(id, provider_id, name, base_price, is_active) VALUES
 ('00000000-0000-4000-8000-0000000005a1','00000000-0000-4000-8000-00000000a0a0','SV-A aktiv',80,true),
 ('00000000-0000-4000-8000-0000000005a2','00000000-0000-4000-8000-00000000a0a0','SV-A inaktiv',90,false),
 ('00000000-0000-4000-8000-0000000005b1','00000000-0000-4000-8000-00000000b0b0','SV-B aktiv',70,true);
INSERT INTO horses(id, owner_id, name) VALUES ('00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-00000000c0c0','SV-Pferd');
-- Altbestand wie die 22 Prod-Termine: A-Termin mit B-Leistung (vor der Migration angelegt)
INSERT INTO appointments(id, provider_id, horse_id, client_id, date, service_id, service_type, price, status)
VALUES ('00000000-0000-4000-8000-0000000007a0','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004a1',
        '00000000-0000-4000-8000-00000000c0c0', current_date, '00000000-0000-4000-8000-0000000005b1','SV-B aktiv',70,'planned');
CREATE TEMP TABLE pre AS SELECT (SELECT count(*) FROM services) svc, (SELECT count(*) FROM appointments) appt,
  (SELECT md5(string_agg(to_jsonb(a)::text, '' ORDER BY id)) FROM appointments a) appt_md5;

\i :mig_body

INSERT INTO r SELECT 'M0 migration does not touch rows', svc=(SELECT count(*) FROM services) AND appt=(SELECT count(*) FROM appointments)
  AND appt_md5=(SELECT md5(string_agg(to_jsonb(a)::text, '' ORDER BY id)) FROM appointments a), '' FROM pre;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
$$;
CREATE TEMP VIEW my_sv WITH (security_invoker = true) AS SELECT string_agg(name, ',' ORDER BY name) names FROM services WHERE name LIKE 'SV-%';
GRANT SELECT ON my_sv TO PUBLIC;

-- Lesen
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000a0a0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R1 provider A: own active+inactive, not B', names='SV-A aktiv,SV-A inaktiv', names FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000b0b0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R2 provider B: only own', names='SV-B aktiv', names FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000e0e0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R3 employee of A: A active only', names='SV-A aktiv', names FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000c0c0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R4 client with active grant A: A active only', names='SV-A aktiv', names FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000d0d0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R5 client with revoked grant: none', names IS NULL, coalesce(names,'-') FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-000000001111'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R6 unrelated provider: none', names IS NULL, coalesce(names,'-') FROM my_sv; RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000f0f0'); SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R7 admin (user_roles): all active', names='SV-A aktiv,SV-B aktiv', names FROM my_sv; RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true); SET LOCAL ROLE anon;
INSERT INTO r SELECT 'R8 anon: none', names IS NULL, coalesce(names,'-') FROM my_sv; RESET ROLE;
-- Metadata darf keine Rechte geben
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin","is_admin":true}',
  raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' WHERE id='00000000-0000-4000-8000-000000001111';
SELECT set_config('request.jwt.claims', json_build_object('sub','00000000-0000-4000-8000-000000001111','role','authenticated',
  'app_metadata', json_build_object('role','admin'), 'user_metadata', json_build_object('role','admin'))::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO r SELECT 'R9 fake admin metadata: none', names IS NULL, coalesce(names,'-') FROM my_sv; RESET ROLE;

-- Schreiben (als Provider A, echte RLS)
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000a0a0'); SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO appointments(provider_id, horse_id, client_id, date, service_id, service_type, status)
  VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-00000000c0c0',current_date,'00000000-0000-4000-8000-0000000005a1','SV-A aktiv','planned');
  INSERT INTO r VALUES ('W1 own service insert allowed', true, '');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W1 own service insert allowed', false, SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO appointments(provider_id, horse_id, client_id, date, service_id, service_type, status)
  VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-00000000c0c0',current_date,'00000000-0000-4000-8000-0000000005b1','SV-B aktiv','planned');
  INSERT INTO r VALUES ('W2 foreign service insert rejected', false, 'inserted');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W2 foreign service insert rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO appointments(provider_id, horse_id, client_id, date, service_type, status)
  VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-00000000c0c0',current_date,'Freitext','planned');
  INSERT INTO r VALUES ('W3 insert without service_id (Schnell-Termin) allowed', true, '');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W3 insert without service_id (Schnell-Termin) allowed', false, SQLERRM); END $$;
DO $$ BEGIN
  UPDATE appointments SET notes='bearbeitet', time='09:00' WHERE id='00000000-0000-4000-8000-0000000007a0';
  INSERT INTO r SELECT 'W4 legacy foreign appt stays editable', service_id='00000000-0000-4000-8000-0000000005b1' AND notes='bearbeitet' AND price=70, service_id::text||' '||price
  FROM appointments WHERE id='00000000-0000-4000-8000-0000000007a0';
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W4 legacy foreign appt stays editable', false, SQLERRM); END $$;
DO $$ BEGIN
  UPDATE appointments SET service_id='00000000-0000-4000-8000-0000000005b1' WHERE id='00000000-0000-4000-8000-0000000007a0';
  INSERT INTO r VALUES ('W5 re-saving same foreign service_id allowed', true, '');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W5 re-saving same foreign service_id allowed', false, SQLERRM); END $$;
DO $$ BEGIN
  UPDATE appointments SET service_id='00000000-0000-4000-8000-0000000005b1'
  WHERE provider_id='00000000-0000-4000-8000-00000000a0a0' AND service_id='00000000-0000-4000-8000-0000000005a1';
  INSERT INTO r VALUES ('W6 switching own appt to foreign service rejected', false, 'updated');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W6 switching own appt to foreign service rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO service_price_overrides(service_id, price_group, price, provider_id)
  VALUES ('00000000-0000-4000-8000-0000000005b1','standard',1,'00000000-0000-4000-8000-00000000a0a0');
  INSERT INTO r VALUES ('W7 price override on foreign service rejected', false, 'inserted');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W7 price override on foreign service rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO service_price_overrides(service_id, price_group, price, provider_id)
  VALUES ('00000000-0000-4000-8000-0000000005a1','standard',75,'00000000-0000-4000-8000-00000000a0a0');
  INSERT INTO r VALUES ('W8 price override on own service allowed', true, '');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W8 price override on own service allowed', false, SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO autoflow_settings(provider_id, default_service_id) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000005b1');
  INSERT INTO r VALUES ('W9 autoflow default foreign service rejected', false, 'inserted');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W9 autoflow default foreign service rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
DO $$ BEGIN
  INSERT INTO payment_products(user_id, service_id) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000005b1');
  INSERT INTO r VALUES ('W10 payment product foreign service rejected', false, 'inserted');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W10 payment product foreign service rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
RESET ROLE;
-- Auch Backend-Pfade (service_role, SECURITY DEFINER RPCs, Edge Functions) sind gebunden
SET LOCAL ROLE service_role;
DO $$ BEGIN
  INSERT INTO appointments(provider_id, horse_id, client_id, date, service_id, service_type, status)
  VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-00000000c0c0',current_date,'00000000-0000-4000-8000-0000000005b1','SV-B aktiv','planned');
  INSERT INTO r VALUES ('W11 service_role foreign insert rejected', false, 'inserted');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W11 service_role foreign insert rejected', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
DO $$ BEGIN
  UPDATE appointments SET provider_id='00000000-0000-4000-8000-000000001111' WHERE id='00000000-0000-4000-8000-0000000007a0';
  INSERT INTO r VALUES ('W12 moving appt to other provider keeps guard', false, 'updated');
EXCEPTION WHEN others THEN INSERT INTO r VALUES ('W12 moving appt to other provider keeps guard', SQLERRM LIKE 'Leistung gehört nicht%', SQLERRM); END $$;
RESET ROLE;
-- Trigger-Funktion nicht direkt aufrufbar
INSERT INTO r SELECT 'S1 guard fn not executable by anon/authenticated',
  CASE WHEN to_regprocedure('public.hm_guard_service_owner_v1()') IS NULL THEN false ELSE
  NOT has_function_privilege('anon','public.hm_guard_service_owner_v1()','execute')
  AND NOT has_function_privilege('authenticated','public.hm_guard_service_owner_v1()','execute') END, '';
INSERT INTO r SELECT 'S2 old global read policy gone', NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.services'::regclass AND polname='Authenticated users can view active services'), '';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END res, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
