-- Create a secure function to search profiles by exact readable_id for connection purposes
-- This only returns minimal public data (id, name, avatar, readable_id) - no sensitive info
CREATE OR REPLACE FUNCTION public.search_profile_by_readable_id(search_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  clean_id TEXT;
BEGIN
  -- Clean and normalize the input
  clean_id := UPPER(TRIM(REPLACE(search_id, '#', '')));
  
  -- Validate input length to prevent abuse
  IF char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  -- Search for the profile with exact match
  SELECT jsonb_build_object(
    'found', true,
    'id', p.id,
    'readable_id', p.readable_id,
    'full_name', COALESCE(p.full_name, 'Unbekannt'),
    'avatar_url', p.avatar_url,
    'role', (SELECT role FROM public.user_roles WHERE user_id = p.id LIMIT 1)
  )
  INTO result
  FROM public.profiles p
  WHERE p.readable_id = clean_id
    AND p.deleted_at IS NULL;
  
  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$$;

-- Create a secure function to search horses by exact readable_id
CREATE OR REPLACE FUNCTION public.search_horse_by_readable_id(search_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  clean_id TEXT;
BEGIN
  -- Clean and normalize the input
  clean_id := UPPER(TRIM(REPLACE(search_id, '#', '')));
  
  -- Validate input length
  IF char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  -- Search for the horse with exact match - only return non-sensitive data
  SELECT jsonb_build_object(
    'found', true,
    'id', h.id,
    'readable_id', h.readable_id,
    'name', h.name,
    'photo_url', h.photo_url,
    'breed', h.breed,
    'owner_id', h.owner_id
  )
  INTO result
  FROM public.horses h
  WHERE h.readable_id = clean_id
    AND h.deleted_at IS NULL;
  
  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$$;