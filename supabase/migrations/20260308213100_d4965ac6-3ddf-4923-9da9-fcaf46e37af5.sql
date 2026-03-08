
-- Add missing columns to customer_domains
ALTER TABLE public.customer_domains 
ADD COLUMN IF NOT EXISTS ssl_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dns_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dns_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hosting_plan TEXT DEFAULT 'none';

-- Add missing columns to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS subdomain_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS domain_connection_type TEXT DEFAULT 'subdomain';
