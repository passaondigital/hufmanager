-- Allow admins to create provider-side conversations (admin uses provider UI)
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  (
    auth.uid() = provider_id
    AND (
      public.has_role(auth.uid(), 'provider'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
  OR (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1
      FROM public.access_grants ag
      WHERE ag.client_id = auth.uid()
        AND ag.provider_id = conversations.provider_id
        AND ag.is_active = true
    )
  )
);
