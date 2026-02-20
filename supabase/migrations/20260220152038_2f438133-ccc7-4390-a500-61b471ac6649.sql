-- Drop overly permissive chat-images storage policy
-- The bucket is already private and a proper participant-based policy exists
DROP POLICY IF EXISTS "Alle Chatbilder lesen" ON storage.objects;