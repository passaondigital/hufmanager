-- Enable provider soft-delete (UPDATE) on horses reliably by using a SECURITY DEFINER helper

-- 1) Helper function to check provider permissions without depending on RLS visibility
CREATE OR REPLACE FUNCTION public.provider_can_manage_client_horses(_provider_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_provider_id, 'provider'::app_role)
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = _client_id
          AND p.created_by_provider_id = _provider_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.access_grants ag
        WHERE ag.client_id = _client_id
          AND ag.provider_id = _provider_id
          AND ag.is_active = true
      )
    );
$$;

-- 2) Replace the provider UPDATE policies on horses with a single, clear rule
DROP POLICY IF EXISTS "Providers can update horses for created clients" ON public.horses;
DROP POLICY IF EXISTS "Providers can update horses with active access" ON public.horses;

CREATE POLICY "Providers can update client horses"
ON public.horses
FOR UPDATE
USING (
  public.provider_can_manage_client_horses(auth.uid(), owner_id)
)
WITH CHECK (
  public.provider_can_manage_client_horses(auth.uid(), owner_id)
);
