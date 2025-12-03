-- 1. Update has_role function to query user_roles table instead of profiles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. Create get_user_role function to query user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. Migrate existing roles from profiles to user_roles (if not already there)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = profiles.id
);

-- 4. Update handle_new_user trigger to insert into user_roles instead of setting role in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without role
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Insert role into user_roles (always default to 'client' - ignore user metadata for security)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- 5. Remove role column from profiles table (after migration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;