-- FIX 1: Remove hardcoded admin email assignment from handle_new_user trigger
-- Admin roles should be assigned manually via Supabase dashboard, not automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested_role text;
  final_role app_role;
BEGIN
  -- Get the role from user metadata (if provided during signup)
  requested_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Validate the role: only allow 'provider' or 'client'
  -- Default to 'client' if invalid or not provided
  -- NOTE: Admin roles must be assigned manually via Supabase dashboard for security
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
$function$;

-- FIX 2: Add authorization check to increment_magic_link_uses RPC function
-- Only allow incrementing if the magic link exists and is active
CREATE OR REPLACE FUNCTION public.increment_magic_link_uses(link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  link_exists boolean;
BEGIN
  -- Check if the magic link exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.magic_links
    WHERE id = link_id AND is_active = true
  ) INTO link_exists;
  
  IF NOT link_exists THEN
    RAISE EXCEPTION 'Magic link not found or inactive';
  END IF;
  
  -- Increment the uses count
  UPDATE public.magic_links
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = link_id AND is_active = true;
END;
$function$;