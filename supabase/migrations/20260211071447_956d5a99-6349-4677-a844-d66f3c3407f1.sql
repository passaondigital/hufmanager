
-- 1. hoof_photos: Drop the overly permissive "Enable read access for all users" policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.hoof_photos;

-- 2. employee_profiles: Drop the public invitation_token policy (will be replaced by edge function)
DROP POLICY IF EXISTS "Anyone can view by invitation_token" ON public.employee_profiles;
