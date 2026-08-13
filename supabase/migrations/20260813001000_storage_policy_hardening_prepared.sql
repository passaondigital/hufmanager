-- P0 SHARED SUPABASE STORAGE GATE
-- Prepared only. Do not apply to production before backup, live policy export,
-- storage object path audit, and runtime impact approval.
--
-- Live read-only findings 2026-08-13:
-- - hoof_photos has public SELECT policy "Public Access" on bucket_id='hoof_photos'.
-- - horse-photos has public SELECT policy "Public can view horse photos".
-- - hoof_images, documents and hoof_photos have broad authenticated SELECT policies.
-- - Buckets are private except hufcam-images plus known public website buckets.
--
-- Principle:
--   HORSE FILE -> OWNER / RELATIONSHIP / PERMISSION -> ALLOWED OBJECT
-- Never:
--   public -> all horse photos
--   authenticated -> all horse files

-- Remove confirmed public/broad SELECT policies. Policy names are taken from
-- live read-only findings and historical migrations. IF EXISTS keeps this safe
-- across environments with drift.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can view horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view horse photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read hoof photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated select global" ON storage.objects;
DROP POLICY IF EXISTS "hoof_photos_relationship_select" ON storage.objects;
DROP POLICY IF EXISTS "hoof_photos_relationship_insert" ON storage.objects;
DROP POLICY IF EXISTS "hoof_photos_relationship_update" ON storage.objects;
DROP POLICY IF EXISTS "hoof_photos_relationship_delete" ON storage.objects;
DROP POLICY IF EXISTS "horse_photos_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "hoof_images_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "hufcam_images_owner_select" ON storage.objects;

-- hoof_photos bucket:
-- Existing HufCam upload path is {horse_id}/{filename}. The table stores
-- photo_url/file_path as that object path. SELECT is allowed only if the user
-- can access the linked horse through owner/provider/partner/admin relationship.
CREATE POLICY "hoof_photos_relationship_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hoof_photos'
  AND EXISTS (
    SELECT 1
    FROM public.hoof_photos hp
    JOIN public.horses h ON h.id = hp.horse_id
    WHERE (
      hp.file_path = storage.objects.name
      OR hp.photo_url = storage.objects.name
      OR hp.url LIKE '%' || storage.objects.name
    )
    AND h.deleted_at IS NULL
    AND (
      h.owner_id = auth.uid()
      OR public.is_provider_for_horse(auth.uid(), h.id)
      OR public.has_horse_partner_access(auth.uid(), h.id)
      OR public.is_admin(auth.uid())
    )
  )
);

CREATE POLICY "hoof_photos_relationship_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hoof_photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    public.is_horse_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_provider_for_horse(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "hoof_photos_relationship_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hoof_photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    public.is_horse_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_provider_for_horse(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'hoof_photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    public.is_horse_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_provider_for_horse(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "hoof_photos_relationship_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hoof_photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    public.is_horse_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_provider_for_horse(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_admin(auth.uid())
  )
);

-- horse-photos bucket:
-- Historical path is {user_id}/{filename}; no reliable horse relationship table
-- was found in the current frontend impact audit. Keep only owner-folder/admin
-- access until a table-backed relationship model is confirmed.
CREATE POLICY "horse_photos_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'horse-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- hoof_images/documents broad authenticated reads:
-- These buckets need a model-specific follow-up. A conservative owner-folder
-- policy preserves common private-object patterns without broad bucket read.
CREATE POLICY "hoof_images_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hoof_images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "documents_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- hufcam-images remains deliberately not flipped from public to private here.
-- Existing repo evidence says the bucket was historically public/empty and no
-- active code write path was found. It still requires a live object-content
-- audit before changing bucket.public.
CREATE POLICY "hufcam_images_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hufcam-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
