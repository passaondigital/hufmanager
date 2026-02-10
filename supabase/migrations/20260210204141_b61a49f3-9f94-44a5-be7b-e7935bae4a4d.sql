-- Allow unauthenticated users to read employee profile by invitation_token
-- This is needed for the employee invite acceptance flow
CREATE POLICY "Anyone can view by invitation_token"
ON public.employee_profiles
FOR SELECT
TO anon, authenticated
USING (
  invitation_token IS NOT NULL
  AND invitation_accepted_at IS NULL
);