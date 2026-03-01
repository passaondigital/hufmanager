
-- Website Pages table for multi-page provider websites
CREATE TABLE public.website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL DEFAULT 'provider' CHECK (owner_type IN ('provider', 'partner')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  page_type TEXT NOT NULL DEFAULT 'custom' CHECK (page_type IN ('home', 'about', 'services', 'gallery', 'blog', 'contact', 'booking', 'team', 'reviews', 'impressum', 'datenschutz', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, slug)
);

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own pages
CREATE POLICY "owner_manages_pages" ON public.website_pages
FOR ALL USING (owner_id = auth.uid());

-- Public can read published pages
CREATE POLICY "public_reads_published_pages" ON public.website_pages
FOR SELECT TO anon, authenticated
USING (is_published = true);

-- Website Leads table for intelligent contact form
CREATE TABLE public.website_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_name TEXT,
  breed TEXT,
  horse_age TEXT,
  hoof_condition TEXT CHECK (hoof_condition IN ('good', 'noticeable', 'urgent')),
  service_interest TEXT,
  urgency INTEGER DEFAULT 1 CHECK (urgency BETWEEN 1 AND 5),
  preferred_timeframe TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  plz TEXT,
  source TEXT,
  referral_source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'archived')),
  notes TEXT,
  dsgvo_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own leads
CREATE POLICY "owner_manages_leads" ON public.website_leads
FOR ALL USING (owner_id = auth.uid());

-- Public can insert leads (contact form submissions)
CREATE POLICY "public_inserts_leads" ON public.website_leads
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Rate limiting trigger for website leads
CREATE OR REPLACE FUNCTION public.check_website_lead_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND (
    SELECT COUNT(*) FROM public.website_leads
    WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 3 THEN
    RAISE EXCEPTION 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
  END IF;
  
  -- Sanitize inputs
  IF NEW.contact_name IS NOT NULL THEN
    NEW.contact_name := TRIM(regexp_replace(NEW.contact_name, '<[^>]*>', '', 'g'));
  END IF;
  IF NEW.horse_name IS NOT NULL THEN
    NEW.horse_name := TRIM(regexp_replace(NEW.horse_name, '<[^>]*>', '', 'g'));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_website_lead_rate
BEFORE INSERT ON public.website_leads
FOR EACH ROW EXECUTE FUNCTION public.check_website_lead_rate_limit();

-- Website settings additions to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS website_navigation JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS exit_intent_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_search_console_code TEXT,
ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS website_active_pages JSONB DEFAULT '["home","contact","impressum","datenschutz"]'::jsonb;

-- Provider blog posts (add owner-specific fields to existing blog_posts or create provider_blog_posts)
CREATE TABLE public.provider_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  category TEXT DEFAULT 'news',
  tags TEXT[] DEFAULT '{}',
  featured_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, slug)
);

ALTER TABLE public.provider_blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_blog" ON public.provider_blog_posts
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "public_reads_published_blog" ON public.provider_blog_posts
FOR SELECT TO anon, authenticated
USING (is_published = true AND published_at <= now());
