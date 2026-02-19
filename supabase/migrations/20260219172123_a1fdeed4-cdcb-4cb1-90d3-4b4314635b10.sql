
-- Create a SECURITY DEFINER helper function to get the current user's email
CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the broken policy that directly accesses auth.users
DROP POLICY IF EXISTS "Partners can view their own grants by email" ON public.access_grants;

-- Re-create using the SECURITY DEFINER helper
CREATE POLICY "Partners can view their own grants by email"
ON public.access_grants
FOR SELECT
USING (
  partner_email IS NOT NULL
  AND partner_email = public.auth_user_email()
);
