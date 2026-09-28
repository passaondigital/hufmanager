-- Ghost-Grant-Fix (20260928090000): positive + negative Tests.
-- Aufruf (Wegwerf-DB mit scripts/access-grant-ghost-replica-schema.sql):
--   psql -v mig_body=supabase/migrations/20260928090000_fix_foreign_ghost_grant_v1.sql -f scripts/access-grant-ghost-tests.sql
-- Negativkontrolle: -v mig_body=/dev/null  (dann müssen die N-Tests FAIL sein)
-- Läuft in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
\i :mig_body
-- PROD: authenticated hat KEIN SELECT auf auth.users -> jede direkte Grant-Schreibung per REST scheitert
-- heute zufällig an den Policies (42501). Mit -v open_auth=1 wird diese Barriere entfernt, damit die
-- Trigger-Logik allein geprüft wird (Szenario: Policy/Rechte werden später geändert).
\if :{?open_auth}
GRANT SELECT ON auth.users TO authenticated;
\endif
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO PUBLIC;

-- A, B = Provider · CA = echter Kunde von A (aktiv) · RB = echter Kunde von B (aktiv)
-- GA = Ghost von A (aktiv) · GA2 = Ghost von A ohne Grant · GA3 = Ghost von A, Grant beendet
-- GB = Ghost von B (aktiv) · GN = Ghost ohne Ersteller (Rolle client) · X = Mitarbeiter (kein Provider)
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-00000000000a','a@x.invalid'),('00000000-0000-4000-8000-00000000000b','b@x.invalid'),
 ('00000000-0000-4000-8000-0000000000ca','ca@x.invalid'),('00000000-0000-4000-8000-0000000000cb','rb@x.invalid'),
 ('00000000-0000-4000-8000-0000000000ee','x@x.invalid');
INSERT INTO profiles (id, email, created_by_provider_id) VALUES
 ('00000000-0000-4000-8000-00000000000a','a@x.invalid',NULL),
 ('00000000-0000-4000-8000-00000000000b','b@x.invalid',NULL),
 ('00000000-0000-4000-8000-0000000000ca','ca@x.invalid','00000000-0000-4000-8000-00000000000a'),
 ('00000000-0000-4000-8000-0000000000cb','rb@x.invalid','00000000-0000-4000-8000-00000000000b'),
 ('00000000-0000-4000-8000-0000000000ee','x@x.invalid',NULL),
 ('00000000-0000-4000-8000-0000000001a1','ga@x.invalid','00000000-0000-4000-8000-00000000000a'),
 ('00000000-0000-4000-8000-0000000001a2','ga2@x.invalid','00000000-0000-4000-8000-00000000000a'),
 ('00000000-0000-4000-8000-0000000001a3','ga3@x.invalid','00000000-0000-4000-8000-00000000000a'),
 ('00000000-0000-4000-8000-0000000001b1','gb@x.invalid','00000000-0000-4000-8000-00000000000b'),
 ('00000000-0000-4000-8000-0000000001c1','gn@x.invalid',NULL);
INSERT INTO user_roles(user_id, role) VALUES
 ('00000000-0000-4000-8000-00000000000a','provider'),('00000000-0000-4000-8000-00000000000b','provider'),
 ('00000000-0000-4000-8000-0000000000ca','client'),('00000000-0000-4000-8000-0000000000cb','client'),
 ('00000000-0000-4000-8000-0000000000ee','employee'),('00000000-0000-4000-8000-0000000001c1','client');
-- Bestands-Grants als Superuser (ohne auth.uid)
INSERT INTO access_grants (id, provider_id, client_id, is_active, status) VALUES
 ('10000000-0000-4000-8000-0000000000ca','00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000000ca',true,'active'),
 ('10000000-0000-4000-8000-0000000000cb','00000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-0000000000cb',true,'active'),
 ('10000000-0000-4000-8000-0000000001a1','00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001a1',true,'active'),
 ('10000000-0000-4000-8000-0000000001a3','00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001a3',false,'ended'),
 ('10000000-0000-4000-8000-0000000001b1','00000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-0000000001b1',true,'active'),
 ('10000000-0000-4000-8000-0000000000bc','00000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-0000000000ca',false,'pending');

-- t(name, uid, sql, expect): 'ok' = kein Fehler und >=1 Zeile; 'deny' = Fehler oder 0 Zeilen.
-- Jeder Test läuft in eigener Subtransaktion und wird danach zurückgerollt.
CREATE FUNCTION pg_temp.t(p_name text, p_uid uuid, p_sql text, p_expect text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint; outcome text; msg text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', coalesce(json_build_object('sub', p_uid, 'role', 'authenticated')::text, ''), true);
    IF p_uid IS NOT NULL THEN EXECUTE 'SET LOCAL ROLE authenticated'; END IF;
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    outcome := CASE WHEN n > 0 THEN 'ok' ELSE 'deny' END; msg := n || ' rows';
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__rollback__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> '__rollback__' THEN outcome := 'deny'; msg := SQLERRM; END IF;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO r VALUES (p_name, outcome = p_expect, outcome || ': ' || msg);
END $$;

\set A '''00000000-0000-4000-8000-00000000000a'''
\set B '''00000000-0000-4000-8000-00000000000b'''
\set X '''00000000-0000-4000-8000-0000000000ee'''
\set CA '''00000000-0000-4000-8000-0000000000ca'''
\set RB '''00000000-0000-4000-8000-0000000000cb'''

-- Positiv (Betriebsalltag darf nicht brechen)
SELECT pg_temp.t('P1 A verbindet eigenen Ghost GA2 aktiv', :A,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001a2')$q$, 'ok');
SELECT pg_temp.t('P2 A reaktiviert beendeten Grant eigener Ghost GA3', :A,
 $q$UPDATE access_grants SET is_active=true, status='active' WHERE id='10000000-0000-4000-8000-0000000001a3'$q$, 'ok');
SELECT pg_temp.t('P3 A beendet Grant eigener Ghost GA', :A,
 $q$UPDATE access_grants SET is_active=false, status='revoked', revoked_at=now() WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'ok');
SELECT pg_temp.t('P4 A ändert Rechte eigener Ghost GA', :A,
 $q$UPDATE access_grants SET can_create_appointments=false WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'ok');
SELECT pg_temp.t('P5 A beendet Grant echter Kunde CA', :A,
 $q$UPDATE access_grants SET is_active=false, status='revoked' WHERE id='10000000-0000-4000-8000-0000000000ca'$q$, 'ok');
SELECT pg_temp.t('P6 A Verbindungsanfrage (pending) an echten Kunden RB', :A,
 $q$INSERT INTO access_grants(provider_id, client_id, is_active, status, can_view_medical) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000000cb',false,'pending',false)$q$, 'ok');
SELECT pg_temp.t('P7 Kunde RB verbindet sich selbst mit A', :RB,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000000cb')$q$, 'ok');
SELECT pg_temp.t('P8 Serverpfad ohne Nutzer (Service/Invite-RPC)', NULL,
 $q$UPDATE access_grants SET client_id='00000000-0000-4000-8000-0000000001a2' WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'ok');
SELECT pg_temp.t('P9 B ändert Rechte eigener Ghost GB', :B,
 $q$UPDATE access_grants SET can_view_medical=false WHERE id='10000000-0000-4000-8000-0000000001b1'$q$, 'ok');

-- Negativ (Lücke)
SELECT pg_temp.t('N1 A verbindet fremden Ghost GB aktiv', :A,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001b1')$q$, 'deny');
SELECT pg_temp.t('N2 A legt pending-Grant an fremden Ghost GB an', :A,
 $q$INSERT INTO access_grants(provider_id, client_id, is_active, status, can_view_medical) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001b1',false,'pending',false)$q$, 'deny');
SELECT pg_temp.t('N3 A verbindet Ghost ohne Ersteller GN', :A,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000001c1')$q$, 'deny');
SELECT pg_temp.t('N4 A biegt eigenen aktiven Grant auf fremden Ghost GB um', :A,
 $q$UPDATE access_grants SET client_id='00000000-0000-4000-8000-0000000001b1' WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'deny');
SELECT pg_temp.t('N5 A biegt eigenen aktiven Grant auf echten Kunden RB um', :A,
 $q$UPDATE access_grants SET client_id='00000000-0000-4000-8000-0000000000cb' WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'deny');
SELECT pg_temp.t('N6 A biegt eigenen aktiven Grant auf Ghost ohne Ersteller GN um', :A,
 $q$UPDATE access_grants SET client_id='00000000-0000-4000-8000-0000000001c1' WHERE id='10000000-0000-4000-8000-0000000001a1'$q$, 'deny');
SELECT pg_temp.t('N7 A biegt beendeten Grant auf fremden Ghost GB um + aktiviert', :A,
 $q$UPDATE access_grants SET client_id='00000000-0000-4000-8000-0000000001b1', is_active=true, status='active' WHERE id='10000000-0000-4000-8000-0000000001a3'$q$, 'deny');
SELECT pg_temp.t('N8 A verbindet echten fremden Kunden RB aktiv', :A,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000000cb')$q$, 'deny');
SELECT pg_temp.t('N9 A übernimmt Grant von B (provider_id)', :A,
 $q$UPDATE access_grants SET provider_id='00000000-0000-4000-8000-00000000000a' WHERE id='10000000-0000-4000-8000-0000000001b1'$q$, 'deny');
SELECT pg_temp.t('N10 Mitarbeiter X verbindet fremden Ghost GB', :X,
 $q$INSERT INTO access_grants(provider_id, client_id) VALUES ('00000000-0000-4000-8000-0000000000ee','00000000-0000-4000-8000-0000000001b1')$q$, 'deny');
SELECT pg_temp.t('N11 B aktiviert eigene pending-Anfrage an echten Kunden CA', :B,
 $q$UPDATE access_grants SET is_active=true, status='active' WHERE id='10000000-0000-4000-8000-0000000000bc'$q$, 'deny');

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
