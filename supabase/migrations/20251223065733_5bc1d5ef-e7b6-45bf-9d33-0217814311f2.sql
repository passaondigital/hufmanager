-- Fix: Allow providers to soft-delete clients they are connected to via access_grants
DROP POLICY IF EXISTS "Providers can delete created profiles" ON public.profiles;

CREATE POLICY "Providers can delete connected profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND (
    -- Either created by this provider
    created_by_provider_id = auth.uid()
    -- Or connected via access_grant
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
  )
);

-- Also allow providers to update connected profiles (for soft-delete via update)
DROP POLICY IF EXISTS "Providers can update created profiles" ON public.profiles;

CREATE POLICY "Providers can update connected profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND (
    created_by_provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) 
  AND (
    created_by_provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
  )
);