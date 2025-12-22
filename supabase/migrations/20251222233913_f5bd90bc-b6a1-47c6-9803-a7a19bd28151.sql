-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for gallery bucket
CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Providers can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can update own gallery images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can delete own gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);