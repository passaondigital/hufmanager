-- Applied to Supabase PROD on 2026-10-23 as migration 20261023192453.
-- check_storage_quota is SECURITY DEFINER and reads storage usage data for
-- arbitrary entity IDs without requiring a caller authorization in its body.
-- This change prevents anonymous access. Authenticated cross-tenant caller
-- checks still need a separate body-level patch and test.
-- UI: src/hooks/useStorageQuota.tsx calls this only for signed-in users.
-- No policy or other database function depended on its direct execution.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.check_storage_quota(text,uuid,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_storage_quota(text,uuid,bigint) TO authenticated, service_role;
DO $assert$
BEGIN
 IF has_function_privilege('anon','public.check_storage_quota(text,uuid,bigint)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.check_storage_quota(text,uuid,bigint)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.check_storage_quota(text,uuid,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'storage quota RPC grant check failed'; END IF;
END $assert$;
COMMIT;