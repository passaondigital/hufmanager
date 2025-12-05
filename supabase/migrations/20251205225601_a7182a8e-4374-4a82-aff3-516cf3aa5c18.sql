-- Drop the overly permissive policy that allows all providers to view all horses
DROP POLICY IF EXISTS "Providers can view all horses" ON public.horses;

-- Create a new restrictive policy: Providers can only view horses where they have:
-- 1. An active access_grant from the owner, OR
-- 2. An existing appointment with the horse
CREATE POLICY "Providers can view granted horses"
ON public.horses
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants 
      WHERE client_id = horses.owner_id 
      AND provider_id = auth.uid() 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE horse_id = horses.id 
      AND provider_id = auth.uid()
    )
  )
);