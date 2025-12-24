-- Fix storage policies for horse-documents bucket
-- The issue is that current policies incorrectly try to match horses.name instead of just checking the folder path

-- Drop existing broken policies
DROP POLICY IF EXISTS "Clients can view own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete granted horse documents" ON storage.objects;

-- Create corrected policies for clients
CREATE POLICY "Clients can view own horse documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'horse-documents' AND
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
    AND horses.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can upload own horse documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'horse-documents' AND
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
    AND horses.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can delete own horse documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'horse-documents' AND
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
    AND horses.deleted_at IS NULL
  )
);

-- Create corrected policies for providers
CREATE POLICY "Providers can view granted horse documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'horse-documents' AND
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(name))[1]
    AND h.deleted_at IS NULL
    AND (
      -- Provider created the client
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = h.owner_id AND p.created_by_provider_id = auth.uid())
      OR
      -- Provider has access grant
      EXISTS (SELECT 1 FROM access_grants ag WHERE ag.client_id = h.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true)
      OR
      -- Provider has appointment with horse
      EXISTS (SELECT 1 FROM appointments a WHERE a.horse_id = h.id AND a.provider_id = auth.uid())
    )
  )
);

CREATE POLICY "Providers can upload granted horse documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'horse-documents' AND
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(name))[1]
    AND h.deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = h.owner_id AND p.created_by_provider_id = auth.uid())
      OR EXISTS (SELECT 1 FROM access_grants ag WHERE ag.client_id = h.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true)
      OR EXISTS (SELECT 1 FROM appointments a WHERE a.horse_id = h.id AND a.provider_id = auth.uid())
    )
  )
);

CREATE POLICY "Providers can update granted horse documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'horse-documents' AND
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(name))[1]
    AND h.deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = h.owner_id AND p.created_by_provider_id = auth.uid())
      OR EXISTS (SELECT 1 FROM access_grants ag WHERE ag.client_id = h.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true)
      OR EXISTS (SELECT 1 FROM appointments a WHERE a.horse_id = h.id AND a.provider_id = auth.uid())
    )
  )
);

CREATE POLICY "Providers can delete granted horse documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'horse-documents' AND
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id::text = (storage.foldername(name))[1]
    AND h.deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = h.owner_id AND p.created_by_provider_id = auth.uid())
      OR EXISTS (SELECT 1 FROM access_grants ag WHERE ag.client_id = h.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true)
      OR EXISTS (SELECT 1 FROM appointments a WHERE a.horse_id = h.id AND a.provider_id = auth.uid())
    )
  )
);