-- Create horse-vault storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('horse-vault', 'horse-vault', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS for horse-vault bucket: only owner can access their files
CREATE POLICY "Owner can upload vault files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'horse-vault' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner can read own vault files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'horse-vault' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "Owner can delete own vault files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'horse-vault' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);