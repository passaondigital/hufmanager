-- supabase/migrations/20260814190500_p1_storage_completion_reports_hardening.sql

BEGIN;

DROP POLICY IF EXISTS "Providers can manage completion reports" ON storage.objects;

CREATE POLICY "Providers can manage completion reports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'completion-reports'
  AND has_role(auth.uid(), 'provider'::app_role)
  AND name LIKE auth.uid() || '/%'
);

COMMIT;
