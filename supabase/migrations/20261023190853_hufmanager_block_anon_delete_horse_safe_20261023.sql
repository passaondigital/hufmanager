-- HufManagerOS P0: anonymous SECURITY DEFINER delete_horse_safe privilege
-- Applied to Supabase PROD (vnschgjxkzzwzefqlrji) on 2026-10-23.
-- Supabase registered migration version: 20261023190853
--
-- Why: current function evaluates:
--   IF NOT (_owner_id = auth.uid() OR EXISTS (...) OR EXISTS (...)) THEN
-- Anonymous auth.uid() is NULL. If the EXISTS branches are false,
-- the expression becomes IF NULL and the exception is skipped.
-- The SECURITY DEFINER function can then soft-delete a horse and
-- cancel future appointments using its elevated privileges.
--
-- Compatibility: authenticated and service_role retain EXECUTE.
-- Never grant EXECUTE to PUBLIC or anon without also repairing the
-- function's NULL-unsafe authorization guard and testing with two tenants.
--
-- This migration is intentionally idempotent.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.delete_horse_safe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_horse_safe(uuid) TO authenticated, service_role;

DO $gate$
BEGIN
  IF has_function_privilege('anon', 'public.delete_horse_safe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P0: anon can still execute delete_horse_safe';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.delete_horse_safe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P0: authenticated lost required delete_horse_safe privilege';
  END IF;
END
$gate$;

COMMIT;
