
-- Attach the handle_new_user trigger to auth.users
-- This is the standard Supabase pattern for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
