-- Live PROD migration: 20261023191719_hufmanager_close_anon_internal_health_demo_rpc_20261023
-- Scope: reduce the anonymous SEC DEFINER RPC attack surface.
-- Confirmed neither RPC is referenced by policies or other public/private functions;
-- no direct calls in the inspected 2026-10-12 frontend and Edge Functions snapshot.
-- The admin health dashboard and service-role anomaly detection retain execution.
-- NOTE: do not accidentally apply as a second new migration with a different version.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.get_demo_user_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_health_score_trend(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_demo_user_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_health_score_trend(integer) TO authenticated, service_role;
DO $safety$
DECLARE oid_target oid;
DECLARE func_signature text;
BEGIN
  FOR func_signature IN SELECT unnest(ARRAY[
   'public.get_demo_user_ids()',
   'public.get_health_score_trend(integer)'
  ]) LOOP
    oid_target := to_regprocedure(func_signature);
    IF oid_target IS NULL THEN
      RAISE EXCEPTION 'Missing function: %', func_signature;
    END IF;
    IF has_function_privilege('anon',oid_target,'EXECUTE') THEN
      RAISE EXCEPTION 'Anon still permitted: %', func_signature;
    END IF;
    IF NOT has_function_privilege('authenticated',oid_target,'EXECUTE')
       OR NOT has_function_privilege('service_role',oid_target,'EXECUTE') THEN
      RAISE EXCEPTION 'Legitimate executor removed: %', func_signature;
    END IF;
  END LOOP;
END $safety$;
COMMIT;
