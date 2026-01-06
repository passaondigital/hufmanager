-- Fix: SECURITY DEFINER Function Auto-Creates Access Grants without consent
-- This migration updates the get_or_assign_provider_for_client() function to:
-- 1. Create access grants with 'pending' status instead of 'active'
-- 2. Notify the provider about the new client assignment
-- 3. Add better documentation

CREATE OR REPLACE FUNCTION public.get_or_assign_provider_for_client()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid := auth.uid();
  v_provider_id uuid;
  v_existing_grant_id uuid;
BEGIN
  -- Safety check: must be authenticated
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- First, check if client already has an active/pending grant with any provider
  SELECT ag.provider_id, ag.id INTO v_provider_id, v_existing_grant_id
  FROM public.access_grants ag
  WHERE ag.client_id = v_client_id
    AND COALESCE(ag.is_active, true) = true
    AND ag.status IN ('active', 'pending')
  ORDER BY ag.granted_at DESC
  LIMIT 1;

  -- If already has a provider, return that provider's ID
  IF v_provider_id IS NOT NULL THEN
    RETURN v_provider_id;
  END IF;

  -- Check if client was created by a specific provider
  SELECT p.created_by_provider_id INTO v_provider_id
  FROM public.profiles p
  WHERE p.id = v_client_id
    AND p.created_by_provider_id IS NOT NULL;

  -- If client was created by a provider, use that provider
  IF v_provider_id IS NOT NULL THEN
    -- Create access grant with PENDING status - requires provider approval
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      can_view_basic,
      can_view_medical,
      can_create_appointments,
      is_active,
      status,
      requested_by,
      requested_at
    )
    VALUES (
      v_provider_id,
      v_client_id,
      true,
      false, -- Don't grant medical access by default
      false, -- Don't grant appointment creation by default
      true,
      'pending', -- Requires provider approval
      v_client_id,
      now()
    )
    ON CONFLICT DO NOTHING;

    -- Notify the provider about the new client request
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    )
    VALUES (
      v_provider_id,
      'Neue Verbindungsanfrage',
      'Ein neuer Client möchte sich mit Ihnen verbinden. Bitte überprüfen Sie die Anfrage.',
      'info',
      '/netzwerk'
    );

    RETURN v_provider_id;
  END IF;

  -- Fallback: Find first available provider (for orphaned clients)
  -- Note: This is a fallback mechanism and grants only pending status
  SELECT ur.user_id INTO v_provider_id
  FROM public.user_roles ur
  WHERE ur.role = 'provider'::app_role
  ORDER BY ur.id
  LIMIT 1;

  IF v_provider_id IS NOT NULL THEN
    -- Create access grant with PENDING status
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      can_view_basic,
      can_view_medical,
      can_create_appointments,
      is_active,
      status,
      requested_by,
      requested_at
    )
    VALUES (
      v_provider_id,
      v_client_id,
      true,
      false,
      false,
      true,
      'pending', -- Requires provider approval
      v_client_id,
      now()
    )
    ON CONFLICT DO NOTHING;

    -- Notify the provider about the new client request
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    )
    VALUES (
      v_provider_id,
      'Neue Verbindungsanfrage',
      'Ein neuer Client möchte sich mit Ihnen verbinden. Bitte überprüfen Sie die Anfrage.',
      'info',
      '/netzwerk'
    );
  END IF;

  RETURN v_provider_id;
END;
$$;

-- Add comment documenting the security considerations
COMMENT ON FUNCTION public.get_or_assign_provider_for_client() IS 
'Assigns a provider to a client user. Security considerations:
- Uses SECURITY DEFINER to bypass RLS for grant creation
- Creates grants with PENDING status requiring provider approval
- Notifies provider of new connection requests
- Only grants basic view access by default (no medical/appointment rights)
- search_path is fixed to prevent injection attacks';