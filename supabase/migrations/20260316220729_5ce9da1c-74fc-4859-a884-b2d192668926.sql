
-- Add legal/tax fields to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS legal_form text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_display_mode text DEFAULT 'netto' CHECK (price_display_mode IN ('netto', 'brutto')),
  ADD COLUMN IF NOT EXISTS finanzamt text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS handelsregister text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS berufsbezeichnung text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kammer text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steuerberater_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steuerberater_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS datev_mandanten_nr text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bilanzpflicht boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vorsteuerabzug boolean DEFAULT false;

-- Add same fields to partner_business_settings
ALTER TABLE public.partner_business_settings
  ADD COLUMN IF NOT EXISTS legal_form text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_display_mode text DEFAULT 'netto' CHECK (price_display_mode IN ('netto', 'brutto')),
  ADD COLUMN IF NOT EXISTS finanzamt text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS handelsregister text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS berufsbezeichnung text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kammer text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steuerberater_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS steuerberater_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS datev_mandanten_nr text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bilanzpflicht boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vorsteuerabzug boolean DEFAULT false;
