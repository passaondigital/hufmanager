-- Allow providers to access horses that belong to client profiles they created (pre-invitation / pre-access_grant)

-- Horses: SELECT
CREATE POLICY "Providers can view horses for created clients"
ON public.horses
FOR SELECT
USING (
  deleted_at IS NULL
  AND public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = horses.owner_id
      AND p.deleted_at IS NULL
      AND p.created_by_provider_id = auth.uid()
  )
);

-- Horses: UPDATE (needed for soft-delete via deleted_at)
CREATE POLICY "Providers can update horses for created clients"
ON public.horses
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = horses.owner_id
      AND p.created_by_provider_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = horses.owner_id
      AND p.created_by_provider_id = auth.uid()
  )
);

-- Horses: DELETE (optional, in case hard-delete is used anywhere)
CREATE POLICY "Providers can delete horses for created clients"
ON public.horses
FOR DELETE
USING (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = horses.owner_id
      AND p.created_by_provider_id = auth.uid()
  )
);
