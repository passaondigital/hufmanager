-- Fix the broken storage RLS policies for horse-documents bucket
-- The original policies incorrectly compare h.id with h.name instead of with the folder name in storage

-- Drop the broken policies
DROP POLICY IF EXISTS "Clients can view own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload own horse documents" ON storage.objects;

-- Recreate with correct logic: folder name in storage path should be horse_id
CREATE POLICY "Clients can view own horse documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-documents' 
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(objects.name))[1]
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can upload own horse documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(name))[1]
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can delete own horse documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(objects.name))[1]
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);