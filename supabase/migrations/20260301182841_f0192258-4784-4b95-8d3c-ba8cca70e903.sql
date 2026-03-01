
-- Table for manual payment tracking by admin
CREATE TABLE public.admin_provider_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT NOT NULL DEFAULT 'bar', -- bar, überweisung, paypal, sonstige
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_name TEXT, -- e.g. 'Pro', 'Starter', 'Lifetime'
  period_start DATE,
  period_end DATE,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_provider_payments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payments
CREATE POLICY "Admins can manage provider payments"
  ON public.admin_provider_payments
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
