-- Rollback 20260928090000_fix_foreign_ghost_grant_v1: PROD-Fassung vom 28.09.2026 (md5 pg_get_functiondef e037737adea6b2b2226d5b0edf713103)
BEGIN;
CREATE OR REPLACE FUNCTION public.enforce_access_grant_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_real_client boolean;
  v_caller_is_provider boolean;
BEGIN
  -- Determine if target client is a real Auth client (exists in auth.users)
  v_is_real_client := EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.client_id
  );

  v_caller_is_provider := (auth.uid() = NEW.provider_id) AND public.has_role(auth.uid(), 'provider'::public.app_role);

  -- Only enforce restrictions when provider is acting on real auth client grants
  IF v_caller_is_provider AND v_is_real_client THEN
    IF TG_OP = 'INSERT' THEN
      -- Provider cannot insert an ACTIVE grant for a real Auth client
      IF NEW.is_active = true OR NEW.status = 'active' THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot unilaterally create active grants for real clients.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Provider cannot activate a pending/inactive grant for a real Auth client
      IF (OLD.is_active = false OR OLD.status <> 'active') AND (NEW.is_active = true OR NEW.status = 'active') THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot activate access grants for real clients.';
      END IF;

      -- Provider cannot escalate can_view_medical permission without client authorization
      IF OLD.can_view_medical = false AND NEW.can_view_medical = true THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot grant themselves medical permissions for real clients.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.enforce_access_grant_security() TO PUBLIC, anon, authenticated;
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260928090000';
COMMIT;
