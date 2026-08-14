BEGIN;

-- Drop all existing chat-images policies to ensure a clean state
DROP POLICY IF EXISTS "Bilder hochladen für Teilnehmer" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;

-- Create secure SELECT policy (backwards-compatible for old user.id/ and voices/ paths)
CREATE POLICY "Conversation participants can view chat images secure" 
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'chat-images' AND (
    -- New secure path and new voice path: <conversation_id>/<user_id>/...
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM conversations c 
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
      )
    )
    OR
    -- Old voice path: voices/<conversation_id>/...
    (
      (storage.foldername(name))[1] = 'voices'
      AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM conversations c 
        WHERE c.id::text = (storage.foldername(name))[2]
        AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
      )
    )
    OR
    -- Old image path: <user_id>/... or others 
    -- We join on messages to prove the image is part of a conversation the user can see.
    (
      EXISTS (
        SELECT 1 FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.image_url = objects.name OR m.voice_url = objects.name
        AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
      )
    )
    OR is_admin(auth.uid()) 
    OR is_master_admin()
  )
);

-- Create secure INSERT policy (only new secure paths allowed)
CREATE POLICY "Conversation participants can upload chat images secure" 
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-images' AND 
  -- Must use secure path: <conversation_id>/<user_id>/...
  (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- Create secure UPDATE/DELETE policies
CREATE POLICY "Users can update their chat images secure" 
ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'chat-images' AND (
    -- New path owner check
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR
    -- Old path owner check
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their chat images secure" 
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'chat-images' AND (
    -- New path owner check
    (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR
    -- Old path owner check
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

COMMIT;
