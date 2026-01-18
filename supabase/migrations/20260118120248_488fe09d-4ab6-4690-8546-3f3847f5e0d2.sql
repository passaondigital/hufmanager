-- ============================================
-- Fix: Only assign role if user exists in auth.users
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_assign_client_role_on_provider_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign role if created by a provider AND user exists in auth.users
  IF NEW.created_by_provider_id IS NOT NULL THEN
    -- Check if user exists in auth.users before inserting role
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'client'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    -- Note: Ghost profiles (no auth.users entry) don't get a role assigned here.
    -- They will get a role when they register/login via handle_new_user trigger.
  END IF;
  
  RETURN NEW;
END;
$$;