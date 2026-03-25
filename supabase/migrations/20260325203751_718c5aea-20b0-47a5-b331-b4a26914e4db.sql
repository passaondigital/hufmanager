CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_from_meta TEXT;
  assigned_role app_role;
  ghost_profile RECORD;
BEGIN
  user_role_from_meta := new.raw_user_meta_data->>'role';

  IF user_role_from_meta = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSIF user_role_from_meta = 'admin' THEN
    assigned_role := 'admin'::app_role;
  ELSIF user_role_from_meta = 'partner' THEN
    assigned_role := 'partner'::app_role;
  ELSE
    assigned_role := 'provider'::app_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Neuer Nutzer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  FOR ghost_profile IN
    SELECT p.id, p.created_by_provider_id
    FROM public.profiles p
    WHERE p.email = new.email
      AND p.id <> new.id
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = p.id
      )
    ORDER BY (p.created_by_provider_id IS NOT NULL) DESC, p.created_at ASC NULLS LAST, p.id ASC
  LOOP
    UPDATE public.horses
    SET owner_id = new.id
    WHERE owner_id = ghost_profile.id;

    UPDATE public.appointments
    SET client_id = new.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.contacts
    SET profile_id = new.id
    WHERE profile_id = ghost_profile.id;

    UPDATE public.access_grants ag
    SET client_id = new.id
    WHERE ag.client_id = ghost_profile.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com',
            'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com',
            'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com',
            'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.access_grants ag
    SET is_active = false,
        status = CASE
          WHEN ag.status IN ('revoked', 'rejected', 'cancelled') THEN ag.status
          ELSE 'revoked'
        END,
        revoked_at = COALESCE(ag.revoked_at, now()),
        updated_at = now()
    WHERE ag.client_id = ghost_profile.id
      AND EXISTS (
        SELECT 1
        FROM public.profiles provider_profile
        WHERE provider_profile.id = ag.provider_id
          AND provider_profile.email = ANY(ARRAY[
            'hufbearbeiter.hufmanager@gmail.com',
            'pferdebesitzer.hufmanager@gmail.com',
            'mitarbeiter.hufmanager@gmail.com',
            'partner.hufmanager@gmail.com',
            'hufmanagerbusiness@gmail.com',
            'hufmanagerstallbetreiber@gmail.com'
          ])
      );

    UPDATE public.profiles
    SET deleted_at = now()
    WHERE id = ghost_profile.id;

    RAISE LOG 'Merged ghost profile % into auth user % for email %', ghost_profile.id, new.id, new.email;
  END LOOP;

  RETURN new;
END;
$$;