
-- ============================================================
-- Step 1: admin_revenue_log - CopeCart Transaktionen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_revenue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT,
  event_type TEXT NOT NULL,
  plan_name TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_email TEXT,
  customer_name TEXT,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_revenue_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master admins can view revenue log"
ON public.admin_revenue_log FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Only master admins can insert revenue log"
ON public.admin_revenue_log FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

-- ============================================================
-- Step 2: admin_expenses - Ausgaben-Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT NOT NULL DEFAULT 'sonstiges',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master admins can manage expenses"
ON public.admin_expenses FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- ============================================================
-- Step 3: RLS on agent_data_hub (view already has security_invoker=on,
-- but we add explicit policy on underlying access)
-- ============================================================
-- agent_data_hub is a security_invoker view, so RLS of underlying
-- tables already applies. No extra policy needed.

-- ============================================================
-- Step 4: Add 2nd master admin
-- ============================================================
INSERT INTO public.master_admins (email)
VALUES ('barhufserviceschmid@gmail.com')
ON CONFLICT (email) DO NOTHING;
