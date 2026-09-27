-- P1 Termin-DB-Guard: positive + negative Tests.
-- Aufruf: psql -v mig_body=supabase/migrations/20260927120000_add_appointment_relation_guard_v1.sql -f scripts/appointment-guard-tests.sql
-- Negativkontrolle: -v mig_body=/dev/null  (dann müssen die Verbots-Tests FAIL sein)
-- Läuft komplett in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO PUBLIC;

-- Fixtures
--  A, B = Provider (Slim aktiv) · E = aktiver Mitarbeiter von A · F = aktiver Mitarbeiter von B
--  C = Kunde mit aktivem Grant A (Pferde HC, HC2) · K = Kunde mit aktivem Grant B (Pferd HK)
--  D = Kunde von A angelegt (created_by_provider_id=A), Grant beendet (wie die 4 PROD-Kunden) (Pferd HD)
--  G = Ghost-Kunde von A (kein Auth-User, aktiver Grant) (Pferd HG) · N = echter Nutzer für G (Signup)
--  X = Admin · HDEL = gelöschtes Pferd von C · O_A/O_B = Organisationen von A/B
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','ag-a@example.invalid'),
 ('00000000-0000-4000-8000-00000000b0b0','ag-b@example.invalid'),
 ('00000000-0000-4000-8000-00000000e0e0','ag-e@example.invalid'),
 ('00000000-0000-4000-8000-00000000f1f1','ag-f@example.invalid'),
 ('00000000-0000-4000-8000-00000000c0c0','ag-c@example.invalid'),
 ('00000000-0000-4000-8000-00000000d0d0','ag-d@example.invalid'),
 ('00000000-0000-4000-8000-0000000000cc','ag-k@example.invalid'),
 ('00000000-0000-4000-8000-00000000f0f0','ag-x@example.invalid'),
 ('00000000-0000-4000-8000-000000000a0a','ag-n@example.invalid');
INSERT INTO profiles (id, email, full_name, created_by_provider_id) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','ag-a@example.invalid','A',NULL),
 ('00000000-0000-4000-8000-00000000b0b0','ag-b@example.invalid','B',NULL),
 ('00000000-0000-4000-8000-00000000e0e0','ag-e@example.invalid','E',NULL),
 ('00000000-0000-4000-8000-00000000f1f1','ag-f@example.invalid','F',NULL),
 ('00000000-0000-4000-8000-00000000c0c0','ag-c@example.invalid','C','00000000-0000-4000-8000-00000000a0a0'),
 ('00000000-0000-4000-8000-00000000d0d0','ag-d@example.invalid','D','00000000-0000-4000-8000-00000000a0a0'),
 ('00000000-0000-4000-8000-0000000000cc','ag-k@example.invalid','K','00000000-0000-4000-8000-00000000b0b0'),
 ('00000000-0000-4000-8000-00000000f0f0','ag-x@example.invalid','X',NULL),
 ('00000000-0000-4000-8000-000000000a0a','ag-n@example.invalid','N',NULL),
 ('00000000-0000-4000-8000-0000000000aa','ag-n@example.invalid','G (Ghost)','00000000-0000-4000-8000-00000000a0a0');
INSERT INTO user_roles(user_id, role) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','provider'),('00000000-0000-4000-8000-00000000b0b0','provider'),
 ('00000000-0000-4000-8000-00000000e0e0','employee'),('00000000-0000-4000-8000-00000000f1f1','employee'),
 ('00000000-0000-4000-8000-00000000c0c0','client'),('00000000-0000-4000-8000-00000000d0d0','client'),
 ('00000000-0000-4000-8000-0000000000cc','client'),('00000000-0000-4000-8000-00000000f0f0','admin')
ON CONFLICT DO NOTHING;
INSERT INTO product_entitlements(user_id,product,plan,status)
SELECT u, 'HUFMANAGER','HUFMANAGER_SLIM','ACTIVE'
FROM unnest(ARRAY['00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000b0b0']::uuid[]) u;
INSERT INTO employee_profiles(provider_id, user_id, full_name, status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000e0e0','E','active'),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-00000000f1f1','F','active');
INSERT INTO access_grants(provider_id, client_id, is_active, status, revoked_at) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000c0c0',true,'active',NULL),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-0000000000cc',true,'active',NULL),
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000d0d0',false,'ended',now() - interval '60 days'),
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000000aa',true,'active',NULL);
INSERT INTO horses(id, owner_id, name, deleted_at) VALUES
 ('00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0','HC',NULL),
 ('00000000-0000-4000-8000-0000000004c2','00000000-0000-4000-8000-00000000c0c0','HC2',NULL),
 ('00000000-0000-4000-8000-0000000004cc','00000000-0000-4000-8000-0000000000cc','HK',NULL),
 ('00000000-0000-4000-8000-0000000004d1','00000000-0000-4000-8000-00000000d0d0','HD',NULL),
 ('00000000-0000-4000-8000-0000000004aa','00000000-0000-4000-8000-0000000000aa','HG',NULL),
 ('00000000-0000-4000-8000-0000000004de','00000000-0000-4000-8000-00000000c0c0','HDEL',now());
INSERT INTO organizations(id, name, owner_id) VALUES
 ('00000000-0000-4000-8000-0000000009a0','O_A','00000000-0000-4000-8000-00000000a0a0'),
 ('00000000-0000-4000-8000-0000000009b0','O_B','00000000-0000-4000-8000-00000000b0b0');
-- Altbestand (vor der Migration angelegt):
--  L1 = A-Termin an HD (Grant beendet, wie 134 PROD-Alttermine) · L2 = A-Termin an HC
--  LG = A-Termin an Ghost G · LX = inkonsistenter Alttermin (client_id=G, Pferd HC)
INSERT INTO appointments(id, provider_id, horse_id, client_id, date, status) VALUES
 ('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004d1',NULL,current_date+7,'planned'),
 ('00000000-0000-4000-8000-0000000007a2','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0',current_date+7,'planned'),
 ('00000000-0000-4000-8000-0000000007a3','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004aa','00000000-0000-4000-8000-0000000000aa',current_date+7,'planned'),
 ('00000000-0000-4000-8000-0000000007a4','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000000aa',current_date-30,'completed');
UPDATE appointments SET assigned_to_user_id='00000000-0000-4000-8000-00000000e0e0' WHERE id='00000000-0000-4000-8000-0000000007a1';
CREATE TEMP TABLE pre AS SELECT (SELECT count(*) FROM appointments) appt,
  (SELECT md5(string_agg(to_jsonb(a)::text, '' ORDER BY id)) FROM appointments a) appt_md5;

\i :mig_body

INSERT INTO r SELECT 'M0 migration does not touch rows', appt=(SELECT count(*) FROM appointments)
  AND appt_md5=(SELECT md5(string_agg(to_jsonb(a)::text, '' ORDER BY id)) FROM appointments a), '' FROM pre;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN u IS NULL THEN '' ELSE json_build_object('sub',u,'role','authenticated')::text END, true);
$$;

-- Prüf-Helfer: führt SQL aus, erwartet Erfolg (want_ok) oder 42501 mit Textpräfix
CREATE OR REPLACE FUNCTION pg_temp.chk(name text, stmt text, want_ok boolean, want_msg text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  INSERT INTO r VALUES (name, want_ok, CASE WHEN want_ok THEN '' ELSE 'unexpectedly succeeded' END);
EXCEPTION WHEN others THEN
  INSERT INTO r VALUES (name, (NOT want_ok) AND (want_msg IS NULL OR SQLERRM LIKE want_msg || '%'), SQLSTATE || ' ' || SQLERRM);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.chk(text,text,boolean,text) TO PUBLIC;

-- ── Provider A über RLS (authenticated) ─────────────────────────────────────
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000a0a0'); SET LOCAL ROLE authenticated;
SELECT pg_temp.chk('T01 own client with grant -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0',current_date+1)$q$, true);
SELECT pg_temp.chk('T02 own client with grant, client_id empty -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c2',current_date+1)$q$, true);
SELECT pg_temp.chk('T03 own ghost client (no auth user) with grant -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004aa','00000000-0000-4000-8000-0000000000aa',current_date+1)$q$, true);
SELECT pg_temp.chk('T04 created_by A but grant ended (like the 4 PROD clients) -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004d1','00000000-0000-4000-8000-00000000d0d0',current_date+1)$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T05 provider A -> client K of B -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004cc','00000000-0000-4000-8000-0000000000cc',current_date+1)$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T06 provider A -> horse of B without client_id -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004cc',current_date+1)$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T07 horse does not match client -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000000aa',current_date+1)$q$, false, 'Pferd gehört nicht zu diesem Kunden');
SELECT pg_temp.chk('T08 own client horse + foreign client_id -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000000cc',current_date+1)$q$, false, 'Pferd gehört nicht zu diesem Kunden');
SELECT pg_temp.chk('T09 soft-deleted horse -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004de',current_date+1)$q$, false, 'Pferd wurde gelöscht');
SELECT pg_temp.chk('T10 assigned to own employee E -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,assigned_to_user_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000e0e0',current_date+2)$q$, true);
SELECT pg_temp.chk('T11 assigned to foreign employee F -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,assigned_to_user_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000f1f1',current_date+2)$q$, false, 'Mitarbeiter gehört nicht');
SELECT pg_temp.chk('T12 own organization -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,organization_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000009a0',current_date+2)$q$, true);
SELECT pg_temp.chk('T13 foreign organization -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,organization_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000009b0',current_date+2)$q$, false, 'Organisation gehört nicht');
-- Alttermine
SELECT pg_temp.chk('T14 legacy appt without grant: date/time/notes/status editable',
  $q$UPDATE appointments SET date=current_date+9, time='09:00', notes='verschoben', status='confirmed' WHERE id='00000000-0000-4000-8000-0000000007a1'$q$, true);
INSERT INTO r SELECT 'T14b legacy edit really applied', notes='verschoben', '' FROM appointments WHERE id='00000000-0000-4000-8000-0000000007a1';
SELECT pg_temp.chk('T15 legacy appt: bend horse+client to foreign data -> rejected',
  $q$UPDATE appointments SET horse_id='00000000-0000-4000-8000-0000000004cc', client_id='00000000-0000-4000-8000-0000000000cc' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T15b legacy appt: bend only horse to foreign horse -> rejected',
  $q$UPDATE appointments SET horse_id='00000000-0000-4000-8000-0000000004cc' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, false);
SELECT pg_temp.chk('T16 legacy appt: bend client_id to foreign client -> rejected',
  $q$UPDATE appointments SET client_id='00000000-0000-4000-8000-0000000000cc' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, false, 'Pferd gehört nicht zu diesem Kunden');
SELECT pg_temp.chk('T17 legacy appt without grant: change horse to own granted horse -> allowed',
  $q$UPDATE appointments SET horse_id='00000000-0000-4000-8000-0000000004c2' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, true);
SELECT pg_temp.chk('T18 legacy appt without grant: re-set same horse (no change) -> allowed',
  $q$UPDATE appointments SET horse_id=horse_id, notes='touch' WHERE id='00000000-0000-4000-8000-0000000007a1'$q$, true);
SELECT pg_temp.chk('T19 inconsistent legacy appt: status-only edit allowed',
  $q$UPDATE appointments SET notes='alt' WHERE id='00000000-0000-4000-8000-0000000007a4'$q$, true);
SELECT pg_temp.chk('T20 end user cannot move client_id on inconsistent legacy appt',
  $q$UPDATE appointments SET client_id='00000000-0000-4000-8000-0000000000cc' WHERE id='00000000-0000-4000-8000-0000000007a4'$q$, false, 'Pferd gehört nicht zu diesem Kunden');
RESET ROLE;

-- ── Mitarbeiter (simulierter SECURITY-DEFINER-Pfad: RLS aus, auth.uid() = Mitarbeiter) ──
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000e0e0');
SELECT pg_temp.chk('T21 employee E acts for own provider A -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1',current_date+3)$q$, true);
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000f1f1');
SELECT pg_temp.chk('T22 employee F of B acts for provider A -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1',current_date+3)$q$, false, 'Keine Berechtigung');
SELECT pg_temp.chk('T23 employee F cannot re-assign A appt to himself',
  $q$UPDATE appointments SET assigned_to_user_id='00000000-0000-4000-8000-00000000f1f1' WHERE id='00000000-0000-4000-8000-0000000007a1'$q$, false, 'Keine Berechtigung');
SELECT pg_temp.chk('T24 un-assigning (FK SET NULL path) by any actor stays possible',
  $q$UPDATE appointments SET assigned_to_user_id=NULL WHERE id='00000000-0000-4000-8000-0000000007a1'$q$, true);
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000c0c0');
SELECT pg_temp.chk('T25 client C (horse owner) cannot create appt for provider A',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1',current_date+3)$q$, false, 'Keine Berechtigung');
SELECT pg_temp.chk('T26 client C may still confirm (status-only) an A appt',
  $q$UPDATE appointments SET status='confirmed' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, true);

-- ── Admin ───────────────────────────────────────────────────────────────────
SELECT pg_temp.as_user('00000000-0000-4000-8000-00000000f0f0'); SET LOCAL ROLE authenticated;
SELECT pg_temp.chk('T27 admin may create appt for A without grant',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004d1',current_date+4)$q$, true);
SELECT pg_temp.chk('T28 admin still cannot mismatch horse and client',
  $q$INSERT INTO appointments(provider_id,horse_id,client_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-0000000000cc',current_date+4)$q$, false, 'Pferd gehört nicht zu diesem Kunden');
RESET ROLE;

-- ── Backend ohne Endnutzer (service_role: hufi-agent, Seeds, RPCs) ────────────
SELECT pg_temp.as_user(NULL); SET LOCAL ROLE service_role;
SELECT pg_temp.chk('T29 service_role: A + foreign horse (hufi-agent path) -> rejected',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004cc',current_date+5)$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T30 service_role: A + own horse -> allowed',
  $q$INSERT INTO appointments(provider_id,horse_id,date) VALUES ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1',current_date+5)$q$, true);
SELECT pg_temp.chk('T31 service_role: move A appt to provider B -> rejected',
  $q$UPDATE appointments SET provider_id='00000000-0000-4000-8000-00000000b0b0' WHERE id='00000000-0000-4000-8000-0000000007a2'$q$, false, 'Kunde/Pferd gehört nicht');
SELECT pg_temp.chk('T32 service_role: status-only update on legacy appt -> allowed',
  $q$UPDATE appointments SET status='cancelled' WHERE id='00000000-0000-4000-8000-0000000007a1'$q$, true);
-- Ghost-Merge wie handle_new_user / create_invited_customer_with_contact (Reihenfolge wörtlich)
SELECT pg_temp.chk('T33 ghost merge G -> N (horses, appointments, grants) passes',
  $q$UPDATE horses SET owner_id='00000000-0000-4000-8000-000000000a0a' WHERE owner_id='00000000-0000-4000-8000-0000000000aa';
     UPDATE appointments SET client_id='00000000-0000-4000-8000-000000000a0a' WHERE client_id='00000000-0000-4000-8000-0000000000aa';
     UPDATE access_grants SET client_id='00000000-0000-4000-8000-000000000a0a' WHERE client_id='00000000-0000-4000-8000-0000000000aa'$q$, true);
INSERT INTO r SELECT 'T33b ghost merge moved all appointments incl. inconsistent legacy one',
  count(*) = 0, count(*)::text FROM appointments WHERE client_id='00000000-0000-4000-8000-0000000000aa';
RESET ROLE;

-- ── Sicherheit der Funktion selbst ──────────────────────────────────────────
INSERT INTO r SELECT 'S1 guard fn not executable by anon/authenticated',
  CASE WHEN to_regprocedure('public.hm_guard_appointment_relations_v1()') IS NULL THEN false ELSE
  NOT has_function_privilege('anon','public.hm_guard_appointment_relations_v1()','execute')
  AND NOT has_function_privilege('authenticated','public.hm_guard_appointment_relations_v1()','execute') END, '';
INSERT INTO r SELECT 'S2 guard fn is SECURITY DEFINER with fixed search_path',
  coalesce((SELECT prosecdef AND proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE oid = to_regprocedure('public.hm_guard_appointment_relations_v1()')), false), '';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END res, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
