-- Fix: prevent unauthenticated reads of full business_settings rows while keeping required app flows

BEGIN;

-- 1) Remove overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view settings by subdomain" ON public.business_settings;

-- 2) Allow connected clients (via access_grants) to read provider business_settings (authenticated only)
DROP POLICY IF EXISTS "Clients can view connected provider settings" ON public.business_settings;
CREATE POLICY "Clients can view connected provider settings"
ON public.business_settings
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.access_grants ag
    WHERE ag.provider_id = business_settings.user_id
      AND ag.client_id = auth.uid()
      AND COALESCE(ag.is_active, true) = true
      AND ag.status IN ('active', 'pending')
  )
);

-- 3) Allow admins to read all business_settings rows (for Mission Control)
DROP POLICY IF EXISTS "Admins can view all business settings" ON public.business_settings;
CREATE POLICY "Admins can view all business settings"
ON public.business_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4) Public-safe read for review submission page (no direct table access needed)
-- Returns ONLY non-sensitive fields.
CREATE OR REPLACE FUNCTION public.get_public_review_provider(provider_id_input uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'provider_id', bs.user_id,
    'business_name', bs.business_name,
    'owner_name', bs.owner_name,
    'logo_url', bs.logo_url
  )
  FROM public.business_settings bs
  WHERE bs.user_id = provider_id_input
  LIMIT 1;
$$;

COMMIT;