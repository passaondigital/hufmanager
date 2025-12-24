-- Create a security definer function that exposes only safe business settings for public landing pages
-- This prevents PII exposure (email, phone, address, tax_number) while still allowing landing pages to work

CREATE OR REPLACE FUNCTION public.get_public_business_landing(subdomain_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Return only non-sensitive fields needed for public landing pages
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'business_name', business_name,
    'owner_name', owner_name,
    'hero_headline', hero_headline,
    'about_text', about_text,
    'logo_url', logo_url,
    'primary_color', primary_color,
    'accept_new_customers', accept_new_customers,
    'client_intake_status', client_intake_status,
    'gallery_images', gallery_images,
    'impressum_text', impressum_text,
    'terms_text', terms_text,
    -- Note: phone, email, and address are intentionally excluded for public access
    -- They will be included only in impressum_text if the provider chooses to add them there
    'subdomain', subdomain
  ) INTO result
  FROM business_settings
  WHERE subdomain = subdomain_input
    AND subdomain IS NOT NULL;
  
  RETURN result;
END;
$$;

-- Grant execute permission to anonymous users for landing page access
GRANT EXECUTE ON FUNCTION public.get_public_business_landing(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_business_landing(TEXT) TO authenticated;