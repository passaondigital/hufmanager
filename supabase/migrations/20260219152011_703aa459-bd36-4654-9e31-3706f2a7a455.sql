-- Add autoflow_mode to autoflow_settings
ALTER TABLE public.autoflow_settings
ADD COLUMN IF NOT EXISTS autoflow_mode text NOT NULL DEFAULT 'basis'
CHECK (autoflow_mode IN ('basis', 'plus', 'premium'));

COMMENT ON COLUMN public.autoflow_settings.autoflow_mode IS 'Basis = Neukunden-Automatisierung, Plus = + Bestandskunden-Management, Premium = + Material/Lager/Finanzen';
