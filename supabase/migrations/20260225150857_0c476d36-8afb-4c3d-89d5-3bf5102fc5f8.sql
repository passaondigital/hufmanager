
-- Improve handle_new_user to merge ghost profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_from_meta TEXT;
  assigned_role app_role;
  ghost_profile_id uuid;
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

  -- Check for existing ghost profile with same email
  SELECT id INTO ghost_profile_id
  FROM public.profiles
  WHERE email = new.email
    AND id != new.id
    AND deleted_at IS NULL
  LIMIT 1;

  -- If ghost profile exists, migrate data to new auth user
  IF ghost_profile_id IS NOT NULL THEN
    -- Move horses
    UPDATE public.horses SET owner_id = new.id WHERE owner_id = ghost_profile_id;
    -- Move access grants
    UPDATE public.access_grants SET client_id = new.id WHERE client_id = ghost_profile_id;
    -- Move appointments
    UPDATE public.appointments SET client_id = new.id WHERE client_id = ghost_profile_id;
    -- Move contacts
    UPDATE public.contacts SET profile_id = new.id WHERE profile_id = ghost_profile_id;
    -- Soft-delete ghost profile
    UPDATE public.profiles SET deleted_at = now() WHERE id = ghost_profile_id;
    
    RAISE LOG 'Merged ghost profile % into auth user % for email %', ghost_profile_id, new.id, new.email;
  END IF;

  -- Create or update the real profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Neuer Nutzer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name);

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;
