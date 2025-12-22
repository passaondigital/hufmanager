-- Add legal text columns to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS impressum_text text,
ADD COLUMN IF NOT EXISTS terms_text text;