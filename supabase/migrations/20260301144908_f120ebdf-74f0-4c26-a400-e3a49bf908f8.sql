-- ============================================
-- DOMAIN RESELLER INFRASTRUCTURE (INACTIVE/PREP)
-- ============================================

-- 1. Domain Products (TLD pricing catalog)
CREATE TABLE public.domain_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tld VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  register_price_cents INTEGER NOT NULL,
  renewal_price_cents INTEGER NOT NULL,
  transfer_price_cents INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.domain_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_domain_products" ON public.domain_products
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "public_read_domain_products" ON public.domain_products
  FOR SELECT USING (is_available = true);

-- 2. Customer Domains
CREATE TABLE public.customer_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type VARCHAR(20) NOT NULL DEFAULT 'provider',
  domain_name VARCHAR(255) NOT NULL UNIQUE,
  tld VARCHAR(20) NOT NULL,
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  registrar_reference VARCHAR(100),
  nameservers JSONB DEFAULT '[]'::jsonb,
  dns_records JSONB DEFAULT '[]'::jsonb,
  price_paid_cents INTEGER,
  renewal_price_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_own_domains" ON public.customer_domains
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "admin_manage_all_domains" ON public.customer_domains
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX idx_customer_domains_owner ON public.customer_domains(owner_id);
CREATE INDEX idx_customer_domains_status ON public.customer_domains(status);
CREATE INDEX idx_customer_domains_expires ON public.customer_domains(expires_at);

-- 3. Domain Orders
CREATE TABLE public.domain_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.customer_domains(id) ON DELETE SET NULL,
  order_type VARCHAR(20) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  tld VARCHAR(20) NOT NULL,
  amount_cents INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.domain_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_own_orders" ON public.domain_orders
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "admin_manage_all_orders" ON public.domain_orders
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX idx_domain_orders_owner ON public.domain_orders(owner_id);

-- 4. Domain Waitlist
CREATE TABLE public.domain_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type VARCHAR(20) NOT NULL DEFAULT 'provider',
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id)
);

ALTER TABLE public.domain_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_own_waitlist" ON public.domain_waitlist
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "admin_read_waitlist" ON public.domain_waitlist
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 5. Seed domain_products with pricing
INSERT INTO public.domain_products (tld, display_name, register_price_cents, renewal_price_cents, transfer_price_cents, is_available, is_featured, sort_order) VALUES
  ('.de', '.de Domain', 1200, 1200, 1200, true, true, 1),
  ('.com', '.com Domain', 1500, 1500, 1500, true, false, 2),
  ('.at', '.at Domain', 1800, 1800, 1800, true, false, 3),
  ('.ch', '.ch Domain', 2500, 2500, 2500, true, false, 4),
  ('.horse', '.horse Domain', 3900, 3900, 3900, true, true, 5),
  ('.farm', '.farm Domain', 3500, 3500, 3500, true, true, 6);

-- 6. Validation trigger for domain status
CREATE OR REPLACE FUNCTION public.validate_domain_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active', 'expired', 'pending', 'transferred', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid domain status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_domain_status
  BEFORE INSERT OR UPDATE ON public.customer_domains
  FOR EACH ROW EXECUTE FUNCTION public.validate_domain_status();

-- 7. Validation trigger for order status/type
CREATE OR REPLACE FUNCTION public.validate_domain_order()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_type NOT IN ('register', 'renew', 'transfer') THEN
    RAISE EXCEPTION 'Invalid order type: %', NEW.order_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'completed', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'Invalid order status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_domain_order
  BEFORE INSERT OR UPDATE ON public.domain_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_domain_order();