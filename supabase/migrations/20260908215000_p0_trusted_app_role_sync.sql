-- P0 trusted-role compatibility for GoTrue admin user creation.
-- GoTrue may persist raw_app_meta_data after the auth.users INSERT trigger has
-- already assigned the safe public-signup default. Only app metadata (which
-- public callers cannot write) may synchronize privileged roles.

CREATE OR REPLACE FUNCTION public.sync_trusted_app_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trusted_role public.app_role;
BEGIN
  IF NEW.raw_app_meta_data->>'role' IS NOT DISTINCT FROM OLD.raw_app_meta_data->>'role' THEN
    RETURN NEW;
  END IF;

  IF NEW.raw_app_meta_data->>'role' NOT IN ('admin', 'employee', 'partner', 'provider', 'client') THEN
    RETURN NEW;
  END IF;

  trusted_role := (NEW.raw_app_meta_data->>'role')::public.app_role;

  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, trusted_role);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_trusted_app_role()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_sync_trusted_app_role ON auth.users;
CREATE TRIGGER trg_sync_trusted_app_role
AFTER UPDATE OF raw_app_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_trusted_app_role();
