-- Add subscription management fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS copecart_subscription_id TEXT;

-- Create index for faster lookups by copecart_subscription_id
CREATE INDEX IF NOT EXISTS idx_profiles_copecart_subscription_id ON public.profiles(copecart_subscription_id);

-- Add copecart_customer_portal_url to business_settings for storing the portal link
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS copecart_customer_portal_url TEXT;