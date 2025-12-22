-- Launch blocker fix: simplify horses SELECT RLS for providers
-- Keep client SELECT policy intact; replace provider SELECT policies with a single clear policy.

-- Drop existing provider-related SELECT policies (and any legacy SELECT policy) on public.horses
DROP POLICY IF EXISTS "Professional sees client horses" ON public.horses;
DROP POLICY IF EXISTS "Providers can view horses for created clients" ON public.horses;
DROP POLICY IF EXISTS "Providers can view horses with active access" ON public.horses;
DROP POLICY IF EXISTS "Providers can view client horses" ON public.horses;

-- Create the new provider SELECT policy as requested (client horses visible regardless of who created the horse)
CREATE POLICY "Providers can view client horses"
ON public.horses
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL)
  AND has_role(auth.uid(), 'provider'::app_role)
  AND (
    -- provider connected via access_grants
    EXISTS (
      SELECT 1
      FROM public.access_grants ag
      WHERE ag.provider_id = auth.uid()
        AND ag.client_id = horses.owner_id
        AND COALESCE(ag.is_active, true) = true
    )
    OR
    -- provider created the client profile
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = horses.owner_id
        AND p.created_by_provider_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  )
);
