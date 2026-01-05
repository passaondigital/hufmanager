-- Create a provider-only table for sensitive payment credentials
-- The Copecart customer portal URL should not be visible to clients
CREATE TABLE public.provider_portal_credentials (
  provider_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  copecart_customer_portal_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - only providers can access their own credentials
ALTER TABLE public.provider_portal_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own portal credentials"
ON public.provider_portal_credentials
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Admin can also view for support purposes
CREATE POLICY "Master admin can view portal credentials"
ON public.provider_portal_credentials
FOR SELECT
USING (is_master_admin());

-- Migrate existing data from business_settings to the new table
INSERT INTO public.provider_portal_credentials (provider_id, copecart_customer_portal_url)
SELECT user_id, copecart_customer_portal_url
FROM public.business_settings
WHERE user_id IS NOT NULL 
  AND copecart_customer_portal_url IS NOT NULL
ON CONFLICT (provider_id) DO UPDATE
SET copecart_customer_portal_url = EXCLUDED.copecart_customer_portal_url,
    updated_at = now();

-- Create trigger for updated_at
CREATE TRIGGER update_portal_credentials_updated_at
BEFORE UPDATE ON public.provider_portal_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();