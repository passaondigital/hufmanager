
-- Landing Page Erweiterung: Hero-Bild, Social Links
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_tiktok text,
ADD COLUMN IF NOT EXISTS social_website text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Update the public landing RPC to include new fields
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
    'hero_image_url', hero_image_url,
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
    'section_order', COALESCE(section_order, '["hero", "about", "services", "highlights", "gallery", "reviews", "contact"]'::jsonb),
    'social_instagram', social_instagram,
    'social_facebook', social_facebook,
    'social_tiktok', social_tiktok,
    'social_website', social_website,
    'meta_description', meta_description
  ) INTO result
  FROM business_settings
  WHERE subdomain = subdomain_input
    AND subdomain IS NOT NULL;
  
  RETURN result;
END;
$function$;
