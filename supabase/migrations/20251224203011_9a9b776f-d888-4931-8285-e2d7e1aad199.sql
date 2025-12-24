-- Ensure triggers exist for auto-assigning clients and auto-creating access grants
DROP TRIGGER IF EXISTS trg_user_roles_auto_assign_client ON public.user_roles;
CREATE TRIGGER trg_user_roles_auto_assign_client
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_client_to_provider();

DROP TRIGGER IF EXISTS trg_profiles_auto_create_access_grant ON public.profiles;
CREATE TRIGGER trg_profiles_auto_create_access_grant
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_access_grant_for_client();

-- RPC helper: get or assign a provider for the current (authenticated) client.
-- This avoids client-side queries on user_roles which are blocked by RLS.
CREATE OR REPLACE FUNCTION public.get_or_assign_provider_for_client()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_provider_id uuid;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) If an active access grant exists, use it
  SELECT ag.provider_id
  INTO v_provider_id
  FROM public.access_grants ag
  WHERE ag.client_id = v_client_id
    AND ag.is_active = true
  ORDER BY ag.granted_at DESC
  LIMIT 1;

  IF v_provider_id IS NOT NULL THEN
    RETURN v_provider_id;
  END IF;

  -- 2) If client was created by a provider, use that provider
  SELECT p.created_by_provider_id
  INTO v_provider_id
  FROM public.profiles p
  WHERE p.id = v_client_id;

  IF v_provider_id IS NOT NULL THEN
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      is_active,
      can_view_basic,
      can_view_medical,
      can_create_appointments
    )
    VALUES (
      v_provider_id,
      v_client_id,
      true,
      true,
      true,
      true
    )
    ON CONFLICT DO NOTHING;

    RETURN v_provider_id;
  END IF;

  -- 3) Fallback: pick first available provider
  SELECT ur.user_id
  INTO v_provider_id
  FROM public.user_roles ur
  WHERE ur.role = 'provider'::app_role
  ORDER BY ur.id
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.access_grants (
    provider_id,
    client_id,
    is_active,
    can_view_basic,
    can_view_medical,
    can_create_appointments
  )
  VALUES (
    v_provider_id,
    v_client_id,
    true,
    true,
    true,
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN v_provider_id;
END;
$$;