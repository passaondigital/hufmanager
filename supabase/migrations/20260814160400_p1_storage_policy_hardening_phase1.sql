-- Phase 1 Storage Policy Hardening (DB-only safe changes)
-- DO NOT APPLY WITHOUT PASCAL APPROVAL

-- 1. legal-documents
-- Narrow provider ALL policy to own folder path
DROP POLICY IF EXISTS "Providers can manage own legal documents" ON storage.objects;
DROP POLICY IF EXISTS "legal_documents_provider_scoped" ON storage.objects;

CREATE POLICY "legal_documents_provider_scoped" ON storage.objects
FOR ALL
USING (
  bucket_id = 'legal-documents'
  AND has_role(auth.uid(), 'provider')
  AND (storage.foldername(objects.name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'legal-documents'
  AND has_role(auth.uid(), 'provider')
  AND (storage.foldername(objects.name))[1] = auth.uid()::text
);

-- 2. horse-documents (Providers)
-- Fix h.name bug, require active grant or provider-created ghost client
DROP POLICY IF EXISTS "Providers can upload granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "horse_documents_provider_select" ON storage.objects;
DROP POLICY IF EXISTS "horse_documents_provider_insert" ON storage.objects;
DROP POLICY IF EXISTS "horse_documents_provider_update" ON storage.objects;
DROP POLICY IF EXISTS "horse_documents_provider_delete" ON storage.objects;

-- REMOVE BROAD UPLOAD TO FIX BYPASS
DROP POLICY IF EXISTS "Horse documents upload" ON storage.objects;

CREATE POLICY "horse_documents_provider_select" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE (h.id)::text = (storage.foldername(objects.name))[1]
    AND h.deleted_at IS NULL
    AND (
      public.has_active_access_grant(auth.uid(), h.owner_id)
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = h.owner_id
        AND p.created_by_provider_id = auth.uid()
        AND p.deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "horse_documents_provider_insert" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE (h.id)::text = (storage.foldername(objects.name))[1]
    AND h.deleted_at IS NULL
    AND (
      public.has_active_access_grant(auth.uid(), h.owner_id)
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = h.owner_id
        AND p.created_by_provider_id = auth.uid()
        AND p.deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "horse_documents_provider_update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE (h.id)::text = (storage.foldername(objects.name))[1]
    AND h.deleted_at IS NULL
    AND (
      public.has_active_access_grant(auth.uid(), h.owner_id)
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = h.owner_id
        AND p.created_by_provider_id = auth.uid()
        AND p.deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "horse_documents_provider_delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE (h.id)::text = (storage.foldername(objects.name))[1]
    AND h.deleted_at IS NULL
    AND (
      public.has_active_access_grant(auth.uid(), h.owner_id)
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = h.owner_id
        AND p.created_by_provider_id = auth.uid()
        AND p.deleted_at IS NULL
      )
    )
  )
);

-- 3. horse-documents (Clients)
-- Fix h.name bug
DROP POLICY IF EXISTS "Clients can upload own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "client_horse_documents_upload" ON storage.objects;

CREATE POLICY "client_horse_documents_upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1 FROM horses h
    WHERE (h.id)::text = (storage.foldername(objects.name))[1]
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);
