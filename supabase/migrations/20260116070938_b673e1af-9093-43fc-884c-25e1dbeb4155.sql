-- Drop and recreate policies for chat-images to ensure correct configuration
DROP POLICY IF EXISTS "Conversation participants can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their chat images" ON storage.objects;

-- Recreate policies with correct logic
CREATE POLICY "Conversation participants can view chat images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.provider_id = auth.uid() OR c.client_id = auth.uid())
      AND (storage.foldername(name))[1] = c.id::text
    )
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  )
);

CREATE POLICY "Conversation participants can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.provider_id = auth.uid() OR c.client_id = auth.uid())
    AND (storage.foldername(name))[1] = c.id::text
  )
);

CREATE POLICY "Users can delete their chat images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);