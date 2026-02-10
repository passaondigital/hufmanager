
-- =============================================
-- MEIN OFFICE: Templates & Documents
-- =============================================

-- Template definitions (reusable blueprints)
CREATE TABLE public.office_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'eigene',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document instances (filled from templates or scratch)
CREATE TABLE public.office_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.office_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.office_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Templates
CREATE POLICY "Providers manage own templates"
  ON public.office_templates FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- RLS Policies: Documents
CREATE POLICY "Providers manage own documents"
  ON public.office_documents FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Indexes
CREATE INDEX idx_office_templates_provider ON public.office_templates(provider_id);
CREATE INDEX idx_office_documents_provider ON public.office_documents(provider_id);
CREATE INDEX idx_office_documents_horse ON public.office_documents(horse_id);
CREATE INDEX idx_office_documents_contact ON public.office_documents(contact_id);

-- Timestamp trigger
CREATE TRIGGER update_office_templates_updated_at
  BEFORE UPDATE ON public.office_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_office_documents_updated_at
  BEFORE UPDATE ON public.office_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
