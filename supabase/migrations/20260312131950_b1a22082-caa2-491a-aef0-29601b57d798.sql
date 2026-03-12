
-- =============================================
-- PFERDEAKTE ERWEITERUNG — 10 BLÖCKE
-- Nur Schema-Änderungen, keine Datenmanipulation
-- =============================================

-- ═══════════════════════════════════════════
-- BLOCK 1: HORSES TABELLE ERWEITERN
-- ═══════════════════════════════════════════

-- Offizielle Identifikation
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS ueln TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS fn_number TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS brand_marks TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS markings_diagram_url TEXT;

-- Gesundheit & Kondition
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(6,2);
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS body_condition_score DECIMAL(3,1);
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS bcs_updated_at TIMESTAMPTZ;

-- Abstammung
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS sire_name TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS dam_name TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS studbook TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS breeding_country TEXT;

-- Versicherung
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS insurance_type TEXT[];
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS insurance_valid_until DATE;

-- Temperament & Sicherheit
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS temperament TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS behavior_notes TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS handling_warnings TEXT;

-- Ausbildung & Sport
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS training_level TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS disciplines TEXT[];
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS equipment_notes TEXT;

-- Pferdestatus
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS horse_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS status_reported_at TIMESTAMPTZ;

-- Validation trigger statt CHECK constraint für horse_status
CREATE OR REPLACE FUNCTION public.validate_horse_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.horse_status NOT IN ('active', 'sold', 'deceased', 'stolen', 'archived') THEN
    RAISE EXCEPTION 'Invalid horse_status: %. Must be active, sold, deceased, stolen, or archived', NEW.horse_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_horse_status ON public.horses;
CREATE TRIGGER trg_validate_horse_status
  BEFORE INSERT OR UPDATE ON public.horses
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_status();

-- Indexes für horses Erweiterung
CREATE INDEX IF NOT EXISTS idx_horses_ueln ON public.horses(ueln) WHERE ueln IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horses_horse_status ON public.horses(horse_status);

-- ═══════════════════════════════════════════
-- BLOCK 2: horse_vaccinations
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.horse_vaccinations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id          UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  vaccine_type      TEXT NOT NULL,
  vaccine_name      TEXT,
  vaccination_date  DATE NOT NULL,
  next_due_date     DATE,
  batch_number      TEXT,
  administered_by   TEXT,
  vet_profile_id    UUID REFERENCES public.profiles(id),
  document_url      TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.horse_vaccinations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_horse_id ON public.horse_vaccinations(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_next_due ON public.horse_vaccinations(next_due_date) WHERE next_due_date IS NOT NULL;

CREATE POLICY "vacc_owner_full_access" ON public.horse_vaccinations
  FOR ALL USING (
    horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid())
  );

CREATE POLICY "vacc_provider_view" ON public.horse_vaccinations
  FOR SELECT USING (
    horse_id IN (
      SELECT h.id FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE ag.provider_id = auth.uid() AND ag.is_active = true
    )
  );

CREATE POLICY "vacc_partner_view_medical" ON public.horse_vaccinations
  FOR SELECT USING (
    horse_id IN (
      SELECT hpa.horse_id FROM public.horse_partner_access hpa
      WHERE hpa.partner_profile_id = auth.uid()
      AND hpa.can_view_medical = true
      AND hpa.is_active = true
    )
  );

CREATE POLICY "vacc_admin_full" ON public.horse_vaccinations
  FOR ALL USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- BLOCK 3: horse_deworming
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.horse_deworming (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id          UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  active_substance  TEXT,
  deworming_date    DATE NOT NULL,
  next_due_date     DATE,
  dosage_ml         DECIMAL(6,2),
  weight_at_time_kg DECIMAL(6,2),
  administered_by   TEXT,
  fecal_egg_count   INTEGER,
  notes             TEXT,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.horse_deworming ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_horse_deworming_horse_id ON public.horse_deworming(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_deworming_next_due ON public.horse_deworming(next_due_date) WHERE next_due_date IS NOT NULL;

CREATE POLICY "deworm_owner_full_access" ON public.horse_deworming
  FOR ALL USING (
    horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid())
  );

CREATE POLICY "deworm_provider_view" ON public.horse_deworming
  FOR SELECT USING (
    horse_id IN (
      SELECT h.id FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE ag.provider_id = auth.uid() AND ag.is_active = true
    )
  );

CREATE POLICY "deworm_partner_view_medical" ON public.horse_deworming
  FOR SELECT USING (
    horse_id IN (
      SELECT hpa.horse_id FROM public.horse_partner_access hpa
      WHERE hpa.partner_profile_id = auth.uid()
      AND hpa.can_view_medical = true
      AND hpa.is_active = true
    )
  );

CREATE POLICY "deworm_admin_full" ON public.horse_deworming
  FOR ALL USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- BLOCK 4: horse_partner_access ERWEITERN
-- ═══════════════════════════════════════════

ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_vaccinations BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_deworming BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_insurance BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_breeding BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_training BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_weight_bcs BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_documents BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_upload_documents BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_diary BOOLEAN DEFAULT FALSE;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'partner';
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS revoke_reason TEXT;
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS valid_until DATE;

-- Validation trigger für partner_type
CREATE OR REPLACE FUNCTION public.validate_partner_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.partner_type NOT IN ('partner', 'farrier', 'hoof_care', 'physio', 'osteo', 'saddler', 'trainer', 'insurance', 'authority', 'other') THEN
    RAISE EXCEPTION 'Invalid partner_type: %', NEW.partner_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_partner_type ON public.horse_partner_access;
CREATE TRIGGER trg_validate_partner_type
  BEFORE INSERT OR UPDATE ON public.horse_partner_access
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_type();

-- ═══════════════════════════════════════════
-- BLOCK 5: horse_audit_log
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.horse_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id        UUID NOT NULL REFERENCES public.horses(id),
  actor_id        UUID REFERENCES public.profiles(id),
  actor_name      TEXT,
  actor_role      TEXT,
  actor_kid       TEXT,
  action_type     TEXT NOT NULL,
  action_detail   JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.horse_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_horse_audit_log_horse_id ON public.horse_audit_log(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_audit_log_actor_id ON public.horse_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_horse_audit_log_action ON public.horse_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_horse_audit_log_created ON public.horse_audit_log(created_at);

-- Validation trigger für action_type
CREATE OR REPLACE FUNCTION public.validate_horse_audit_action_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type NOT IN (
    'view_basic', 'view_medical', 'view_hoof_history', 'view_documents',
    'view_vaccinations', 'view_insurance', 'upload_document', 'upload_photo',
    'upload_xray', 'add_treatment_note', 'add_vaccination', 'add_deworming',
    'edit_horse', 'grant_access', 'revoke_access', 'create_appointment',
    'transfer_initiated', 'transfer_completed', 'status_changed',
    'export_data', 'authority_request'
  ) THEN
    RAISE EXCEPTION 'Invalid audit action_type: %', NEW.action_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_horse_audit_action ON public.horse_audit_log;
CREATE TRIGGER trg_validate_horse_audit_action
  BEFORE INSERT ON public.horse_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_audit_action_type();

CREATE POLICY "audit_owner_view" ON public.horse_audit_log
  FOR SELECT USING (
    horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid())
  );

CREATE POLICY "audit_admin_full" ON public.horse_audit_log
  FOR ALL USING (public.is_admin(auth.uid()));

-- Provider darf ins Audit-Log schreiben (INSERT) für Pferde seiner Kunden
CREATE POLICY "audit_provider_insert" ON public.horse_audit_log
  FOR INSERT WITH CHECK (
    horse_id IN (
      SELECT h.id FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE ag.provider_id = auth.uid() AND ag.is_active = true
    )
  );

-- ═══════════════════════════════════════════
-- BLOCK 6: horse_transfers
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.horse_transfers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id                UUID NOT NULL REFERENCES public.horses(id),
  seller_id               UUID NOT NULL REFERENCES public.profiles(id),
  seller_confirmed        BOOLEAN DEFAULT FALSE,
  seller_confirmed_at     TIMESTAMPTZ,
  seller_shared_password  TEXT,
  buyer_email             TEXT NOT NULL,
  buyer_kid               TEXT,
  buyer_id                UUID REFERENCES public.profiles(id),
  buyer_confirmed         BOOLEAN DEFAULT FALSE,
  buyer_confirmed_at      TIMESTAMPTZ,
  buyer_shared_password   TEXT,
  shared_password_hash    TEXT,
  seller_contract_url     TEXT,
  buyer_contract_url      TEXT,
  contract_verified       BOOLEAN DEFAULT FALSE,
  contract_verified_at    TIMESTAMPTZ,
  contract_verified_by    UUID REFERENCES public.profiles(id),
  status                  TEXT NOT NULL DEFAULT 'initiated',
  include_full_history    BOOLEAN DEFAULT TRUE,
  include_documents       BOOLEAN DEFAULT TRUE,
  include_photos          BOOLEAN DEFAULT TRUE,
  include_hoof_history    BOOLEAN DEFAULT TRUE,
  exclude_provider_notes  BOOLEAN DEFAULT TRUE,
  initiated_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  notes                   TEXT,
  seller_liability_accepted BOOLEAN DEFAULT FALSE,
  buyer_liability_accepted  BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.horse_transfers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_horse_transfers_horse_id ON public.horse_transfers(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_transfers_seller ON public.horse_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_horse_transfers_buyer ON public.horse_transfers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_horse_transfers_status ON public.horse_transfers(status);

-- Validation trigger für transfer status
CREATE OR REPLACE FUNCTION public.validate_horse_transfer_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('initiated', 'buyer_found', 'docs_pending', 'password_pending', 'pending_review', 'completed', 'cancelled', 'disputed') THEN
    RAISE EXCEPTION 'Invalid transfer status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_transfer_status ON public.horse_transfers;
CREATE TRIGGER trg_validate_transfer_status
  BEFORE INSERT OR UPDATE ON public.horse_transfers
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_transfer_status();

CREATE POLICY "transfer_seller_access" ON public.horse_transfers
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "transfer_buyer_access" ON public.horse_transfers
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "transfer_admin_full" ON public.horse_transfers
  FOR ALL USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- BLOCK 7: horse_status_reports
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.horse_status_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id            UUID NOT NULL REFERENCES public.horses(id),
  reported_by         UUID NOT NULL REFERENCES public.profiles(id),
  report_type         TEXT NOT NULL,
  incident_date       DATE,
  incident_location   TEXT,
  description         TEXT,
  authority_notified  BOOLEAN DEFAULT FALSE,
  authority_name      TEXT,
  authority_case_number TEXT,
  authority_notified_at TIMESTAMPTZ,
  document_urls       TEXT[],
  report_status       TEXT DEFAULT 'open',
  court_order_required BOOLEAN DEFAULT TRUE,
  court_order_received BOOLEAN DEFAULT FALSE,
  court_order_date    DATE,
  court_order_url     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  closed_at           TIMESTAMPTZ
);

ALTER TABLE public.horse_status_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_horse_status_reports_horse ON public.horse_status_reports(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_status_reports_type ON public.horse_status_reports(report_type);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_horse_status_report()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_type NOT IN ('stolen', 'deceased', 'missing') THEN
    RAISE EXCEPTION 'Invalid report_type: %', NEW.report_type;
  END IF;
  IF NEW.report_status NOT IN ('open', 'investigating', 'closed', 'recovered') THEN
    RAISE EXCEPTION 'Invalid report_status: %', NEW.report_status;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_status_report ON public.horse_status_reports;
CREATE TRIGGER trg_validate_status_report
  BEFORE INSERT OR UPDATE ON public.horse_status_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_status_report();

CREATE POLICY "status_report_owner_access" ON public.horse_status_reports
  FOR ALL USING (reported_by = auth.uid());

CREATE POLICY "status_report_admin_full" ON public.horse_status_reports
  FOR ALL USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- BLOCK 8: service_orders
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.service_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT UNIQUE,
  horse_id            UUID REFERENCES public.horses(id),
  client_id           UUID NOT NULL REFERENCES public.profiles(id),
  client_signed       BOOLEAN DEFAULT FALSE,
  client_signed_at    TIMESTAMPTZ,
  client_signature_url TEXT,
  provider_id         UUID REFERENCES public.profiles(id),
  partner_id          UUID REFERENCES public.profiles(id),
  provider_type       TEXT,
  provider_signed     BOOLEAN DEFAULT FALSE,
  provider_signed_at  TIMESTAMPTZ,
  provider_signature_url TEXT,
  service_description TEXT NOT NULL,
  service_date        DATE,
  estimated_price     DECIMAL(10,2),
  currency            TEXT DEFAULT 'EUR',
  order_status        TEXT DEFAULT 'draft',
  terms_accepted_client   BOOLEAN DEFAULT FALSE,
  terms_accepted_provider BOOLEAN DEFAULT FALSE,
  terms_version           TEXT,
  document_urls       TEXT[],
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_service_orders_horse ON public.service_orders(horse_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON public.service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_provider ON public.service_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(order_status);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_service_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_status NOT IN ('draft', 'sent', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled', 'disputed') THEN
    RAISE EXCEPTION 'Invalid order_status: %', NEW.order_status;
  END IF;
  IF NEW.provider_type IS NOT NULL AND NEW.provider_type NOT IN ('hoof_care', 'farrier', 'vet', 'physio', 'osteo', 'saddler', 'trainer', 'other') THEN
    RAISE EXCEPTION 'Invalid provider_type: %', NEW.provider_type;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_service_order ON public.service_orders;
CREATE TRIGGER trg_validate_service_order
  BEFORE INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order();

CREATE POLICY "so_client_access" ON public.service_orders
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "so_provider_access" ON public.service_orders
  FOR ALL USING (provider_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "so_admin_full" ON public.service_orders
  FOR ALL USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- BLOCK 9: AUDIT TRIGGER auf horses
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_horse_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.horse_audit_log (
    horse_id, actor_id, action_type, action_detail
  ) VALUES (
    NEW.id,
    auth.uid(),
    'edit_horse',
    jsonb_build_object(
      'changed_fields',
      (SELECT jsonb_object_agg(key, value)
       FROM jsonb_each(to_jsonb(NEW))
       WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS horse_audit_trigger ON public.horses;
CREATE TRIGGER horse_audit_trigger
  AFTER UPDATE ON public.horses
  FOR EACH ROW EXECUTE FUNCTION public.log_horse_action();

-- ═══════════════════════════════════════════
-- BLOCK 10: consent_log ERWEITERN
-- ═══════════════════════════════════════════

ALTER TABLE public.consent_log ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE public.consent_log ADD COLUMN IF NOT EXISTS document_url TEXT;
