-- Read-only privilege regression. No sensitive rows or live RPCs accessed.
SELECT p.proname,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('get_demo_user_ids','get_health_score_trend')
ORDER BY p.proname;

DO $assert$
DECLARE proc oid;
DECLARE sig text;
BEGIN
  FOR sig IN SELECT unnest(ARRAY[
   'public.get_demo_user_ids()','public.get_health_score_trend(integer)'
  ]) LOOP
    proc := to_regprocedure(sig);
    IF proc IS NULL
      OR has_function_privilege('anon',proc,'EXECUTE')
      OR NOT has_function_privilege('authenticated',proc,'EXECUTE')
      OR NOT has_function_privilege('service_role',proc,'EXECUTE') THEN
      RAISE EXCEPTION 'Anonymous RPC privilege regression: %',sig;
    END IF;
  END LOOP;
  RAISE NOTICE 'INTERNAL_RPC_ANON_GATE=PASS';
END $assert$;
