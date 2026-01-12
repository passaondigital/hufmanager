
-- First drop the conflicting trigger explicitly
DROP TRIGGER IF EXISTS on_profile_created_add_role ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Now we can drop the function
DROP FUNCTION IF EXISTS public.handle_new_profile_role() CASCADE;

-- Fix handle_new_user to respect role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_from_meta TEXT;
  assigned_role app_role;
BEGIN
  -- Get role from user metadata (set during admin creation or signup)
  user_role_from_meta := new.raw_user_meta_data->>'role';
  
  -- Default to provider for users created by admin, client for self-signups
  -- If explicitly set in metadata, use that
  IF user_role_from_meta = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSIF user_role_from_meta = 'admin' THEN
    assigned_role := 'admin'::app_role;
  ELSE
    -- Default to provider (for admin-created users and self-signups on provider flow)
    assigned_role := 'provider'::app_role;
  END IF;

  -- 1. Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Neuer Nutzer')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Assign role - Use upsert to ensure correct role even if profile trigger ran first
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;
