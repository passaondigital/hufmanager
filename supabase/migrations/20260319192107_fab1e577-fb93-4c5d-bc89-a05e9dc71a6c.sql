-- Update universal search to support "Beruf" (specialty/profession) search
CREATE OR REPLACE FUNCTION public.search_profiles_universal(
  search_term text,
  search_limit int DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  results json;
  clean_term text;
BEGIN
  clean_term := trim(search_term);
  
  IF length(clean_term) < 2 THEN
    RETURN '[]'::json;
  END IF;

  -- ID-based search (#PID-xxx, #KID-xxx, etc.)
  IF clean_term ~ '^#?[A-Z]{2,4}-' OR clean_term ~ '^(PID|KID|PRID|EQID|EID)' THEN
    clean_term := regexp_replace(clean_term, '^#', '');
    
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT 
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.plz as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.readable_id ILIKE clean_term || '%'
      LIMIT search_limit
    ) r;
  
  -- Email search
  ELSIF clean_term LIKE '%@%' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT 
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.plz as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE u.email ILIKE clean_term
      LIMIT search_limit
    ) r;
  
  -- PLZ search (4-5 digits)
  ELSIF clean_term ~ '^\d{4,5}$' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT 
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.plz as postal_code,
        (SELECT pbs.specialty FROM partner_business_settings pbs WHERE pbs.partner_id = p.id LIMIT 1) as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.plz ILIKE clean_term || '%'
        AND p.is_discoverable = true
      ORDER BY p.full_name ASC
      LIMIT search_limit
    ) r;
  
  ELSE
    -- Combined Name + Beruf/Specialty search
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT 
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.plz as postal_code,
        pbs.specialty,
        'profile' as result_type
      FROM profiles p
      LEFT JOIN partner_business_settings pbs ON pbs.partner_id = p.id
      WHERE (
        p.full_name ILIKE '%' || clean_term || '%'
        OR p.readable_id ILIKE '%' || clean_term || '%'
        OR pbs.specialty ILIKE '%' || clean_term || '%'
        OR pbs.qualifications ILIKE '%' || clean_term || '%'
      )
        AND p.is_discoverable = true
      ORDER BY 
        CASE WHEN p.full_name ILIKE clean_term || '%' THEN 0
             WHEN pbs.specialty ILIKE '%' || clean_term || '%' THEN 1
             ELSE 2 END,
        p.full_name ASC
      LIMIT search_limit
    ) r;
  END IF;

  RETURN COALESCE(results, '[]'::json);
END;
$$;