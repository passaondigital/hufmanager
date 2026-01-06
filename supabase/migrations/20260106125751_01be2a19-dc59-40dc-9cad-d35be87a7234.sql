-- Add IBAN and BIC fields to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;