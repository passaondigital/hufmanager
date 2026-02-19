
-- AutoFlow Settings: Provider-spezifische Automatisierungskonfiguration
CREATE TABLE public.autoflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Lead → Termin
  auto_schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_schedule_mode TEXT NOT NULL DEFAULT 'suggest' CHECK (auto_schedule_mode IN ('auto', 'suggest', 'manual')),
  preferred_slot_days INTEGER NOT NULL DEFAULT 7, -- Suche im Zeitfenster von X Tagen
  group_by_plz BOOLEAN NOT NULL DEFAULT true, -- PLZ-basiertes Clustering
  
  -- Rechnung
  auto_invoice_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_invoice_trigger TEXT NOT NULL DEFAULT 'after_signature' CHECK (auto_invoice_trigger IN ('on_completion', 'after_signature')),
  default_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  
  -- Feedback
  auto_feedback_enabled BOOLEAN NOT NULL DEFAULT true,
  feedback_delay_hours INTEGER NOT NULL DEFAULT 24,
  feedback_channel TEXT NOT NULL DEFAULT 'push' CHECK (feedback_channel IN ('push', 'email', 'both')),
  
  -- Erinnerungen
  auto_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  
  -- Monatlicher Check-In
  monthly_checkin_enabled BOOLEAN NOT NULL DEFAULT true,
  last_checkin_at TIMESTAMPTZ,
  next_checkin_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(provider_id)
);

-- RLS
ALTER TABLE public.autoflow_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own autoflow settings"
  ON public.autoflow_settings FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own autoflow settings"
  ON public.autoflow_settings FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own autoflow settings"
  ON public.autoflow_settings FOR UPDATE
  USING (auth.uid() = provider_id);

-- Auto-update updated_at
CREATE TRIGGER update_autoflow_settings_updated_at
  BEFORE UPDATE ON public.autoflow_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- AutoFlow Log: Tracking aller automatischen Aktionen
CREATE TABLE public.autoflow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'lead_to_appointment', 'auto_invoice', 'feedback_sent', 'checkin_sent'
  entity_id UUID, -- appointment_id, invoice_id, etc.
  entity_type TEXT, -- 'appointment', 'invoice', 'notification'
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped', 'pending')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autoflow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own autoflow logs"
  ON public.autoflow_log FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "System can insert autoflow logs"
  ON public.autoflow_log FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- Index for performance
CREATE INDEX idx_autoflow_log_provider_created ON public.autoflow_log(provider_id, created_at DESC);
CREATE INDEX idx_autoflow_log_action_type ON public.autoflow_log(action_type);
