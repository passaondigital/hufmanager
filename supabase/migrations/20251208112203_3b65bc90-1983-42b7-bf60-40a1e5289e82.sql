-- Create contact category enum
CREATE TYPE public.contact_category AS ENUM ('client', 'partner', 'supplier', 'lead');

-- Create contacts table for centralized contact management
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  category contact_category NOT NULL DEFAULT 'client',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_contacts_provider_id ON public.contacts(provider_id);
CREATE INDEX idx_contacts_category ON public.contacts(category);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view own contacts"
ON public.contacts FOR SELECT
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own contacts"
ON public.contacts FOR INSERT
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own contacts"
ON public.contacts FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own contacts"
ON public.contacts FOR DELETE
USING (auth.uid() = provider_id);

-- Create magic_links table for self-onboarding
CREATE TABLE public.magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_magic_links_slug ON public.magic_links(slug);
CREATE INDEX idx_magic_links_provider_id ON public.magic_links(provider_id);

ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- RLS for magic_links
CREATE POLICY "Providers can manage own magic links"
ON public.magic_links FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Anyone can read active magic links by slug"
ON public.magic_links FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();