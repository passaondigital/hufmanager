-- 1) Fix data: remove invalid access_grant where a provider was linked as a client
DELETE FROM public.access_grants
WHERE id = 'd15a0797-6281-4f16-b0b2-77687f7d8bef';

-- 2) Prevent future bad links: enforce role correctness on access_grants
CREATE OR REPLACE FUNCTION public.validate_access_grant_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_role public.app_role;
  v_provider_role public.app_role;
BEGIN
  v_client_role := public.get_user_role(NEW.client_id);
  v_provider_role := public.get_user_role(NEW.provider_id);

  IF v_client_role IS NULL THEN
    RAISE EXCEPTION 'access_grants: client_id has no role assigned';
  END IF;

  IF v_provider_role IS NULL THEN
    RAISE EXCEPTION 'access_grants: provider_id has no role assigned';
  END IF;

  IF v_client_role <> 'client'::public.app_role THEN
    RAISE EXCEPTION 'access_grants: client_id must have role client (got %)', v_client_role;
  END IF;

  IF v_provider_role <> 'provider'::public.app_role THEN
    RAISE EXCEPTION 'access_grants: provider_id must have role provider (got %)', v_provider_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_access_grant_roles ON public.access_grants;
CREATE TRIGGER trg_validate_access_grant_roles
BEFORE INSERT OR UPDATE ON public.access_grants
FOR EACH ROW
EXECUTE FUNCTION public.validate_access_grant_roles();
