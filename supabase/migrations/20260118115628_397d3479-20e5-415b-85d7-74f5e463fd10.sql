-- ============================================
-- Auto-assign client role when provider creates a profile
-- ============================================

-- Function to auto-assign client role when a profile is created by a provider
CREATE OR REPLACE FUNCTION public.auto_assign_client_role_on_provider_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign role if created by a provider
  IF NEW.created_by_provider_id IS NOT NULL THEN
    -- Insert client role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_auto_assign_client_role_provider_created ON public.profiles;

CREATE TRIGGER trg_auto_assign_client_role_provider_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_client_role_on_provider_created();