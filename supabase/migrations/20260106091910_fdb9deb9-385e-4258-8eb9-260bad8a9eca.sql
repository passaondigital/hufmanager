-- Add new columns to offers table for dynamic profile builder
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS offer_type text DEFAULT 'service',
ADD COLUMN IF NOT EXISTS display_mode text DEFAULT 'highlight_card',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS external_link text;

-- Add comments for documentation
COMMENT ON COLUMN public.offers.offer_type IS 'Type: service, product, digital, bundle';
COMMENT ON COLUMN public.offers.display_mode IS 'Display mode: highlight_card, list_item, shop_grid, hidden';
COMMENT ON COLUMN public.offers.media_url IS 'YouTube URL or image URL for media embed';
COMMENT ON COLUMN public.offers.external_link IS 'Optional external link (e.g., shop URL)';

-- Add section_order to business_settings for custom section ordering
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS section_order jsonb DEFAULT '["hero", "about", "highlights", "services", "gallery", "reviews", "contact"]'::jsonb;

COMMENT ON COLUMN public.business_settings.section_order IS 'Ordered array of section IDs for landing page layout';

-- Update the get_public_business_landing function to include section_order
CREATE OR REPLACE FUNCTION public.get_public_business_landing(subdomain_input text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
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
    'subdomain', subdomain,
    'reviews_layout', reviews_layout,
    'section_order', COALESCE(section_order, '["hero", "about", "highlights", "services", "gallery", "reviews", "contact"]'::jsonb)
  ) INTO result
  FROM business_settings
  WHERE subdomain = subdomain_input
    AND subdomain IS NOT NULL;
  
  RETURN result;
END;
$function$;