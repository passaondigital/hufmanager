-- Fix incorrect RLS policies for horse-documents storage bucket
-- The policies incorrectly compared horses.id with horses.name instead of storage object name

-- Drop the broken policies
DROP POLICY IF EXISTS "Clients can view own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete own horse documents" ON storage.objects;

-- Recreate with correct logic: folder structure is {horse_id}/{filename}
-- So storage.foldername(name)[1] should equal the horse.id that the user owns

CREATE POLICY "Clients can view own horse documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-documents' 
  AND EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
      AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can upload own horse documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents' 
  AND EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
      AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete own horse documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-documents' 
  AND EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
      AND horses.owner_id = auth.uid()
  )
);