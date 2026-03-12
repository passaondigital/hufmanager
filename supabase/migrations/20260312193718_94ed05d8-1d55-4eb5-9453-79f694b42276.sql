
-- ============================================
-- FIX 1: PFERDEAKTE WAITLIST
-- ============================================
CREATE TABLE IF NOT EXISTS public.pferdeakte_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  name TEXT,
  company TEXT,
  is_partner_interest BOOLEAN DEFAULT FALSE,
  partner_type TEXT,
  referral_code TEXT UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

ALTER TABLE public.pferdeakte_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_waitlist" ON public.pferdeakte_waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_read_waitlist" ON public.pferdeakte_waitlist
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email IN (
        'passaondigital@gmail.com',
        'barhufserviceschmid@gmail.com'
      )
    )
  );

CREATE POLICY "admin_update_waitlist" ON public.pferdeakte_waitlist
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email IN (
        'passaondigital@gmail.com',
        'barhufserviceschmid@gmail.com'
      )
    )
  );

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON public.pferdeakte_waitlist(email);
CREATE INDEX IF NOT EXISTS waitlist_referral_idx ON public.pferdeakte_waitlist(referral_code);
CREATE INDEX IF NOT EXISTS waitlist_role_idx ON public.pferdeakte_waitlist(role);

-- ============================================
-- FIX 2: TRIGGER BINDINGS
-- ============================================
DROP TRIGGER IF EXISTS trg_validate_horse_status ON public.horses;
CREATE TRIGGER trg_validate_horse_status
  BEFORE INSERT OR UPDATE OF horse_status
  ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_horse_status();

DROP TRIGGER IF EXISTS horse_audit_trigger ON public.horses;
CREATE TRIGGER horse_audit_trigger
  AFTER UPDATE
  ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_horse_action();

-- ============================================
-- FIX 3: CHECK CONSTRAINT (nur horse_status)
-- partner_type nutzt bereits ENUM — kein CHECK nötig
-- ============================================
ALTER TABLE public.horses
  DROP CONSTRAINT IF EXISTS horses_horse_status_check;
ALTER TABLE public.horses
  ADD CONSTRAINT horses_horse_status_check
  CHECK (horse_status IS NULL OR horse_status IN ('active','sold','deceased','stolen','archived'));

-- ============================================
-- FIX 4: OFFICE-PDFS → PRIVATE
-- ============================================
UPDATE storage.buckets SET public = FALSE WHERE name = 'office-pdfs';

-- ============================================
-- FIX 5: TRANSFERS BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfers', 'transfers', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIX 6: PROVIDER SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_price NUMERIC(10,2),
  billing_cycle TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  next_billing_date DATE,
  payment_method TEXT DEFAULT 'manual',
  external_subscription_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.provider_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_own_sub" ON public.provider_subscriptions
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "admin_all_subs" ON public.provider_subscriptions
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email IN (
        'passaondigital@gmail.com',
        'barhufserviceschmid@gmail.com'
      )
    )
  );

CREATE INDEX IF NOT EXISTS provider_subs_provider_idx ON public.provider_subscriptions(provider_id);
CREATE INDEX IF NOT EXISTS provider_subs_status_idx ON public.provider_subscriptions(status);

-- ============================================
-- FIX 7: MANUAL PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  plan_name TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_own_payments" ON public.manual_payments
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "admin_all_payments" ON public.manual_payments
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email IN (
        'passaondigital@gmail.com',
        'barhufserviceschmid@gmail.com'
      )
    )
  );

CREATE INDEX IF NOT EXISTS manual_payments_provider_idx ON public.manual_payments(provider_id);
CREATE INDEX IF NOT EXISTS manual_payments_date_idx ON public.manual_payments(payment_date DESC);
