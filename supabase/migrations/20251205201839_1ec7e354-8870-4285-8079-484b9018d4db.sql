-- Add new columns to horses table for "Digitale Pferdeakte"
ALTER TABLE public.horses
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS usage text,
ADD COLUMN IF NOT EXISTS housing text,
ADD COLUMN IF NOT EXISTS feeding_notes text,
ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'healthy',
ADD COLUMN IF NOT EXISTS medical_history text,
ADD COLUMN IF NOT EXISTS hoof_protection text DEFAULT 'barefoot',
ADD COLUMN IF NOT EXISTS hoof_measurements jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '{}';

-- Add comment for health_status values
COMMENT ON COLUMN public.horses.health_status IS 'Values: healthy, acute, chronic, rehab';

-- Add comment for hoof_protection values  
COMMENT ON COLUMN public.horses.hoof_protection IS 'Values: barefoot, shoes, duplo, glue, boots, mixed';

-- Create storage bucket for horse documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('horse-documents', 'horse-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for horse documents
CREATE POLICY "Clients can view own horse documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-documents' 
  AND EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can upload own horse documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete own horse documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id::text = (storage.foldername(name))[1]
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage all horse documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'horse-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
);

-- RLS: Allow clients to UPDATE their own horses
CREATE POLICY "Clients can update own horses"
ON public.horses FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- RLS: Allow clients to DELETE their own horses
CREATE POLICY "Clients can delete own horses"
ON public.horses FOR DELETE
USING (auth.uid() = owner_id);

-- RLS: Allow clients to INSERT their own horses
CREATE POLICY "Clients can create own horses"
ON public.horses FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Create horse_documents table to track uploaded files
CREATE TABLE IF NOT EXISTS public.horse_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  category text DEFAULT 'other',
  notes text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on horse_documents
ALTER TABLE public.horse_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for horse_documents
CREATE POLICY "Clients can view own horse documents"
ON public.horse_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id = horse_documents.horse_id 
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can upload own horse documents"
ON public.horse_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id = horse_documents.horse_id 
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete own horse documents"
ON public.horse_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM horses 
    WHERE horses.id = horse_documents.horse_id 
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage all horse documents"
ON public.horse_documents FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role));