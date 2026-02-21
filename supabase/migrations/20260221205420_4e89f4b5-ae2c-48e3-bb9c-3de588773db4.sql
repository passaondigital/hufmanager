
-- ===== PARTNER ECOSYSTEM FULL UPGRADE =====
-- Services, Appointments, Documents, Invoices, Treatment Plans, Chat, Business Settings, DSGVO Consent

-- 1. Partner Business Settings (Profil & Rechnungsstellung)
CREATE TABLE public.partner_business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  owner_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  vat_id TEXT,
  iban TEXT,
  bank_name TEXT,
  bic TEXT,
  logo_url TEXT,
  specialty TEXT,
  qualifications TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own settings"
  ON public.partner_business_settings FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

-- 2. Partner Services (Leistungskatalog)
CREATE TABLE public.partner_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2),
  duration INTEGER,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own services"
  ON public.partner_services FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE INDEX idx_partner_services_partner ON public.partner_services(partner_id);

-- 3. Partner Appointments (flexible, unregelmäßige Intervalle - kein festes Schema)
CREATE TABLE public.partner_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.partner_services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  end_time TIME,
  duration INTEGER,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  location TEXT,
  price NUMERIC(10,2),
  requested_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  treatment_note_id UUID REFERENCES public.partner_treatment_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own appointments"
  ON public.partner_appointments FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Owners view horse appointments"
  ON public.partner_appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horses h
      WHERE h.id = horse_id AND h.owner_id = auth.uid() AND h.deleted_at IS NULL
    )
  );

CREATE POLICY "Providers view managed horse appointments"
  ON public.partner_appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id = horse_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
        AND h.deleted_at IS NULL
    )
  );

CREATE INDEX idx_partner_appointments_partner ON public.partner_appointments(partner_id);
CREATE INDEX idx_partner_appointments_horse ON public.partner_appointments(horse_id);
CREATE INDEX idx_partner_appointments_date ON public.partner_appointments(appointment_date);

-- Appointment status validation trigger
CREATE OR REPLACE FUNCTION public.validate_partner_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('planned', 'requested', 'confirmed', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_appointment_status_trigger
  BEFORE INSERT OR UPDATE ON public.partner_appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_appointment_status();

-- 4. Partner Documents (Befunde, Röntgen, Laborergebnisse)
CREATE TABLE public.partner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  treatment_note_id UUID REFERENCES public.partner_treatment_notes(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.partner_appointments(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  visible_to_pid BOOLEAN NOT NULL DEFAULT true,
  visible_to_kid BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own documents"
  ON public.partner_documents FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Owners view visible documents"
  ON public.partner_documents FOR SELECT
  USING (
    visible_to_kid = true
    AND EXISTS (
      SELECT 1 FROM public.horses h
      WHERE h.id = horse_id AND h.owner_id = auth.uid() AND h.deleted_at IS NULL
    )
  );

CREATE POLICY "Providers view visible documents"
  ON public.partner_documents FOR SELECT
  USING (
    visible_to_pid = true
    AND EXISTS (
      SELECT 1 FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id = horse_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
        AND h.deleted_at IS NULL
    )
  );

CREATE INDEX idx_partner_documents_partner ON public.partner_documents(partner_id);
CREATE INDEX idx_partner_documents_horse ON public.partner_documents(horse_id);

-- Document category validation
CREATE OR REPLACE FUNCTION public.validate_partner_document_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category NOT IN ('xray', 'lab_result', 'report', 'photo', 'thermography', 'ultrasound', 'protocol', 'certificate', 'other') THEN
    NEW.category := 'other';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_document_category_trigger
  BEFORE INSERT OR UPDATE ON public.partner_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_document_category();

-- 5. Partner Treatment Plans (Behandlungspläne mit Fortschritt)
CREATE TABLE public.partner_treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  diagnosis TEXT,
  goals TEXT,
  recommended_frequency TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  progress_percent INTEGER DEFAULT 0,
  visible_to_pid BOOLEAN NOT NULL DEFAULT true,
  visible_to_kid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own plans"
  ON public.partner_treatment_plans FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Owners view visible plans"
  ON public.partner_treatment_plans FOR SELECT
  USING (
    visible_to_kid = true
    AND EXISTS (
      SELECT 1 FROM public.horses h
      WHERE h.id = horse_id AND h.owner_id = auth.uid() AND h.deleted_at IS NULL
    )
  );

CREATE POLICY "Providers view visible plans"
  ON public.partner_treatment_plans FOR SELECT
  USING (
    visible_to_pid = true
    AND EXISTS (
      SELECT 1 FROM public.horses h
      JOIN public.access_grants ag ON ag.client_id = h.owner_id
      WHERE h.id = horse_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
        AND h.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.validate_partner_plan_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'completed', 'paused', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid plan status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_plan_status_trigger
  BEFORE INSERT OR UPDATE ON public.partner_treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_plan_status();

CREATE INDEX idx_partner_plans_partner ON public.partner_treatment_plans(partner_id);
CREATE INDEX idx_partner_plans_horse ON public.partner_treatment_plans(horse_id);

-- 6. Partner Invoices
CREATE TABLE public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_address TEXT,
  recipient_email TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own invoices"
  ON public.partner_invoices FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE OR REPLACE FUNCTION public.validate_partner_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'paid', 'overdue', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_invoice_status_trigger
  BEFORE INSERT OR UPDATE ON public.partner_invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_invoice_status();

CREATE TABLE public.partner_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  treatment_note_id UUID REFERENCES public.partner_treatment_notes(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.partner_appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own invoice items"
  ON public.partner_invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_invoices pi
      WHERE pi.id = invoice_id AND pi.partner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_invoices pi
      WHERE pi.id = invoice_id AND pi.partner_id = auth.uid()
    )
  );

CREATE INDEX idx_partner_invoices_partner ON public.partner_invoices(partner_id);
CREATE INDEX idx_partner_invoice_items_invoice ON public.partner_invoice_items(invoice_id);

-- Invoice number counter
CREATE TABLE public.partner_invoice_number_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, year)
);

ALTER TABLE public.partner_invoice_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own counters"
  ON public.partner_invoice_number_counters FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE OR REPLACE FUNCTION public.generate_partner_invoice_number(p_partner_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  INSERT INTO partner_invoice_number_counters (partner_id, year, last_number)
  VALUES (p_partner_id, v_year, 1)
  ON CONFLICT (partner_id, year)
  DO UPDATE SET
    last_number = partner_invoice_number_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;
  
  RETURN 'PR-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 4, '0');
END;
$$;

-- 7. Partner Conversations & Messages (alle können mit allen kommunizieren)
CREATE TABLE public.partner_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterpart_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterpart_role TEXT NOT NULL,
  horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conversations"
  ON public.partner_conversations FOR SELECT
  USING (auth.uid() = partner_id OR auth.uid() = counterpart_id);

CREATE POLICY "Participants create conversations"
  ON public.partner_conversations FOR INSERT
  WITH CHECK (auth.uid() = partner_id OR auth.uid() = counterpart_id);

CREATE POLICY "Participants update conversations"
  ON public.partner_conversations FOR UPDATE
  USING (auth.uid() = partner_id OR auth.uid() = counterpart_id);

-- Conversation validation
CREATE OR REPLACE FUNCTION public.validate_partner_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.counterpart_role NOT IN ('provider', 'client', 'partner') THEN
    RAISE EXCEPTION 'Invalid counterpart role: %', NEW.counterpart_role;
  END IF;
  IF NEW.partner_id = NEW.counterpart_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_conversation_trigger
  BEFORE INSERT OR UPDATE ON public.partner_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_conversation();

CREATE TABLE public.partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.partner_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages"
  ON public.partner_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_conversations pc
      WHERE pc.id = conversation_id
        AND (pc.partner_id = auth.uid() OR pc.counterpart_id = auth.uid())
    )
  );

CREATE POLICY "Sender creates messages"
  ON public.partner_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.partner_conversations pc
      WHERE pc.id = conversation_id
        AND (pc.partner_id = auth.uid() OR pc.counterpart_id = auth.uid())
    )
  );

CREATE POLICY "Participants update messages"
  ON public.partner_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_conversations pc
      WHERE pc.id = conversation_id
        AND (pc.partner_id = auth.uid() OR pc.counterpart_id = auth.uid())
    )
  );

-- Message length validation
CREATE OR REPLACE FUNCTION public.validate_partner_message_length()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_partner_message_length_trigger
  BEFORE INSERT ON public.partner_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_message_length();

CREATE INDEX idx_partner_messages_conversation ON public.partner_messages(conversation_id);
CREATE INDEX idx_partner_messages_created ON public.partner_messages(created_at);
CREATE INDEX idx_partner_conversations_partner ON public.partner_conversations(partner_id);
CREATE INDEX idx_partner_conversations_counterpart ON public.partner_conversations(counterpart_id);

-- 8. Partner Data Consent (DSGVO-Einwilligung zur Datenverarbeitung)
CREATE TABLE public.partner_data_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'data_processing',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(partner_id, horse_id, consent_type)
);

ALTER TABLE public.partner_data_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own consents"
  ON public.partner_data_consents FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

-- 9. Storage bucket for partner documents (private, signierte URLs für Zugriff)
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-documents', 'partner-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Partners upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'partner-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Partners view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'partner-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Partners delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'partner-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
