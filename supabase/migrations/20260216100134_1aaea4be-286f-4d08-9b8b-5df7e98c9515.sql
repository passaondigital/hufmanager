
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS ki_features_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_settings.ki_features_enabled IS 'Allows providers to disable all AI/KI features in their account';
