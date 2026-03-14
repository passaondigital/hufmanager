
-- Fix infinite recursion in "Providers can update connected profiles" policy.
-- The WITH CHECK clause was querying profiles within a profiles policy.
-- Solution: Use a SECURITY DEFINER function to check protected fields haven't changed.

CREATE OR REPLACE FUNCTION public.check_provider_profile_update_allowed(
  _profile_id uuid,
  _new_subscription_plan text,
  _new_subscription_status text,
  _new_force_password_reset boolean,
  _new_is_suspended boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (p.subscription_plan IS NOT DISTINCT FROM _new_subscription_plan)
    AND (p.subscription_status IS NOT DISTINCT FROM _new_subscription_status)
    AND (p.force_password_reset IS NOT DISTINCT FROM _new_force_password_reset)
    AND (p.is_suspended IS NOT DISTINCT FROM _new_is_suspended)
  FROM public.profiles p
  WHERE p.id = _profile_id;
$$;

-- Drop and recreate the policy without recursive subqueries
DROP POLICY IF EXISTS "Providers can update connected profiles" ON public.profiles;

CREATE POLICY "Providers can update connected profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM access_grants
    WHERE access_grants.client_id = profiles.id
      AND access_grants.provider_id = auth.uid()
      AND access_grants.status = 'active'
  )
)
WITH CHECK (
  public.check_provider_profile_update_allowed(
    id,
    subscription_plan,
    subscription_status,
    force_password_reset,
    is_suspended
  )
);
