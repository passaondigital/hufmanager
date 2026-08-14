-- Close legacy expired-grant bypass for horse documents
DROP POLICY IF EXISTS "Horse documents owner access" ON storage.objects;

CREATE POLICY "Horse documents owner access" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'horse-documents'
  AND (
    EXISTS (
      SELECT 1 FROM horse_documents hd
      JOIN horses h ON h.id = hd.horse_id
      WHERE hd.file_url LIKE ('%' || objects.name || '%')
      AND h.owner_id = auth.uid()
      AND h.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM horse_documents hd
      JOIN horses h ON h.id = hd.horse_id
      WHERE hd.file_url LIKE ('%' || objects.name || '%')
      AND public.has_active_access_grant(auth.uid(), h.owner_id)
    )
  )
);
