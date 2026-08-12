-- P0 SHARED SUPABASE SECURITY GATE
-- Prepared only. Do not apply to production before backup, dry run, and app impact approval.
--
-- This migration addresses the known authenticated residual risk in
-- search_horse_by_readable_id(text): knowing an EQID/readable_id must not be
-- sufficient to retrieve horse data through a SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.search_horse_by_readable_id(search_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  clean_id text;
  actor_id uuid;
BEGIN
  actor_id := auth.uid();
  clean_id := UPPER(TRIM(REPLACE(search_id, '#', '')));

  IF actor_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

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
    AND h.deleted_at IS NULL
    AND (
      h.owner_id = actor_id
      OR public.is_provider_for_horse(actor_id, h.id)
      OR public.has_horse_partner_access(actor_id, h.id)
      OR public.is_admin(actor_id)
    )
  LIMIT 1;

  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.search_horse_by_readable_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_horse_by_readable_id(text) TO authenticated, service_role;

-- Existing helper functions used by RLS should remain SECURITY DEFINER, but
-- direct anon RPC execution is not required.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.is_provider_for_horse(uuid,uuid)'),
    to_regprocedure('public.has_horse_partner_access(uuid,uuid)'),
    to_regprocedure('public.has_active_horse_partner_access(uuid,uuid)'),
    to_regprocedure('public.is_horse_owner(uuid,uuid)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;
END $$;
