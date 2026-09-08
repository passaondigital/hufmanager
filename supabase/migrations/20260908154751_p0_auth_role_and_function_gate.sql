-- P0 AUTH / FUNCTION GATE
-- Prepared locally. Do not apply to production without the documented
-- backup, review and staging gates.
--
-- Security boundary:
-- * raw_user_meta_data is user-controlled and may never grant admin.
-- * service/admin-created accounts may carry a trusted role in
--   raw_app_meta_data.
-- * public signup keeps compatibility for provider/client, while partner
--   and admin require trusted app metadata or an explicit server-side path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  requested_app_role text;
  assigned_role app_role;
  ghost_profile RECORD;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';
  requested_app_role := NEW.raw_app_meta_data->>'role';

  -- Only app_metadata is trusted for privileged roles. raw_user_meta_data is
  -- retained for the public provider/client signup compatibility path, but can
  -- never create admin or partner authority.
  IF requested_app_role IN ('admin', 'employee', 'partner', 'provider', 'client') THEN
    assigned_role := requested_app_role::app_role;
  ELSIF requested_role = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSE
    assigned_role := 'provider'::app_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name,
    signup_app, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, signup_referrer, landing_path
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Neuer Nutzer'),
    NEW.raw_user_meta_data->>'signup_app',
    NEW.raw_user_meta_data->>'utm_source',
    NEW.raw_user_meta_data->>'utm_medium',
    NEW.raw_user_meta_data->>'utm_campaign',
    NEW.raw_user_meta_data->>'utm_content',
    NEW.raw_user_meta_data->>'utm_term',
    NEW.raw_user_meta_data->>'signup_referrer',
    NEW.raw_user_meta_data->>'landing_path'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    signup_app = COALESCE(public.profiles.signup_app, EXCLUDED.signup_app),
    utm_source = COALESCE(public.profiles.utm_source, EXCLUDED.utm_source),
    utm_medium = COALESCE(public.profiles.utm_medium, EXCLUDED.utm_medium),
    utm_campaign = COALESCE(public.profiles.utm_campaign, EXCLUDED.utm_campaign),
    utm_content = COALESCE(public.profiles.utm_content, EXCLUDED.utm_content),
    utm_term = COALESCE(public.profiles.utm_term, EXCLUDED.utm_term),
    signup_referrer = COALESCE(public.profiles.signup_referrer, EXCLUDED.signup_referrer),
    landing_path = COALESCE(public.profiles.landing_path, EXCLUDED.landing_path);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Preserve the existing ghost-profile merge behavior. This remains inside
  -- the same auth trigger transaction and does not expand the role boundary.
  FOR ghost_profile IN
    SELECT p.id, p.created_by_provider_id
    FROM public.profiles p
    WHERE p.email = NEW.email
      AND p.id <> NEW.id
      AND p.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
    ORDER BY (p.created_by_provider_id IS NOT NULL) DESC, p.created_at ASC NULLS LAST, p.id ASC
  LOOP
    UPDATE public.horses SET owner_id = NEW.id WHERE owner_id = ghost_profile.id;
    UPDATE public.appointments SET client_id = NEW.id WHERE client_id = ghost_profile.id;
    UPDATE public.contacts SET profile_id = NEW.id WHERE profile_id = ghost_profile.id;

    UPDATE public.access_grants ag
    SET client_id = NEW.id
    WHERE ag.client_id = ghost_profile.id
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com', 'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com', 'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com', 'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.access_grants ag
    SET is_active = false,
        status = CASE WHEN ag.status IN ('revoked', 'rejected', 'cancelled') THEN ag.status ELSE 'revoked' END,
        revoked_at = COALESCE(ag.revoked_at, now()), updated_at = now()
    WHERE ag.client_id = ghost_profile.id
      AND EXISTS (
        SELECT 1 FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com', 'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com', 'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com', 'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.profiles SET deleted_at = now() WHERE id = ghost_profile.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger/helper and high-risk admin functions must not be public RPC APIs.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.generate_random_id(text)'),
    to_regprocedure('public.admin_repair_user_role(uuid,text,uuid,text)'),
    to_regprocedure('public.delete_client_cascade(uuid)'),
    to_regprocedure('public.delete_provider_cascade(uuid)'),
    to_regprocedure('public.delete_horse_safe(uuid)'),
    to_regprocedure('public.get_admin_auth_metadata(uuid)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    END IF;
  END LOOP;
END $$;
