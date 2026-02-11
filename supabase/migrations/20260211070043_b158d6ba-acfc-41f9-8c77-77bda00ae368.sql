-- Make horse-photos bucket private (was public)
UPDATE storage.buckets SET public = false WHERE id = 'horse-photos';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public read access for horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view horse photos" ON storage.objects;

-- Create authenticated SELECT policy for horse-photos
CREATE POLICY "Authenticated users can view horse photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'horse-photos' AND auth.uid() IS NOT NULL);