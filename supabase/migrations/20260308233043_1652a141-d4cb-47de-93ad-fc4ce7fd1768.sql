-- Create office-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('office-pdfs', 'office-pdfs', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS: Providers can upload/manage their own PDFs (path starts with their user ID)
CREATE POLICY "Providers upload own pdfs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'office-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Providers update own pdfs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'office-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Providers delete own pdfs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'office-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (PDFs are shareable links)
CREATE POLICY "Public read office pdfs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'office-pdfs');