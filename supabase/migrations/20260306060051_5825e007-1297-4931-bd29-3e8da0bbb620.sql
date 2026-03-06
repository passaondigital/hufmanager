
-- ═══════════════════════════════════════════
-- 1. profession_type auf profiles + business_settings
-- ═══════════════════════════════════════════
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS profession_type TEXT DEFAULT 'hoof_care';

ALTER TABLE public.business_settings 
  ADD COLUMN IF NOT EXISTS profession_type TEXT DEFAULT 'hoof_care';

-- Validation trigger statt CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_profession_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.profession_type IS NOT NULL AND NEW.profession_type NOT IN (
    'hoof_care', 'osteopath', 'physiotherapist', 'dentist',
    'riding_instructor', 'saddler', 'massage', 'vet_mobile', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid profession_type: %', NEW.profession_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profession_type_profiles ON public.profiles;
CREATE TRIGGER trg_validate_profession_type_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profession_type();

DROP TRIGGER IF EXISTS trg_validate_profession_type_bs ON public.business_settings;
CREATE TRIGGER trg_validate_profession_type_bs
  BEFORE INSERT OR UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_profession_type();

-- ═══════════════════════════════════════════
-- 2. GPS direkt am Termin
-- ═══════════════════════════════════════════
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS appointment_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS appointment_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_geocoded BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════
-- 3. service_time_presets
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_time_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  color_hex TEXT NOT NULL DEFAULT '#F5970A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, service_type)
);

ALTER TABLE public.service_time_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own presets"
  ON public.service_time_presets
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ═══════════════════════════════════════════
-- 4. client_locations already exists – skip
-- ═══════════════════════════════════════════

-- ═══════════════════════════════════════════
-- 5. Anhänger-Profil auf provider_vehicles
-- ═══════════════════════════════════════════
ALTER TABLE public.provider_vehicles
  ADD COLUMN IF NOT EXISTS has_trailer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trailer_height_cm INTEGER,
  ADD COLUMN IF NOT EXISTS trailer_weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS trailer_length_cm INTEGER;
