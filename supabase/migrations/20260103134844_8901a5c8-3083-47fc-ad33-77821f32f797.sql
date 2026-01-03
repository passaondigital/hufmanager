-- Create horse-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('horse-photos', 'horse-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "Users can view all horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own folder horse photos" ON storage.objects;

-- Policy: Public can view all horse photos (for display on landing pages, etc.)
CREATE POLICY "Public can view horse photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'horse-photos');

-- Policy: Authenticated users can upload to their own folder
-- Folder structure: horse-photos/{user_id}/{filename}
CREATE POLICY "Authenticated users can upload horse photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own horse photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'horse-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own horse photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);