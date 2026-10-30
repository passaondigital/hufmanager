-- Security regression for access-control RPCs (read-only catalog audit).
-- No business RPCs are called. Does not touch customer data.
DO $test$
DECLARE x oid;
BEGIN
  FOR x IN
    SELECT to_regprocedure(s) FROM unnest(ARRAY[
      'public.delete_horse_safe(uuid)',
      'public.get_demo_user_ids()',
      'public.get_health_score_trend(integer)',
      'public.check_storage_quota(text,uuid,bigint)'
    ]) AS s
  LOOP
    IF x IS NULL
       OR has_function_privilege('anon',x,'EXECUTE')
       OR NOT has_function_privilege('authenticated',x,'EXECUTE')
       OR NOT has_function_privilege('service_role',x,'EXECUTE')
    THEN
      RAISE EXCEPTION 'P0/P1 RPC privilege regression: %', x;
    END IF;
  END LOOP;
  RAISE NOTICE 'ANON_INTERNAL_RPC_RESTRICTIONS=PASS';
END $test$;
