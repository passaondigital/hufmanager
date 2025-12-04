-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Create policy for authenticated users to upload their own logo
CREATE POLICY "Users can upload own logo" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to update their own logo
CREATE POLICY "Users can update own logo" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own logo
CREATE POLICY "Users can delete own logo" ON storage.objects
FOR DELETE USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for public read access to logos
CREATE POLICY "Logos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');