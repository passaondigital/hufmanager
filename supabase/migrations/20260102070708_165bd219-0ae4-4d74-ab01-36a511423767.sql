-- Create subscription_settings table for provider pricing configuration
CREATE TABLE public.subscription_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL UNIQUE,
  price_4_weeks_zone1 integer DEFAULT 0,
  price_4_weeks_zone2 integer DEFAULT 0,
  price_6_weeks_zone1 integer DEFAULT 0,
  price_6_weeks_zone2 integer DEFAULT 0,
  price_8_weeks_zone1 integer DEFAULT 0,
  price_8_weeks_zone2 integer DEFAULT 0,
  discount_percentage integer DEFAULT 5,
  copecart_base_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

-- Providers can only view/manage their own settings
CREATE POLICY "Providers can view own subscription settings"
ON public.subscription_settings
FOR SELECT
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own subscription settings"
ON public.subscription_settings
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own subscription settings"
ON public.subscription_settings
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own subscription settings"
ON public.subscription_settings
FOR DELETE
USING (auth.uid() = provider_id);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_settings_updated_at
BEFORE UPDATE ON public.subscription_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();