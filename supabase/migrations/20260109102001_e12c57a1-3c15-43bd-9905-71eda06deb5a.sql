
-- Fix Demo Provider's readable_id (should be PID, not KID)
UPDATE profiles 
SET readable_id = 'PID-979047',
    full_name = 'Chef Hufbearbeiter'
WHERE email = 'hufbearbeiter.hufmanager@gmail.com';

-- Fix Demo Client's name for clarity
UPDATE profiles 
SET full_name = 'Demo Pferdebesitzer'
WHERE email = 'Pferdebesitzer.hufmanager@gmail.com';

-- Improve the readable_id trigger to check auth.users metadata for role
-- This runs BEFORE user_roles is populated, so we need to check raw_user_meta_data
CREATE OR REPLACE FUNCTION public.generate_profile_readable_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  prefix TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
  user_role_from_meta TEXT;
  user_role app_role;
BEGIN
  -- Skip if already has a readable_id
  IF NEW.readable_id IS NOT NULL AND NEW.readable_id != '' THEN
    RETURN NEW;
  END IF;
  
  -- First try to get role from user_roles table (if already set)
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  
  -- If not found, try to get from auth.users metadata (set during signup)
  IF user_role IS NULL THEN
    SELECT raw_user_meta_data->>'role' INTO user_role_from_meta
    FROM auth.users 
    WHERE id = NEW.id;
    
    IF user_role_from_meta = 'provider' THEN
      user_role := 'provider'::app_role;
    ELSIF user_role_from_meta = 'client' THEN
      user_role := 'client'::app_role;
    END IF;
  END IF;
  
  -- Determine prefix based on role
  IF user_role = 'provider' THEN
    prefix := 'PID';
  ELSIF user_role = 'admin' THEN
    prefix := 'AID';
  ELSE
    -- Default to KID for clients and unknown
    prefix := 'KID';
  END IF;
  
  -- Generate unique ID
  LOOP
    new_id := generate_random_id(prefix);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE readable_id = new_id) THEN
      NEW.readable_id := new_id;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique readable_id';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;
