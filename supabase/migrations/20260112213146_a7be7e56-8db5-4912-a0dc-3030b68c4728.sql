-- CRITICAL FIX: Remove the overly permissive "Uploads fuer alle" storage policy
-- This policy allows ANY authenticated user to access ALL files in ALL buckets!
DROP POLICY IF EXISTS "Uploads fuer alle" ON storage.objects;