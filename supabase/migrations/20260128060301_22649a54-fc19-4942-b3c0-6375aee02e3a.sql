-- Add tax_country field to business_settings for DACH region support
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS tax_country TEXT DEFAULT 'DE' CHECK (tax_country IN ('DE', 'AT', 'CH'));

-- Add default_vat_rate for flexible VAT configuration
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2) DEFAULT 19.00;

-- Add currency field (derived from tax_country but stored for performance)
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'CHF'));

-- Add swiss rounding option (for CHF - rounds to 0.05)
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS swiss_rounding BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN public.business_settings.tax_country IS 'DE=Germany, AT=Austria, CH=Switzerland';
COMMENT ON COLUMN public.business_settings.default_vat_rate IS 'Default VAT rate in percent (e.g. 19.00 for 19%)';
COMMENT ON COLUMN public.business_settings.swiss_rounding IS 'Round amounts to 0.05 CHF (Swiss Rappen rounding)';