
-- ============================================================
-- Release Control Center: Version History & Maintenance Mode
-- ============================================================

-- 1. Release History / Versionsverlauf mit Changelog
CREATE TABLE public.release_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  instance TEXT NOT NULL DEFAULT 'app',  -- 'app', 'landingpage', 'demo', 'mission_control'
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'pending_review', 'approved', 'deployed', 'rolled_back'
  release_type TEXT NOT NULL DEFAULT 'patch', -- 'major', 'minor', 'patch', 'hotfix'
  changelog TEXT,
  breaking_changes TEXT,
  rollback_notes TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.release_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage release_history"
  ON public.release_history FOR ALL
  USING (public.is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_release_history_instance_status ON public.release_history(instance, status);
CREATE INDEX idx_release_history_created ON public.release_history(created_at DESC);

-- 2. Add maintenance/emergency mode settings to system_settings
INSERT INTO public.system_settings (key, value, is_forced, message)
VALUES 
  ('maintenance_mode_app', 'false', false, NULL),
  ('maintenance_mode_landingpage', 'false', false, NULL),
  ('maintenance_mode_demo', 'false', false, NULL),
  ('maintenance_mode_mission_control', 'false', false, NULL),
  ('force_reload_all', 'false', false, NULL),
  ('app_version_landingpage', '1.0.0', false, 'Initiale Version'),
  ('app_version_demo', '1.0.0', false, 'Initiale Version'),
  ('app_version_mission_control', '1.0.0', false, 'Initiale Version')
ON CONFLICT (key) DO NOTHING;

-- 3. Config snapshots for backup/restore
CREATE TABLE public.config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  snapshot_data JSONB NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'pre_release', 'auto'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config_snapshots"
  ON public.config_snapshots FOR ALL
  USING (public.is_admin(auth.uid()));

-- 4. Trigger for updated_at on release_history
CREATE TRIGGER update_release_history_updated_at
  BEFORE UPDATE ON public.release_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
