
-- Add DACH-specific fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'DE',
  ADD COLUMN IF NOT EXISTS tax_model VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_currency CHAR(3) DEFAULT 'EUR';

-- Add DACH-specific fields to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS kleine_unternehmer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS rksv_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mwst_pflichtig BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'DE';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.country IS 'ISO 3166-1 alpha-2: DE, AT, CH';
COMMENT ON COLUMN public.profiles.tax_model IS 'e.g. kleinunternehmer, regelbesteuerung';
COMMENT ON COLUMN public.profiles.preferred_currency IS 'EUR or CHF';
COMMENT ON COLUMN public.business_settings.kleine_unternehmer IS 'DE §19 UStG / AT KU-Regelung';
COMMENT ON COLUMN public.business_settings.rksv_enabled IS 'AT Registrierkassensicherheitsverordnung';
COMMENT ON COLUMN public.business_settings.mwst_pflichtig IS 'CH MWST-Pflicht ab 100k CHF';
