
-- 1. DB function to get demo user IDs (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_demo_user_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT id FROM auth.users
      WHERE email = ANY(ARRAY[
        'pferdebesitzer.hufmanager@gmail.com',
        'hufbearbeiter.hufmanager@gmail.com',
        'partner.hufmanager@gmail.com',
        'mitarbeiter.hufmanager@gmail.com'
      ])
    ),
    ARRAY[]::UUID[]
  )
$$;

-- 2. Provider contracts table for AVV/legal tracking
CREATE TABLE IF NOT EXISTS public.provider_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avv_signed_at TIMESTAMPTZ,
  avv_version TEXT,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  privacy_accepted_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id)
);

ALTER TABLE public.provider_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage provider_contracts"
ON public.provider_contracts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Providers can read their own contract
CREATE POLICY "Providers can read own contract"
ON public.provider_contracts
FOR SELECT
TO authenticated
USING (provider_id = auth.uid());
