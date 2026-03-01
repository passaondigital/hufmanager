
-- ===================================
-- SELF-HEALING INFRASTRUCTURE TABLES
-- ===================================

-- 1. System Error Log
CREATE TABLE IF NOT EXISTS public.system_error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  component TEXT,
  route TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  auto_fixed BOOLEAN NOT NULL DEFAULT false,
  fix_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.system_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all error logs"
  ON public.system_error_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert error logs"
  ON public.system_error_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can log errors"
  ON public.system_error_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can update error logs"
  ON public.system_error_log FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_system_error_log_severity ON public.system_error_log(severity);
CREATE INDEX idx_system_error_log_created ON public.system_error_log(created_at DESC);
CREATE INDEX idx_system_error_log_component ON public.system_error_log(component);

-- 2. Performance Metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value_ms NUMERIC NOT NULL,
  route TEXT,
  user_role TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read metrics"
  ON public.performance_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_perf_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX idx_perf_metrics_created ON public.performance_metrics(created_at DESC);
CREATE INDEX idx_perf_metrics_route ON public.performance_metrics(route);

-- 3. System Health Checks Results
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_name TEXT NOT NULL,
  check_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'critical')),
  details JSONB,
  auto_fixed BOOLEAN NOT NULL DEFAULT false,
  fix_applied TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health checks"
  ON public.system_health_checks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert health checks"
  ON public.system_health_checks FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_health_checks_status ON public.system_health_checks(status);
CREATE INDEX idx_health_checks_created ON public.system_health_checks(created_at DESC);
CREATE INDEX idx_health_checks_category ON public.system_health_checks(check_category);

-- 4. System Status Messages (for public status page)
CREATE TABLE IF NOT EXISTS public.system_status_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'resolved')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_banner BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.system_status_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active status messages"
  ON public.system_status_messages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage status messages"
  ON public.system_status_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_status_messages_active ON public.system_status_messages(is_active, severity);

-- 5. Add missing performance indexes on frequently queried FK columns
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON public.appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_horse_id ON public.appointments(horse_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_horses_owner_id ON public.horses(owner_id);
CREATE INDEX IF NOT EXISTS idx_horses_deleted_at ON public.horses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_provider_id ON public.access_grants(provider_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_client_id ON public.access_grants(client_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_active ON public.access_grants(is_active, status);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_provider_id ON public.contacts(provider_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_provider_id ON public.employee_profiles(provider_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON public.employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_hoof_photos_horse_id ON public.hoof_photos(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_documents_horse_id ON public.horse_documents(horse_id);
