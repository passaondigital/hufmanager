-- EQID SEARCH HARDENING
-- Remove owner_id from search_horse_by_readable_id JSON response to prevent exposing owner identity by EQID lookup.

CREATE OR REPLACE FUNCTION public.search_horse_by_readable_id(search_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Search for the horse with exact match - return non-sensitive preview data without owner_id
  SELECT jsonb_build_object(
    'found', true,
    'id', h.id,
    'readable_id', h.readable_id,
    'name', h.name,
    'photo_url', h.photo_url,
    'breed', h.breed
  )
  INTO result
  FROM public.horses h
  WHERE h.readable_id = clean_id
    AND h.deleted_at IS NULL;
  
  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$function$;

REVOKE ALL ON FUNCTION public.search_horse_by_readable_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_horse_by_readable_id(text) TO authenticated, service_role;
