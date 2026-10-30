#!/usr/bin/env bash
set -euo pipefail
exec 9>/dev/shm/hm-employee-rls-qa.lock
flock -n 9 || { echo 'QA=BLOCKED parallel-run'; exit 73; }
name="hm-qa-emp-$$"
image="supabase/postgres:17.6.1.054"
cleanup(){ rc=$?; trap - EXIT INT TERM HUP; docker rm -f "$name" >/dev/null 2>&1 || true; echo "QA_CLEANUP=PASS exit=$rc"; exit "$rc"; }
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
[[ "$(stat -f -c %T /dev/shm)" == tmpfs ]] || exit 9
docker image inspect "$image" >/dev/null 2>&1 || { echo 'QA_BLOCKED_IMAGE_MISSING'; exit 2; }
docker run -d --name "$name" --network none --pull never --log-driver none --memory 512m --memory-swap 512m --cpus 1 --user postgres --tmpfs /var/lib/postgresql/data:rw,size=256m --entrypoint bash "$image" -c 'export PGDATA=/var/lib/postgresql/data/pgdata; initdb -A trust >/dev/null; exec postgres -D "$PGDATA" -c listen_addresses=' >/dev/null
ready=0
for _ in $(seq 1 45); do if docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi; sleep 1; done
[[ "$ready" == 1 ]] || { echo 'QA_DB_UNAVAILABLE'; exit 1; }
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <<'QA_SQL'
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$f$;
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $f$
 SELECT p_user_id = '33333333-3333-4333-8333-333333333333'::uuid;
$f$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), public.is_admin(uuid) TO anon,authenticated;
CREATE TABLE public.employee_profiles (
 id uuid PRIMARY KEY, user_id uuid NOT NULL,status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.employee_profiles (id,user_id,status)
 VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','active');
-- Proposed safe body; exact current structure plus SQL-current-caller authorization.
CREATE OR REPLACE FUNCTION public.get_employee_profile_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
 SELECT id FROM public.employee_profiles
 WHERE user_id=_user_id AND status='active'
   AND (
     auth.uid() = _user_id
     OR public.is_admin(auth.uid())
   )
 ORDER BY created_at DESC LIMIT 1;
$f$;
GRANT EXECUTE ON FUNCTION public.get_employee_profile_id(uuid) TO anon,authenticated;
CREATE TABLE public.employee_assignments (id uuid PRIMARY KEY,employee_id uuid NOT NULL);
INSERT INTO public.employee_assignments VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY employees_see_own ON public.employee_assignments
FOR SELECT TO public USING (employee_id=public.get_employee_profile_id(auth.uid()));
GRANT SELECT ON public.employee_assignments TO anon,authenticated;

SET ROLE anon;
SET request.jwt.claim.sub = '';
DO $f$ BEGIN
 IF public.get_employee_profile_id('11111111-1111-4111-8111-111111111111') IS NOT NULL
 THEN RAISE EXCEPTION 'anon can read employee-id mapping'; END IF;
END $f$;
DO $f$ BEGIN IF (SELECT count(*) FROM public.employee_assignments) <> 0 THEN RAISE EXCEPTION 'ANON_RLS count mismatch'; END IF; END $f$;
SELECT 'ANON_RLS=PASS';
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $f$ BEGIN
 IF public.get_employee_profile_id('11111111-1111-4111-8111-111111111111') IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
 THEN RAISE EXCEPTION 'owner mapping denied'; END IF;
 IF public.get_employee_profile_id('22222222-2222-4222-8222-222222222222') IS NOT NULL
 THEN RAISE EXCEPTION 'cross-user mapping leaked'; END IF;
END $f$;
DO $f$ BEGIN IF (SELECT count(*) FROM public.employee_assignments) <> 1 THEN RAISE EXCEPTION 'OWNER_RLS count mismatch'; END IF; END $f$;
SELECT 'OWNER_RLS=PASS';
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $f$ BEGIN IF (SELECT count(*) FROM public.employee_assignments) <> 1 THEN RAISE EXCEPTION 'SECOND_TENANT_RLS count mismatch'; END IF; END $f$;
SELECT 'SECOND_TENANT_RLS=PASS';
DO $f$ BEGIN
 IF public.get_employee_profile_id('11111111-1111-4111-8111-111111111111') IS NOT NULL
 THEN RAISE EXCEPTION 'cross-user leak to second tenant'; END IF;
END $f$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
DO $f$ BEGIN
 IF public.get_employee_profile_id('22222222-2222-4222-8222-222222222222') IS DISTINCT FROM 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
 THEN RAISE EXCEPTION 'admin mapping denied'; END IF;
END $f$;
RESET ROLE;
SELECT 'EMPLOYEE_ID_GUARD_SYNTHETIC=PASS';
QA_SQL
echo 'EMPLOYEE_PROFILE_GUARD_QA=PASS';