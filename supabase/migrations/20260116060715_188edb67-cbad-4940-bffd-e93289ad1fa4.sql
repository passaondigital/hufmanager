-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to feedback-screenshots
CREATE POLICY "Authenticated users can upload feedback screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'feedback-screenshots' AND auth.uid() IS NOT NULL);

-- Allow public read access to feedback screenshots
CREATE POLICY "Public can view feedback screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'feedback-screenshots');

-- Allow admins to delete feedback screenshots
CREATE POLICY "Admins can delete feedback screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'feedback-screenshots' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));