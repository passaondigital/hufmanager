
-- Admin-only function to get auth metadata (last_sign_in, email_confirmed) for all users
-- Only callable by admins via security definer
CREATE OR REPLACE FUNCTION public.get_admin_auth_metadata()
RETURNS TABLE(
  user_id uuid,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    au.id as user_id,
    au.last_sign_in_at,
    au.email_confirmed_at
  FROM auth.users au
  WHERE public.is_admin(auth.uid())
$$;
