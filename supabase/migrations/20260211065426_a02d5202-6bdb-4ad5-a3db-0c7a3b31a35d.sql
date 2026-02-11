-- Restrict services table: replace public SELECT with auth-only SELECT
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

CREATE POLICY "Authenticated users can view active services"
  ON public.services
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);