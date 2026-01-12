-- Remove the incorrectly configured RLS policy that compares auth.uid() to id instead of user_id
DROP POLICY IF EXISTS "Own settings" ON public.business_settings;