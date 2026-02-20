
-- Platform-level funnel leads table for admin CRM
CREATE TABLE IF NOT EXISTS public.funnel_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  source TEXT DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'neu',
  notes TEXT,
  demo_booked_at TIMESTAMPTZ,
  demo_completed_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_provider_id UUID REFERENCES public.profiles(id),
  assigned_to TEXT,
  postal_code TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_leads ENABLE ROW LEVEL SECURITY;

-- Only admins can access funnel leads
CREATE POLICY "Admins can manage funnel leads"
  ON public.funnel_leads
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Auto-update timestamp
CREATE TRIGGER update_funnel_leads_updated_at
  BEFORE UPDATE ON public.funnel_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ecosystem_links_updated_at();
