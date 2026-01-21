-- Feature Flag Status System: Change from boolean to status enum
-- Status types: disabled, beta, early_access, public

-- Create the enum for feature status
CREATE TYPE public.feature_status AS ENUM ('disabled', 'beta', 'early_access', 'public');

-- Create global feature defaults table (for admin to set defaults for new users)
CREATE TABLE public.global_feature_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  default_status feature_status NOT NULL DEFAULT 'public',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_feature_defaults ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write global feature defaults
CREATE POLICY "Admins can manage global feature defaults" 
ON public.global_feature_defaults 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Insert default feature entries
INSERT INTO public.global_feature_defaults (feature_key, feature_name, default_status, description) VALUES
  ('module_invoicing', 'Rechnungen', 'public', 'Rechnungen erstellen und verwalten'),
  ('module_chat', 'Chat', 'public', 'Chat mit Kunden'),
  ('module_maps', 'Anfahrt / Maps', 'public', 'Kartennavigation und Routenplanung'),
  ('module_academy', 'Academy', 'public', 'Zugriff auf Lernmaterialien'),
  ('module_hufanalyse', 'Hufanalyse (LTZ)', 'public', 'LTZ-Hufanalyse-Tool'),
  ('module_network', 'Netzwerk', 'public', 'Netzwerk und Verbindungen'),
  ('module_analytics', 'Analytics', 'public', 'Analyse und Statistiken'),
  ('beta_features', 'Beta Features', 'disabled', 'Zugang zu neuen Testfunktionen'),
  ('module_team', 'Team / Mitarbeiter', 'disabled', 'Mitarbeiterverwaltung (Coming Soon)');

-- Create trigger for updated_at
CREATE TRIGGER update_global_feature_defaults_updated_at
  BEFORE UPDATE ON public.global_feature_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add a new JSONB column to profiles for granular feature statuses
-- This will store: { "module_invoicing": "public", "module_chat": "beta", ... }
-- We keep the old feature_flags column for backward compatibility during migration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feature_statuses JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.feature_statuses IS 'Stores per-feature status: disabled, beta, early_access, public. Takes precedence over feature_flags boolean when present.';