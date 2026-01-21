-- Add ZUGFeRD / E-Invoicing compliance columns to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS vat_id TEXT,
ADD COLUMN IF NOT EXISTS tax_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.business_settings.vat_id IS 'USt-IdNr (e.g., DE123456789) - Required for B2B invoicing';
COMMENT ON COLUMN public.business_settings.tax_number IS 'Steuernummer - Fallback for local trade';

-- Add ZUGFeRD / E-Invoicing compliance columns to contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS vat_id TEXT,
ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.vat_id IS 'USt-IdNr of business customer - Required for B2B invoicing';
COMMENT ON COLUMN public.contacts.is_business IS 'True if customer is a business (B2B), false for private (B2C)';