-- Make chat-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-images';

-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

-- Create new SELECT policy that only allows conversation participants to view images
CREATE POLICY "Conversation participants can view chat images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-images' 
  AND (
    -- User can view their own uploaded images
    auth.uid()::text = (storage.foldername(name))[1]
    OR 
    -- User can view images from conversations they're part of
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.image_url LIKE '%' || name || '%'
      AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
    )
  )
);