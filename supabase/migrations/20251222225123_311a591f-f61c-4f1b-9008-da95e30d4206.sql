-- Drop overly permissive storage policy
DROP POLICY IF EXISTS "Providers can manage all horse documents" ON storage.objects;

-- Create restricted policies for provider access to horse-documents bucket

-- SELECT: Providers can only view documents for horses they have access to
CREATE POLICY "Providers can view granted horse documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
  AND (
    -- Provider has active access grant for horse owner
    EXISTS (
      SELECT 1 FROM horses h
      JOIN access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
    -- OR provider has appointment with this horse
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN appointments a ON a.horse_id = h.id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND a.provider_id = auth.uid()
    )
    -- OR provider created the client profile
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN profiles p ON p.id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND p.created_by_provider_id = auth.uid()
    )
  )
);

-- INSERT: Providers can only upload documents for horses they have access to
CREATE POLICY "Providers can upload granted horse documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM horses h
      JOIN access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN appointments a ON a.horse_id = h.id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN profiles p ON p.id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND p.created_by_provider_id = auth.uid()
    )
  )
);

-- UPDATE: Providers can only update documents for horses they have access to
CREATE POLICY "Providers can update granted horse documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM horses h
      JOIN access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN appointments a ON a.horse_id = h.id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN profiles p ON p.id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND p.created_by_provider_id = auth.uid()
    )
  )
);

-- DELETE: Providers can only delete documents for horses they have access to
CREATE POLICY "Providers can delete granted horse documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM horses h
      JOIN access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN appointments a ON a.horse_id = h.id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM horses h
      JOIN profiles p ON p.id = h.owner_id
      WHERE h.id::text = (storage.foldername(name))[1]
        AND p.created_by_provider_id = auth.uid()
    )
  )
);