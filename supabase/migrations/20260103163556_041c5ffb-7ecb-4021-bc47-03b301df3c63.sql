-- Auto-create user_role when profile is inserted (handles self-healing profiles)
CREATE OR REPLACE FUNCTION public.handle_new_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default to 'client' role for new profiles without a role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_created_add_role ON profiles;

-- Create trigger for new profile insertions
CREATE TRIGGER on_profile_created_add_role
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_role();