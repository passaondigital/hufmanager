-- Applied to PROD Supabase as 20261023 HufManager security migration.
-- Root issue: get_employee_profile_id(_user_id) was SECURITY DEFINER and
-- returned an arbitrary employee profile's id to any caller knowing a user UUID.
-- The function is called by EIGHT RLS policies as get_employee_profile_id(auth.uid()).
-- Therefore retain anon EXECUTE and return NULL for unrelated users rather
-- than revoking EXECUTE and breaking anonymous RLS queries.
--
-- Synthetic QA on XXL: anon null; tenant A owns A; tenant B owns B; A/B
-- cross-tenant NULL; admin can query; RLS scope 1 each. Exit 0.
BEGIN;
DO $preflight$
DECLARE current_code text;
BEGIN
 current_code:=pg_get_functiondef('public.get_employee_profile_id(uuid)'::regprocedure);
 IF current_code NOT LIKE '%FROM public.employee_profiles%'
   OR current_code NOT LIKE '%WHERE user_id = _user_id%'
   OR current_code LIKE '%OR public.is_admin(auth.uid())%' THEN
  RAISE EXCEPTION 'Existing employee helper differs; do not auto-replace';
 END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.get_employee_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
 SELECT id
 FROM public.employee_profiles
 WHERE user_id = _user_id
   AND status = 'active'
   AND (
      auth.uid() = _user_id
      OR public.is_admin(auth.uid())
   )
 ORDER BY created_at DESC
 LIMIT 1;
$function$;

DO $postflight$
DECLARE x oid := 'public.get_employee_profile_id(uuid)'::regprocedure;
BEGIN
 IF NOT has_function_privilege('anon',x,'EXECUTE')
   OR NOT has_function_privilege('authenticated',x,'EXECUTE')
   OR NOT has_function_privilege('service_role',x,'EXECUTE') THEN
  RAISE EXCEPTION 'Employee helper grant regression';
 END IF;
 IF strpos(pg_get_functiondef(x),'auth.uid() = _user_id')=0
    OR strpos(pg_get_functiondef(x),'public.is_admin(auth.uid())')=0 THEN
  RAISE EXCEPTION 'Employee helper guard missing';
 END IF;
END $postflight$;
COMMIT;