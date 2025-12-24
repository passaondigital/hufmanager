-- Allow clients to view their connected provider profiles (needed for ClientChat)
-- This fixes the case where a client has a provider_id but cannot SELECT that provider row due to RLS.

CREATE POLICY "Clients can view connected provider profiles"
ON public.profiles
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.access_grants ag
    WHERE ag.client_id = auth.uid()
      AND ag.provider_id = profiles.id
      AND COALESCE(ag.is_active, true) = true
  )
);
