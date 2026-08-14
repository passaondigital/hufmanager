-- P0 SELF-GRANT SECURITY FIX
-- 1. Tighten Providers can create access grants policy to disallow direct ACTIVE grant insertion for real auth clients
-- 2. Tighten Providers can update grants policy to disallow changing status to active/is_active to true for real auth clients and disallow medical permission escalation
-- 3. Add explicit trigger guard enforce_access_grant_security() for defense-in-depth

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

DROP TRIGGER IF EXISTS trg_enforce_access_grant_security ON public.access_grants;
CREATE TRIGGER trg_enforce_access_grant_security
BEFORE INSERT OR UPDATE ON public.access_grants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_access_grant_security();

-- Update RLS policies on access_grants for Providers
DROP POLICY IF EXISTS "Providers can create access grants" ON public.access_grants;
CREATE POLICY "Providers can create access grants"
ON public.access_grants FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::public.app_role)
  AND auth.uid() = provider_id
  AND (
    -- Can insert active grant ONLY if client is a ghost customer (no auth.users record)
    (NOT EXISTS (SELECT 1 FROM auth.users WHERE id = client_id))
    OR
    -- For real auth clients, can ONLY insert pending non-active grant
    (is_active = false AND (status IS NULL OR status = 'pending') AND can_view_medical = false)
  )
);

DROP POLICY IF EXISTS "Providers can update grants" ON public.access_grants;
CREATE POLICY "Providers can update grants"
ON public.access_grants FOR UPDATE
TO authenticated
USING (auth.uid() = provider_id)
WITH CHECK (
  auth.uid() = provider_id
  AND (
    -- If client is ghost customer, standard provider updates are allowed
    (NOT EXISTS (SELECT 1 FROM auth.users WHERE id = client_id))
    OR
    (
      -- Revoking / deactivating is allowed for provider
      (is_active = false OR status IN ('revoked', 'rejected', 'cancelled'))
      AND
      -- Cannot set medical permission to true for real client
      can_view_medical = false
    )
  )
);
