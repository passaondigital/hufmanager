
-- Fix infinite recursion: make is_provider_for_horse SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_provider_for_horse(_provider_id uuid, _horse_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.profiles p ON p.id = h.owner_id
    WHERE h.id = _horse_id
    AND h.deleted_at IS NULL
    AND (
      p.created_by_provider_id = _provider_id
      OR EXISTS (
        SELECT 1 FROM public.access_grants ag
        WHERE ag.client_id = h.owner_id
        AND ag.provider_id = _provider_id
        AND ag.is_active = true
      )
    )
  );
$$;
