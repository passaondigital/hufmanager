
-- Storage policy for transfer documents in horse-documents bucket
CREATE POLICY "Transfer parties can upload transfer docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND (storage.foldername(name))[1] = 'transfers'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Transfer parties can view transfer docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-documents'
  AND (storage.foldername(name))[1] = 'transfers'
  AND auth.uid() IS NOT NULL
);
