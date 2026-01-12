-- Fix: Add WITH CHECK clause to the "Admins can manage all settings" policy
-- DROP the policy first and recreate with proper with_check for INSERT operations

DROP POLICY IF EXISTS "Admins can manage all settings" ON public.business_settings;

-- Recreate with proper with_check clause that allows admins to insert for any user
CREATE POLICY "Admins can manage all settings" 
ON public.business_settings
FOR ALL
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));