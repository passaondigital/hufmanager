-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that respects role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  requested_role text;
  final_role app_role;
BEGIN
  -- Get the role from user metadata (if provided during signup)
  requested_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Validate the role: only allow 'provider' or 'client'
  -- Default to 'client' if invalid or not provided
  IF requested_role = 'provider' THEN
    final_role := 'provider';
  ELSE
    final_role := 'client';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Insert the role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role);
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();