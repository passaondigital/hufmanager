
-- Partner contracts table
CREATE TABLE public.partner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avv_signed_at TIMESTAMPTZ,
  avv_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can read own contract" ON public.partner_contracts
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Partners can insert own contract" ON public.partner_contracts
  FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Partners can update own contract" ON public.partner_contracts
  FOR UPDATE TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "Admins can read all partner contracts" ON public.partner_contracts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Employee contracts table
CREATE TABLE public.employee_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avv_signed_at TIMESTAMPTZ,
  avv_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_user_id)
);

ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own contract" ON public.employee_contracts
  FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

CREATE POLICY "Employees can insert own contract" ON public.employee_contracts
  FOR INSERT TO authenticated
  WITH CHECK (employee_user_id = auth.uid());

CREATE POLICY "Employees can update own contract" ON public.employee_contracts
  FOR UPDATE TO authenticated
  USING (employee_user_id = auth.uid());

CREATE POLICY "Admins can read all employee contracts" ON public.employee_contracts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
