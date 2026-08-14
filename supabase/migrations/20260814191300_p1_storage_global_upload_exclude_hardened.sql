-- 20260814191300_p1_storage_global_upload_exclude_hardened.sql
-- Excludes hardened buckets from the broad "Authenticated upload global" INSERT policy.
-- These buckets have their own path-scoped INSERT policies:
--   completion-reports: "Providers can manage completion reports" (auth.uid() prefix)
--   chat-images: "Conversation participants can upload chat images secure" (conversation+user prefix)
--   horse-documents: multiple dedicated INSERT policies (horse_documents_provider_insert, client_horse_documents_upload, Transfer parties)
--   legal-documents: "Providers can manage own legal documents" (FOR ALL with has_role)
--   partner-documents: "Partners upload own documents" (foldername[1] = auth.uid())
-- Without this exclusion, the global policy's (auth.uid() = owner) check allows INSERT
-- into these buckets at arbitrary paths, bypassing path enforcement.

BEGIN;

DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;

CREATE POLICY "Authenticated upload global"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.uid() = owner
  AND bucket_id NOT IN (
    'completion-reports',
    'chat-images',
    'horse-documents',
    'legal-documents',
    'partner-documents'
  )
);

COMMIT;
