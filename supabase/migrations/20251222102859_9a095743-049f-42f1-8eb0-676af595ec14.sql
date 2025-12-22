-- Fix provider visibility for client-owned horses (including horses created by the client)

-- Update existing policy to treat NULL is_active as active (defensive)
ALTER POLICY "Providers can view horses with active access"
ON public.horses
USING (
  (deleted_at IS NULL)
  AND has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND COALESCE(ag.is_active, true) = true
  )
);

-- Add explicit policy as requested: provider can view a horse if
-- (a) they created the client profile OR (b) they have an active access_grant for that client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'horses'
      AND policyname = 'Providers can view client horses'
  ) THEN
    CREATE POLICY "Providers can view client horses"
    ON public.horses
    FOR SELECT
    USING (
      (deleted_at IS NULL)
      AND has_role(auth.uid(), 'provider'::app_role)
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = horses.owner_id
            AND p.deleted_at IS NULL
            AND p.created_by_provider_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_grants ag
          WHERE ag.client_id = horses.owner_id
            AND ag.provider_id = auth.uid()
            AND COALESCE(ag.is_active, true) = true
        )
      )
    );
  END IF;
END $$;