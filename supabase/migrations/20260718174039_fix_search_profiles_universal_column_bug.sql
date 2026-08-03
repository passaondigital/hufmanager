-- Unabhängiger, vorbestehender Bug (beim Legit-Check des is_discoverable-Fixes
-- entdeckt): die Funktion referenzierte p.plz — diese Spalte existiert auf
-- public.profiles nicht (die Spalte heißt zip_code). Dadurch schlug die
-- Funktion für ALLE Aufrufer und ALLE Suchzweige mit einem SQL-Fehler fehl,
-- unabhängig vom is_discoverable-Fix in dieser Session.
CREATE OR REPLACE FUNCTION public.search_profiles_universal(search_term text, search_limit integer DEFAULT 15)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  results json;
  clean_term text;
BEGIN
  clean_term := trim(search_term);

  IF length(clean_term) < 2 THEN
    RETURN '[]'::json;
  END IF;

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
        p.zip_code as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.readable_id ILIKE clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      LIMIT search_limit
    ) r;

  ELSIF clean_term LIKE '%@%' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE u.email ILIKE '%' || clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      LIMIT search_limit
    ) r;

  ELSIF clean_term ~ '^\d{4,5}$' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        (SELECT pbs.specialty FROM partner_business_settings pbs WHERE pbs.partner_id = p.id LIMIT 1) as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.zip_code ILIKE clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      ORDER BY p.full_name ASC
      LIMIT search_limit
    ) r;

  ELSE
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
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
        AND p.deleted_at IS NULL
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
$function$;
