-- Hufrente referral tracking
CREATE TABLE IF NOT EXISTS public.hufrente_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id),
  referred_email text,
  referred_name_anonymous text,
  status text NOT NULL DEFAULT 'pending',
  monthly_commission numeric(10,2) DEFAULT 0,
  total_commission numeric(10,2) DEFAULT 0,
  copecart_affiliate_id text,
  copecart_referral_id text,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hufrente_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers see own referrals"
  ON public.hufrente_referrals FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Service role can manage referrals"
  ON public.hufrente_referrals FOR ALL
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_hufrente_referrals_provider ON public.hufrente_referrals(provider_id);