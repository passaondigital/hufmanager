-- STORAGE-007 Storage Transfer Documents Hardening
-- Narrow P1 Closure: limit transfer documents access to authorized transfer parties only

DROP POLICY IF EXISTS "Transfer parties can upload transfer docs" ON storage.objects;
DROP POLICY IF EXISTS "Transfer parties can view transfer docs" ON storage.objects;

CREATE POLICY "Transfer parties can view transfer docs" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'horse-documents'::text AND
  (storage.foldername(name))[1] = 'transfers'::text AND
  (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND
  EXISTS (
    SELECT 1 FROM public.horse_transfers t
    WHERE t.id = ((storage.foldername(name))[2])::uuid
      AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
  )
);

CREATE POLICY "Transfer parties can upload transfer docs" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'horse-documents'::text AND
  (storage.foldername(name))[1] = 'transfers'::text AND
  (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND
  EXISTS (
    SELECT 1 FROM public.horse_transfers t
    WHERE t.id = ((storage.foldername(name))[2])::uuid
      AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())
  )
);
