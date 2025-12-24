-- Fix conversation creation policy: Allow clients to create conversations
-- if they were created by that provider OR have an active access grant
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  -- Provider/Admin can create conversations for themselves
  (
    auth.uid() = provider_id
    AND (
      public.has_role(auth.uid(), 'provider'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
  OR
  -- Client can create if:
  -- 1. They are the client_id AND
  -- 2. Either they have access_grant OR were created by that provider
  (
    auth.uid() = client_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.access_grants ag
        WHERE ag.client_id = auth.uid()
          AND ag.provider_id = conversations.provider_id
          AND ag.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.created_by_provider_id = conversations.provider_id
      )
    )
  )
);