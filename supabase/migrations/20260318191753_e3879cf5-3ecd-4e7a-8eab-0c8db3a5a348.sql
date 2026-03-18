
-- =============================================
-- ECOSYSTEM INFRASTRUCTURE TABLES
-- =============================================

-- 1. ecosystem_sync_log — Tracks every sync operation
CREATE TABLE public.ecosystem_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_key TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'push', -- push, pull, bidirectional
  entity_type TEXT NOT NULL, -- horses, appointments, customers, documents
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
  duration_ms INTEGER,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.ecosystem_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON public.ecosystem_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON public.ecosystem_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ecosystem_sync_log_user ON public.ecosystem_sync_log(user_id, created_at DESC);
CREATE INDEX idx_ecosystem_sync_log_status ON public.ecosystem_sync_log(status, created_at DESC);

-- 2. ecosystem_errors — Persistent error tracking
CREATE TABLE public.ecosystem_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB,
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, error, critical
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  sync_log_id UUID REFERENCES public.ecosystem_sync_log(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ecosystem_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ecosystem errors"
  ON public.ecosystem_errors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ecosystem errors"
  ON public.ecosystem_errors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ecosystem errors"
  ON public.ecosystem_errors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ecosystem_errors_user ON public.ecosystem_errors(user_id, created_at DESC);
CREATE INDEX idx_ecosystem_errors_unresolved ON public.ecosystem_errors(resolved, created_at DESC) WHERE resolved = false;

-- 3. ecosystem_settings — Per-user per-app settings
CREATE TABLE public.ecosystem_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_key TEXT NOT NULL,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 60,
  sync_direction TEXT DEFAULT 'push', -- push, pull, bidirectional
  enabled_entity_types TEXT[] DEFAULT ARRAY['horses', 'appointments'],
  notification_on_sync BOOLEAN DEFAULT true,
  notification_on_error BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app_key)
);

ALTER TABLE public.ecosystem_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ecosystem settings"
  ON public.ecosystem_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. ecosystem_mappings — Maps local IDs to external app IDs
CREATE TABLE public.ecosystem_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_key TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- horses, appointments, customers
  local_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_hash TEXT, -- detect changes
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app_key, entity_type, local_id)
);

ALTER TABLE public.ecosystem_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ecosystem mappings"
  ON public.ecosystem_mappings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ecosystem_mappings_lookup ON public.ecosystem_mappings(user_id, app_key, entity_type);
CREATE INDEX idx_ecosystem_mappings_external ON public.ecosystem_mappings(app_key, external_id);

-- Auto-update trigger for ecosystem_settings
CREATE OR REPLACE FUNCTION public.update_ecosystem_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ecosystem_settings_updated_at
  BEFORE UPDATE ON public.ecosystem_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ecosystem_settings_updated_at();
