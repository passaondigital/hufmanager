-- Update handle_new_user function to auto-assign admin role for specific emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
  final_role app_role;
  admin_emails text[] := ARRAY['passaondigital@gmail.com', 'teamhufmanager@gmail.com'];
BEGIN
  -- Check if user email is in admin list
  IF NEW.email = ANY(admin_emails) THEN
    final_role := 'admin';
  ELSE
    -- Get the role from user metadata (if provided during signup)
    requested_role := NEW.raw_user_meta_data ->> 'role';
    
    -- Validate the role: only allow 'provider' or 'client'
    -- Default to 'client' if invalid or not provided
    IF requested_role = 'provider' THEN
      final_role := 'provider';
    ELSE
      final_role := 'client';
    END IF;
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