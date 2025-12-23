-- ==========================================
-- FIX CHAT CONNECTIVITY & RLS + ADD IMAGES
-- ==========================================

-- 1. Add image_url column to messages for image attachments
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Enable realtime for messages table (important for live updates)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 3. Fix conversations RLS - allow clients to create conversations with their providers
DROP POLICY IF EXISTS "Providers can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  -- Provider creating conv with their client
  (auth.uid() = provider_id AND has_role(auth.uid(), 'provider'::app_role))
  OR
  -- Client creating conv with their provider (via access_grant)
  (auth.uid() = client_id AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = auth.uid()
    AND ag.provider_id = conversations.provider_id
    AND ag.is_active = true
  ))
);

-- 4. Fix messages RLS - allow INSERT/SELECT when connected via access_grant
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

-- INSERT policy: Users can send if they're part of the conversation
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- SELECT policy: Users can view if they're part of the conversation
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- UPDATE policy: Users can update messages in their conversations (mark as read)
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- 5. Create storage bucket for chat images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images', 
  'chat-images', 
  true, 
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for chat images
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

CREATE POLICY "Users can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view chat images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete own chat images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);