-- ================================================
-- SECURITY HARDENING MIGRATION v2
-- ================================================

-- FIX 1: Rate limiting for demo_activity_logs
CREATE OR REPLACE FUNCTION public.check_demo_activity_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.demo_activity_logs
    WHERE user_email = NEW.user_email
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded for demo activity logging';
  END IF;
  IF NEW.action_name IS NOT NULL THEN
    NEW.action_name := TRIM(regexp_replace(NEW.action_name, '<[^>]*>', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_demo_activity_rate
  BEFORE INSERT ON public.demo_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.check_demo_activity_rate_limit();

-- FIX 2: Tighten review_reactions INSERT policy
DROP POLICY IF EXISTS "Allow insert for tracking" ON public.review_reactions;
CREATE POLICY "Allow insert for tracking with limit"
  ON public.review_reactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (SELECT COUNT(*) FROM public.review_reactions rr 
     WHERE rr.fingerprint = fingerprint 
     AND rr.created_at > NOW() - INTERVAL '1 hour') < 15
  );

-- FIX 3: Storage bucket hardening - make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN (
  'hoof_photos', 'hoof_images', 'employee-avatars', 
  'documents', 'pdfs', 'feedback-screenshots'
);

-- Add file size limits and MIME type restrictions
UPDATE storage.buckets SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('hoof_photos', 'hoof_images', 'employee-avatars', 'horse-photos', 
             'gallery', 'feedback-screenshots', 'blog-images');

UPDATE storage.buckets SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']
WHERE id IN ('documents', 'pdfs', 'legal-documents', 'horse-documents', 
             'partner-documents', 'completion-reports');

UPDATE storage.buckets SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'expense-receipts';

UPDATE storage.buckets SET 
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
WHERE id = 'signatures';

-- FIX 4: Storage RLS for newly private buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read employee avatars'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read employee avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''employee-avatars'')';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read documents'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''documents'')';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read pdfs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read pdfs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''pdfs'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read hoof photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read hoof photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN (''hoof_photos'', ''hoof_images''))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read feedback screenshots'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read feedback screenshots" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''feedback-screenshots'')';
  END IF;
END $$;
