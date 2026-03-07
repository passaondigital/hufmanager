
-- Legal change notifications table
CREATE TABLE public.legal_change_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  effective_date DATE NOT NULL,
  requires_action BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.legal_change_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legal changes" ON public.legal_change_notifications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Providers can view legal changes" ON public.legal_change_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('provider', 'partner')));

-- Legal change confirmations table
CREATE TABLE public.legal_change_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.legal_change_notifications(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  confirmed_at TIMESTAMPTZ,
  action TEXT DEFAULT 'pending',
  reminder_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, provider_id)
);

ALTER TABLE public.legal_change_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage confirmations" ON public.legal_change_confirmations
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Providers can view own confirmations" ON public.legal_change_confirmations
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can update own confirmations" ON public.legal_change_confirmations
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Admin settings table (key/value for toggles)
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert default automation settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('auto_contract_on_registration', 'true'::jsonb, 'Vertrag bei Registrierung auto-generieren'),
  ('auto_invoice_after_signing', 'true'::jsonb, 'Rechnung auto-erstellen nach Vertragsunterzeichnung'),
  ('auto_monthly_invoices', 'false'::jsonb, 'Monatliche Auto-Rechnungen (nur Überweisung)'),
  ('auto_dunning', 'true'::jsonb, 'Mahnungen automatisch nach 3/14/21 Tagen'),
  ('auto_legal_reminders', 'true'::jsonb, 'Erinnerungen bei AGB-Änderungen (7/30 Tage)');

-- Provider timeline events table
CREATE TABLE public.provider_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📄',
  is_auto BOOLEAN DEFAULT true,
  triggered_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage timeline" ON public.provider_timeline_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Providers can view own timeline" ON public.provider_timeline_events
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Indexes
CREATE INDEX idx_provider_timeline_provider ON public.provider_timeline_events(provider_id, created_at DESC);
CREATE INDEX idx_legal_confirmations_pending ON public.legal_change_confirmations(action) WHERE action = 'pending';

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_legal_change_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('agb', 'datenschutz', 'nutzungsvertrag', 'preise') THEN
    RAISE EXCEPTION 'Invalid legal change type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_legal_change_type
  BEFORE INSERT OR UPDATE ON public.legal_change_notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_legal_change_type();

CREATE OR REPLACE FUNCTION public.validate_legal_confirmation_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.action NOT IN ('pending', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid confirmation action: %', NEW.action;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_legal_confirmation_action
  BEFORE INSERT OR UPDATE ON public.legal_change_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.validate_legal_confirmation_action();
