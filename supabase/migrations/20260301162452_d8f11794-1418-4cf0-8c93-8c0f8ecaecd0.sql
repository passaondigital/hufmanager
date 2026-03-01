
-- ══════════════════════════════════════════════════
-- ERWEITERUNG 2: Alert Levels Table
-- ══════════════════════════════════════════════════

-- Alert severity levels for tiered notifications
CREATE TABLE IF NOT EXISTS public.system_alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_level INTEGER NOT NULL CHECK (alert_level BETWEEN 1 AND 4),
  alert_name TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  threshold_value NUMERIC,
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['dashboard'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage alert rules"
  ON public.system_alert_rules FOR ALL
  USING (public.is_admin(auth.uid()));

-- Alert history for tracking triggered alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_level INTEGER NOT NULL,
  alert_name TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  channels_notified TEXT[] DEFAULT ARRAY['dashboard'],
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view/manage alerts"
  ON public.system_alerts FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_system_alerts_level ON public.system_alerts (alert_level, created_at DESC);
CREATE INDEX idx_system_alerts_unresolved ON public.system_alerts (resolved_at) WHERE resolved_at IS NULL;

-- ══════════════════════════════════════════════════
-- ERWEITERUNG 4: Anomaly baseline table
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.system_anomaly_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL UNIQUE,
  baseline_value NUMERIC NOT NULL DEFAULT 0,
  threshold_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  last_measured_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_anomaly_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage anomaly baselines"
  ON public.system_anomaly_baselines FOR ALL
  USING (public.is_admin(auth.uid()));

-- ══════════════════════════════════════════════════
-- ERWEITERUNG 5: Add duration & health_score to health checks
-- ══════════════════════════════════════════════════

ALTER TABLE public.system_health_checks 
  ADD COLUMN IF NOT EXISTS check_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS health_score NUMERIC(4,1);

-- ══════════════════════════════════════════════════
-- Seed default alert rules
-- ══════════════════════════════════════════════════

INSERT INTO public.system_alert_rules (alert_level, alert_name, condition_type, threshold_value, notification_channels) VALUES
  (1, 'Performance leicht schlechter', 'db_latency', 300, ARRAY['dashboard']),
  (1, 'Sync-Queue > 10 Einträge', 'sync_queue_count', 10, ARRAY['dashboard']),
  (2, 'Health Check 2x fehlgeschlagen', 'consecutive_failures', 2, ARRAY['notification']),
  (2, 'Sync-Queue > 50 > 30min', 'sync_queue_stale', 50, ARRAY['notification']),
  (2, 'DB-Latenz > 500ms', 'db_latency', 500, ARRAY['notification']),
  (3, 'DSGVO-Verletzung erkannt', 'dsgvo_violation', 1, ARRAY['push', 'email']),
  (3, 'DB Verbindung unterbrochen', 'db_unreachable', 1, ARRAY['push', 'email']),
  (4, 'Datenverlust erkannt', 'data_loss', 10, ARRAY['push', 'email', 'sms']),
  (4, 'System komplett down', 'system_down', 1, ARRAY['push', 'email', 'sms'])
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════
-- RPC for one-click fixes
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.run_health_fix(fix_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  fixed_count INTEGER := 0;
BEGIN
  -- Only admins can run fixes
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Nur Admins können Reparaturen ausführen';
  END IF;

  CASE fix_type
    WHEN 'orphaned_profiles' THEN
      -- Create missing profiles for auth users
      WITH orphans AS (
        SELECT au.id, au.email, au.raw_user_meta_data->>'full_name' as full_name
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
      ),
      inserted AS (
        INSERT INTO public.profiles (id, email, full_name)
        SELECT id, email, COALESCE(full_name, split_part(email, '@', 1), 'Unbekannt')
        FROM orphans
        RETURNING id
      )
      SELECT COUNT(*) INTO fixed_count FROM inserted;
      
      result := jsonb_build_object('fix', 'orphaned_profiles', 'fixed', fixed_count, 'message', fixed_count || ' Profile erstellt');

    WHEN 'expired_invitations' THEN
      WITH updated AS (
        UPDATE public.employee_profiles
        SET status = 'expired', invitation_token = NULL
        WHERE invitation_token IS NOT NULL
          AND status = 'pending'
          AND invitation_expires_at < NOW() - INTERVAL '7 days'
        RETURNING id
      )
      SELECT COUNT(*) INTO fixed_count FROM updated;
      
      result := jsonb_build_object('fix', 'expired_invitations', 'fixed', fixed_count, 'message', fixed_count || ' Einladungen bereinigt');

    WHEN 'old_notifications' THEN
      WITH deleted AS (
        DELETE FROM public.notifications
        WHERE is_read = true
          AND created_at < NOW() - INTERVAL '90 days'
        RETURNING id
      )
      SELECT COUNT(*) INTO fixed_count FROM deleted;
      
      result := jsonb_build_object('fix', 'old_notifications', 'fixed', fixed_count, 'message', fixed_count || ' alte Benachrichtigungen gelöscht');

    WHEN 'stale_sync_queue' THEN
      WITH deleted AS (
        DELETE FROM public.employee_sync_queue
        WHERE synced_at IS NULL
          AND created_at < NOW() - INTERVAL '7 days'
        RETURNING id
      )
      SELECT COUNT(*) INTO fixed_count FROM deleted;
      
      result := jsonb_build_object('fix', 'stale_sync_queue', 'fixed', fixed_count, 'message', fixed_count || ' Sync-Einträge bereinigt');

    ELSE
      result := jsonb_build_object('fix', fix_type, 'error', 'Unbekannter Fix-Typ');
  END CASE;

  RETURN result;
END;
$$;

-- ══════════════════════════════════════════════════
-- RPC to get health score trend
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_health_score_trend(days_back INTEGER DEFAULT 7)
RETURNS TABLE(check_date DATE, avg_score NUMERIC, total_checks BIGINT, critical_count BIGINT, warning_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as check_date,
    ROUND(AVG(
      CASE status
        WHEN 'ok' THEN 100
        WHEN 'warning' THEN 60
        WHEN 'critical' THEN 10
        ELSE 50
      END
    ), 1) as avg_score,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE status = 'warning') as warning_count
  FROM public.system_health_checks
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY check_date DESC;
$$;

-- Updated_at trigger
CREATE TRIGGER trg_update_system_alert_rules_updated_at
  BEFORE UPDATE ON public.system_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_system_anomaly_baselines_updated_at
  BEFORE UPDATE ON public.system_anomaly_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
