-- HufManagerOS security regression: P0 RPC privilege gate.
-- Run with a privileged *read-only* database inspection connection.
-- Does NOT invoke delete_horse_safe and does NOT access customer rows.
DO $verify$
DECLARE
  fn_oid oid := 'public.delete_horse_safe(uuid)'::regprocedure;
  security_definer boolean;
BEGIN
  SELECT prosecdef INTO security_definer FROM pg_proc WHERE oid=fn_oid;
  IF security_definer IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Unexpected delete_horse_safe function configuration';
  END IF;
  IF has_function_privilege('anon',fn_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'P0 FAILED: anon can execute delete_horse_safe';
  END IF;
  IF NOT has_function_privilege('authenticated',fn_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated lost legitimate execution permission';
  END IF;
  IF NOT has_function_privilege('service_role',fn_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role lost legitimate execution permission';
  END IF;
  RAISE NOTICE 'P0_DELETE_HORSE_SAFE_EXEC_GATE=PASS';
END
$verify$;
