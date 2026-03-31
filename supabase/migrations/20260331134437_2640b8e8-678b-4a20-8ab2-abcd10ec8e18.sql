
-- Storage bucket for admin message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-messages-attachments',
  'admin-messages-attachments',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf']
);

-- RLS: Admin can upload anything
CREATE POLICY "admin_upload_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-messages-attachments'
  AND public.is_admin(auth.uid())
);

-- RLS: Admin can read all
CREATE POLICY "admin_read_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-messages-attachments'
  AND public.is_admin(auth.uid())
);

-- RLS: User can read files in their own thread folder (path: {recipient_id}/...)
CREATE POLICY "user_read_own_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-messages-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: User can upload to their own thread folder
CREATE POLICY "user_upload_own_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-messages-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Admin can delete
CREATE POLICY "admin_delete_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-messages-attachments'
  AND public.is_admin(auth.uid())
);
