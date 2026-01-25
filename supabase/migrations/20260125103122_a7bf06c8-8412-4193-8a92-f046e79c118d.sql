-- Create system_settings table for app version control
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_forced BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can READ system settings (needed for version checks)
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

-- Only master admins can UPDATE/INSERT system settings
CREATE POLICY "Only master admins can modify system settings"
  ON public.system_settings
  FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- Insert initial version entries
INSERT INTO public.system_settings (key, value, is_forced, message)
VALUES 
  ('app_version_provider', '1.0.0', false, 'Initiale Version'),
  ('app_version_client', '1.0.0', false, 'Initiale Version')
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();