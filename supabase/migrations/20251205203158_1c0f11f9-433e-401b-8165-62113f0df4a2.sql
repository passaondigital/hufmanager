-- Access Grants table for client permission control
CREATE TABLE IF NOT EXISTS public.access_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  can_view_basic boolean DEFAULT true,
  can_view_medical boolean DEFAULT true,
  can_create_appointments boolean DEFAULT true,
  is_active boolean DEFAULT true,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, provider_id)
);

ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Clients can view and manage their own grants
CREATE POLICY "Clients can view own access grants"
ON public.access_grants FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can update own access grants"
ON public.access_grants FOR UPDATE
USING (auth.uid() = client_id);

-- Providers can view grants for themselves
CREATE POLICY "Providers can view grants for themselves"
ON public.access_grants FOR SELECT
USING (auth.uid() = provider_id AND is_active = true);

-- Providers can create grants (when adding a customer)
CREATE POLICY "Providers can create access grants"
ON public.access_grants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

-- Legal Agreements table
CREATE TABLE IF NOT EXISTS public.legal_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL,
  agreement_type text NOT NULL, -- 'avv', 'agb'
  accepted_at timestamp with time zone,
  document_url text,
  version text DEFAULT '1.0',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own legal agreements"
ON public.legal_agreements FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND auth.uid() = provider_id);

-- Appointment completion data
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS completion_notes text,
ADD COLUMN IF NOT EXISTS gait_analysis_done boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gait_analysis_ok boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gait_video_url text,
ADD COLUMN IF NOT EXISTS signature_url text,
ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS signed_by_name text,
ADD COLUMN IF NOT EXISTS completion_pdf_url text,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for legal documents  
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for completion reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-reports', 'completion-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for signatures
CREATE POLICY "Providers can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures'
  AND has_role(auth.uid(), 'provider'::app_role)
);

CREATE POLICY "Providers can view signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signatures'
  AND has_role(auth.uid(), 'provider'::app_role)
);

-- Storage policies for legal documents
CREATE POLICY "Providers can manage own legal documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'legal-documents'
  AND has_role(auth.uid(), 'provider'::app_role)
);

-- Storage policies for completion reports
CREATE POLICY "Providers can manage completion reports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'completion-reports'
  AND has_role(auth.uid(), 'provider'::app_role)
);

CREATE POLICY "Clients can view own completion reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'completion-reports'
  AND EXISTS (
    SELECT 1 FROM appointments a
    JOIN horses h ON a.horse_id = h.id
    WHERE h.owner_id = auth.uid()
    AND a.completion_pdf_url LIKE '%' || name
  )
);

-- Create trigger for access_grants updated_at
CREATE TRIGGER update_access_grants_updated_at
BEFORE UPDATE ON public.access_grants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for legal_agreements updated_at
CREATE TRIGGER update_legal_agreements_updated_at
BEFORE UPDATE ON public.legal_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();