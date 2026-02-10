-- Fix infinite recursion: replace self-referencing RLS policy with a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.is_team_lead_for_provider(_user_id uuid, _provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles
    WHERE user_id = _user_id
      AND provider_id = _provider_id
      AND role = 'team_lead'
      AND status = 'active'
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Team leads can view team" ON public.employee_profiles;

-- Recreate it using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Team leads can view team"
ON public.employee_profiles
FOR SELECT
USING (
  public.is_team_lead_for_provider(auth.uid(), provider_id)
);