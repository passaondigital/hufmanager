
-- Priority 4: Template variant field
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS landing_template TEXT DEFAULT 'classic';

-- Priority 5A: Service area text
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS service_area_text TEXT;

-- Priority 5C: Qualifications
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]';

-- Priority 5A: FAQ table
CREATE TABLE IF NOT EXISTS public.provider_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_faqs ENABLE ROW LEVEL SECURITY;

-- Provider can manage own FAQs
CREATE POLICY "provider_manage_own_faqs" ON public.provider_faqs
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Public can read active FAQs
CREATE POLICY "public_read_active_faqs" ON public.provider_faqs
  FOR SELECT TO anon
  USING (is_active = true);

-- Priority 7: Page views table
CREATE TABLE IF NOT EXISTS public.provider_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (anonymous tracking)
CREATE POLICY "anyone_insert_page_views" ON public.provider_page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Provider can read own page views
CREATE POLICY "provider_read_own_views" ON public.provider_page_views
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Public RPC to get FAQs
CREATE OR REPLACE FUNCTION public.get_public_faqs(provider_id_input uuid)
RETURNS TABLE(id uuid, question text, answer text, sort_order int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.question, f.answer, f.sort_order
  FROM provider_faqs f
  WHERE f.provider_id = provider_id_input
    AND f.is_active = true
  ORDER BY f.sort_order
  LIMIT 8;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_faqs(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_faqs(uuid) TO authenticated;
