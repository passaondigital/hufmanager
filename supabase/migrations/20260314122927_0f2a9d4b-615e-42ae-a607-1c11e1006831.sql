-- Create affiliate_stats aggregation table
CREATE TABLE public.affiliate_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  referral_count integer NOT NULL DEFAULT 0,
  active_referrals integer NOT NULL DEFAULT 0,
  monthly_commission integer NOT NULL DEFAULT 0,
  total_commission integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.affiliate_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers see own stats" ON public.affiliate_stats
FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Only system can modify affiliate_stats" ON public.affiliate_stats
FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX idx_affiliate_stats_provider ON public.affiliate_stats(provider_id);

-- Function to sync stats from referrals
CREATE OR REPLACE FUNCTION public.sync_affiliate_stats(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_active integer;
  v_monthly integer;
  v_total_comm integer;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'active'),
    COALESCE(sum(monthly_commission) FILTER (WHERE status = 'active'), 0)::integer,
    COALESCE(sum(total_commission), 0)::integer
  INTO v_total, v_active, v_monthly, v_total_comm
  FROM public.hufrente_referrals
  WHERE provider_id = p_provider_id;

  INSERT INTO public.affiliate_stats (provider_id, referral_count, active_referrals, monthly_commission, total_commission, last_updated)
  VALUES (p_provider_id, v_total, v_active, v_monthly, v_total_comm, now())
  ON CONFLICT (provider_id)
  DO UPDATE SET
    referral_count = v_total,
    active_referrals = v_active,
    monthly_commission = v_monthly,
    total_commission = v_total_comm,
    last_updated = now();
END;
$$;