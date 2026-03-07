
-- ═══════════════════════════════════════════════════════════════
-- HufManager Admin B2B Billing System (PASSAON → Provider)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. admin_invoices ────────────────────────────────────────
CREATE TABLE public.admin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_pid TEXT,
  provider_name TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  provider_address TEXT,
  plan TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 0,
  vat_amount NUMERIC(10,2) DEFAULT 0,
  kleinunternehmer BOOLEAN DEFAULT true,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. admin_invoice_items ───────────────────────────────────
CREATE TABLE public.admin_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.admin_invoices(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'Monat',
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. admin_dunning_log ─────────────────────────────────────
CREATE TABLE public.admin_dunning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.admin_invoices(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id),
  level INT NOT NULL,
  fee NUMERIC(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. contract_templates ────────────────────────────────────
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  plan TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  content_html TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. admin_contracts ───────────────────────────────────────
CREATE TABLE public.admin_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL DEFAULT '',
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_pid TEXT,
  template_id UUID REFERENCES public.contract_templates(id),
  plan TEXT NOT NULL,
  plan_price_monthly NUMERIC(10,2),
  plan_price_yearly NUMERIC(10,2),
  custom_price NUMERIC(10,2),
  period_start DATE NOT NULL,
  period_end DATE,
  auto_renew BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  payment_method TEXT DEFAULT 'copecart',
  content_html TEXT,
  variables_used JSONB,
  provider_signature TEXT,
  provider_signed_at TIMESTAMPTZ,
  admin_signature TEXT,
  admin_signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  cancellation_requested_at TIMESTAMPTZ,
  cancellation_effective_date DATE,
  cancellation_reason TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 6. Indexes ───────────────────────────────────────────────
CREATE INDEX idx_admin_invoices_provider ON public.admin_invoices(provider_id);
CREATE INDEX idx_admin_invoices_status ON public.admin_invoices(status);
CREATE INDEX idx_admin_invoices_period ON public.admin_invoices(period_start, period_end);
CREATE INDEX idx_admin_invoice_items_invoice ON public.admin_invoice_items(invoice_id);
CREATE INDEX idx_admin_dunning_invoice ON public.admin_dunning_log(invoice_id);
CREATE INDEX idx_admin_dunning_status ON public.admin_dunning_log(status);
CREATE INDEX idx_admin_contracts_provider ON public.admin_contracts(provider_id);
CREATE INDEX idx_admin_contracts_status ON public.admin_contracts(status);
CREATE INDEX idx_contract_templates_type ON public.contract_templates(type, is_active);

-- ── 7. Auto-Increment Invoice Number ─────────────────────────
CREATE OR REPLACE FUNCTION public.generate_admin_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_seq INT;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)
  ), 0) + 1
  INTO v_seq
  FROM public.admin_invoices
  WHERE invoice_number LIKE 'HM-' || v_year || '-%';

  NEW.invoice_number := 'HM-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_invoice_number
  BEFORE INSERT ON public.admin_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_admin_invoice_number();

-- ── 8. Auto-Increment Contract Number ────────────────────────
CREATE OR REPLACE FUNCTION public.generate_admin_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_seq INT;
BEGIN
  IF NEW.contract_number IS NOT NULL AND NEW.contract_number != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(contract_number, '-', 3) AS INT)
  ), 0) + 1
  INTO v_seq
  FROM public.admin_contracts
  WHERE contract_number LIKE 'HMV-' || v_year || '-%';

  NEW.contract_number := 'HMV-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_contract_number
  BEFORE INSERT ON public.admin_contracts
  FOR EACH ROW
  WHEN (NEW.contract_number IS NULL OR NEW.contract_number = '')
  EXECUTE FUNCTION public.generate_admin_contract_number();

-- ── 9. Updated_at Triggers ───────────────────────────────────
CREATE TRIGGER trg_admin_invoices_updated
  BEFORE UPDATE ON public.admin_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_ecosystem_links_updated_at();

CREATE TRIGGER trg_admin_contracts_updated
  BEFORE UPDATE ON public.admin_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_ecosystem_links_updated_at();

CREATE TRIGGER trg_contract_templates_updated
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_ecosystem_links_updated_at();

-- ── 10. Validation Triggers ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_admin_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'paid', 'overdue', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  IF NEW.payment_method NOT IN ('bank_transfer', 'copecart', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method: %', NEW.payment_method;
  END IF;
  IF NEW.payment_source NOT IN ('manual', 'copecart', 'auto_cron') THEN
    RAISE EXCEPTION 'Invalid payment source: %', NEW.payment_source;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_admin_invoice
  BEFORE INSERT OR UPDATE ON public.admin_invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_invoice_status();

CREATE OR REPLACE FUNCTION public.validate_admin_contract_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'active', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Invalid contract status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_admin_contract
  BEFORE INSERT OR UPDATE ON public.admin_contracts
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_contract_status();

CREATE OR REPLACE FUNCTION public.validate_dunning_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.level NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Invalid dunning level: %. Must be 1, 2, or 3', NEW.level;
  END IF;
  IF NEW.status NOT IN ('pending', 'sent', 'resolved') THEN
    RAISE EXCEPTION 'Invalid dunning status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_dunning
  BEFORE INSERT OR UPDATE ON public.admin_dunning_log
  FOR EACH ROW EXECUTE FUNCTION public.validate_dunning_level();

-- ── 11. RLS ──────────────────────────────────────────────────
ALTER TABLE public.admin_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_dunning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_contracts ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_invoices_admin_all" ON public.admin_invoices
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_invoice_items_admin_all" ON public.admin_invoice_items
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_dunning_admin_all" ON public.admin_dunning_log
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "contract_templates_admin_all" ON public.contract_templates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_contracts_admin_all" ON public.admin_contracts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Provider: read own data
CREATE POLICY "admin_invoices_provider_select" ON public.admin_invoices
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "admin_invoice_items_provider_select" ON public.admin_invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_invoices ai
    WHERE ai.id = invoice_id AND ai.provider_id = auth.uid()
  ));

CREATE POLICY "admin_dunning_provider_select" ON public.admin_dunning_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_invoices ai
    WHERE ai.id = invoice_id AND ai.provider_id = auth.uid()
  ));

CREATE POLICY "contract_templates_provider_select" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "admin_contracts_provider_select" ON public.admin_contracts
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());
