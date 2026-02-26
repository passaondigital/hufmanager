-- =============================================
-- MIGRATION: Emergency First Aid System
-- Features: OTP-Notfall, Kundensuchanfragen, Eskalationen, Kundenpreisgruppen
-- Created: 2026-02-26
-- =============================================

BEGIN;

-- ===========================================
-- PART 1: Emergency OTP System (Notfall-Passwörter)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.emergency_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  
  CONSTRAINT emergency_otp_valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_emergency_otp_client ON public.emergency_otp(client_id);
CREATE INDEX idx_emergency_otp_provider ON public.emergency_otp(provider_id);
CREATE INDEX idx_emergency_otp_status ON public.emergency_otp(status);
CREATE INDEX idx_emergency_otp_expires ON public.emergency_otp(expires_at);

ALTER TABLE public.emergency_otp ENABLE ROW LEVEL SECURITY;

-- Provider can view own OTPs
CREATE POLICY "provider_view_own_otp" ON public.emergency_otp
  FOR SELECT
  USING (auth.uid() = provider_id AND status != 'expired');

-- Provider can insert OTPs for their clients
CREATE POLICY "provider_insert_otp" ON public.emergency_otp
  FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.provider_id = auth.uid()
      AND ag.client_id = emergency_otp.client_id
      AND ag.is_active = true
    )
  );

-- Provider can update OTP status (mark as used)
CREATE POLICY "provider_update_otp" ON public.emergency_otp
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Admin can view all OTPs
CREATE POLICY "admin_view_all_otp" ON public.emergency_otp
  FOR SELECT
  USING (public.is_admin(auth.uid()));


-- ===========================================
-- PART 2: Emergency Escalations (Notfall-Eskalationen)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.emergency_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_readable_id VARCHAR(20) NOT NULL,
  escalation_reason VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  CONSTRAINT escalation_resolution_check CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
    OR (status IN ('open', 'acknowledged'))
  )
);

CREATE INDEX idx_escalations_provider ON public.emergency_escalations(provider_id);
CREATE INDEX idx_escalations_status ON public.emergency_escalations(status);
CREATE INDEX idx_escalations_created ON public.emergency_escalations(created_at DESC);

ALTER TABLE public.emergency_escalations ENABLE ROW LEVEL SECURITY;

-- Provider can view own escalations
CREATE POLICY "provider_view_own_escalations" ON public.emergency_escalations
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Provider can create escalations
CREATE POLICY "provider_create_escalations" ON public.emergency_escalations
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- Admin can view all escalations
CREATE POLICY "admin_view_all_escalations" ON public.emergency_escalations
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin can update escalations
CREATE POLICY "admin_update_escalations" ON public.emergency_escalations
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ===========================================
-- PART 3: Emergency Audit Log (DSGVO-konform)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.emergency_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role VARCHAR(50) NOT NULL CHECK (actor_role IN ('provider', 'partner', 'admin')),
  action_type VARCHAR(255) NOT NULL,
  target_kid VARCHAR(20),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET
);

CREATE INDEX idx_audit_log_actor ON public.emergency_audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON public.emergency_audit_log(action_type);
CREATE INDEX idx_audit_log_created ON public.emergency_audit_log(created_at DESC);

ALTER TABLE public.emergency_audit_log ENABLE ROW LEVEL SECURITY;

-- Only actor can view their own logs (except admins)
CREATE POLICY "actor_view_own_logs" ON public.emergency_audit_log
  FOR SELECT
  USING (
    auth.uid() = actor_id
    OR public.is_admin(auth.uid())
  );

-- Only admins can insert logs
CREATE POLICY "admin_insert_logs" ON public.emergency_audit_log
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can view all logs
CREATE POLICY "admin_view_all_logs" ON public.emergency_audit_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));


-- ===========================================
-- PART 4: Price Groups (Kundenpreisgruppen)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.price_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(provider_id, name)
);

CREATE INDEX idx_price_groups_provider ON public.price_groups(provider_id);

ALTER TABLE public.price_groups ENABLE ROW LEVEL SECURITY;

-- Provider can view own price groups
CREATE POLICY "provider_view_price_groups" ON public.price_groups
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Provider can manage own price groups
CREATE POLICY "provider_manage_price_groups" ON public.price_groups
  FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);


-- ===========================================
-- PART 5: Service Price Overrides (bereits teilweise vorhanden, erweitert)
-- ===========================================

-- Stelle sicher, dass service_price_overrides existiert
CREATE TABLE IF NOT EXISTS public.service_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price_group TEXT NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(service_id, price_group, provider_id)
);

CREATE INDEX idx_service_price_overrides_service ON public.service_price_overrides(service_id);
CREATE INDEX idx_service_price_overrides_provider ON public.service_price_overrides(provider_id);
CREATE INDEX idx_service_price_overrides_group ON public.service_price_overrides(price_group);

ALTER TABLE public.service_price_overrides ENABLE ROW LEVEL SECURITY;

-- Provider can view own price overrides
CREATE POLICY "provider_view_price_overrides" ON public.service_price_overrides
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Provider can manage own price overrides
CREATE POLICY "provider_manage_price_overrides" ON public.service_price_overrides
  FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);


-- ===========================================
-- PART 6: Profile Extensions (neue Spalten)
-- ===========================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS otp_enabled BOOLEAN DEFAULT false;

-- Trigger: Automatisch force_password_reset zurücksetzen nach erfolgreicher Änderung
CREATE OR REPLACE FUNCTION public.reset_force_password_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Nach erfolgreicher Passwort-Änderung wird dieses Flag zurückgesetzt
  -- Dies ist ein Placeholder - wird vom Backend-Auth-System gesetzt
  RETURN NEW;
END;
$$;


-- ===========================================
-- PART 7: Services Extensions (Spalten für Preisgruppen)
-- ===========================================

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS use_group_pricing BOOLEAN DEFAULT false;


-- ===========================================
-- PART 8: Helper Functions
-- ===========================================

-- Function: Provider's accessible clients (für Erste Hilfe Dashboard)
CREATE OR REPLACE FUNCTION public.get_provider_clients(_provider_id UUID)
RETURNS TABLE(client_id UUID, client_readable_id VARCHAR, client_email TEXT, client_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.readable_id,
    p.email,
    p.full_name
  FROM public.profiles p
  INNER JOIN public.access_grants ag ON ag.client_id = p.id
  WHERE ag.provider_id = _provider_id
    AND ag.is_active = true
    AND p.role::text = 'client'
  ORDER BY p.full_name;
$$;

-- Function: Get effective price for appointment (Preislogik)
CREATE OR REPLACE FUNCTION public.calculate_effective_price(
  _service_id UUID,
  _client_id UUID,
  _provider_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_group TEXT;
  v_override_price NUMERIC;
  v_base_price NUMERIC;
BEGIN
  -- 1. Get client's price group
  SELECT price_group INTO v_price_group
  FROM public.profiles
  WHERE id = _client_id;
  
  IF v_price_group IS NULL THEN
    v_price_group := 'standard';
  END IF;
  
  -- 2. Get base service price
  SELECT price INTO v_base_price
  FROM public.services
  WHERE id = _service_id;
  
  -- 3. Check for price override
  SELECT price INTO v_override_price
  FROM public.service_price_overrides
  WHERE service_id = _service_id
    AND price_group = v_price_group
    AND provider_id = _provider_id;
  
  -- 4. Return override or base price
  IF v_override_price IS NOT NULL THEN
    RETURN v_override_price;
  ELSE
    RETURN v_base_price;
  END IF;
END;
$$;

-- Function: Log emergency action (audit trail)
CREATE OR REPLACE FUNCTION public.log_emergency_action(
  _actor_id UUID,
  _action_type TEXT,
  _target_kid VARCHAR,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role VARCHAR;
  v_log_id UUID;
BEGIN
  -- Get actor's role
  SELECT role::text INTO v_actor_role
  FROM public.profiles
  WHERE id = _actor_id;
  
  INSERT INTO public.emergency_audit_log (
    actor_id,
    actor_role,
    action_type,
    target_kid,
    details,
    ip_address
  )
  VALUES (
    _actor_id,
    v_actor_role,
    _action_type,
    _target_kid,
    _details,
    inet_client_addr()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function: Generate one-time password and insert record
CREATE OR REPLACE FUNCTION public.create_emergency_otp(
  _provider_id UUID,
  _client_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT := (
    SELECT substring(md5(random()::text) from 1 for 8)
  );
  v_hash TEXT;
BEGIN
  -- hash using crypt (pgcrypto) with salt
  SELECT crypt(v_raw, gen_salt('bf')) INTO v_hash;

  INSERT INTO public.emergency_otp (
    provider_id, client_id, otp_hash, expires_at
  ) VALUES (
    _provider_id, _client_id, v_hash, now() + INTERVAL '30 minutes'
  );

  RETURN v_raw;
END;
$$;


-- ===========================================
-- PART 9: Update_at Triggers
-- ===========================================

-- helper to keep updated_at columns fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_emergency_otp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_emergency_otp_updated_at
  BEFORE UPDATE ON public.emergency_otp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_emergency_otp_updated_at();

CREATE TRIGGER trg_price_groups_updated_at
  BEFORE UPDATE ON public.price_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE TRIGGER trg_service_price_overrides_updated_at
  BEFORE UPDATE ON public.service_price_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();


-- ===========================================
-- PART 10: Storage Buckets für Audit-Exports
-- ===========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-logs', 'emergency-logs', false)
ON CONFLICT (id) DO NOTHING;


COMMIT;
