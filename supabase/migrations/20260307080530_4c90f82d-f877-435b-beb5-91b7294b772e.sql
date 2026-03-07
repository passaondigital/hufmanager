-- Create private storage bucket for admin invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('admin-invoices', 'admin-invoices', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can manage admin-invoices bucket
CREATE POLICY "Admins can manage admin invoices storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'admin-invoices'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'admin-invoices'
  AND public.has_role(auth.uid(), 'admin')
);