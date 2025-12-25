-- Fix magic link enumeration vulnerability
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can read active magic links by slug" ON public.magic_links;

-- Create a SECURITY DEFINER function to validate magic links without exposing the table
CREATE OR REPLACE FUNCTION public.validate_magic_link(slug_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_data JSONB;
BEGIN
  -- Validate input
  IF slug_input IS NULL OR char_length(slug_input) > 20 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  -- Look up the magic link and return provider info
  SELECT jsonb_build_object(
    'valid', true,
    'id', ml.id,
    'provider_id', ml.provider_id,
    'provider_name', COALESCE(p.full_name, 'Hufbearbeiter'),
    'provider_avatar', p.avatar_url
  )
  INTO link_data
  FROM public.magic_links ml
  LEFT JOIN public.profiles p ON p.id = ml.provider_id AND p.deleted_at IS NULL
  WHERE ml.slug = slug_input 
    AND ml.is_active = true;
  
  -- Return result (null becomes invalid response)
  RETURN COALESCE(link_data, jsonb_build_object('valid', false));
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.validate_magic_link(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_magic_link(TEXT) TO authenticated;

-- Keep the existing provider policy for managing their own links
-- (already exists: "Providers can manage their own magic links")