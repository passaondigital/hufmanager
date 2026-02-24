
-- =============================================
-- Phase 1: Drop all enum defaults FIRST
-- =============================================
ALTER TABLE public.profiles ALTER COLUMN price_group DROP DEFAULT;
ALTER TABLE public.surcharge_rules ALTER COLUMN type DROP DEFAULT;

-- =============================================
-- Phase 2: Convert all enum columns to TEXT
-- =============================================
ALTER TABLE public.profiles ALTER COLUMN price_group TYPE TEXT USING price_group::TEXT;
ALTER TABLE public.service_price_overrides ALTER COLUMN price_group TYPE TEXT USING price_group::TEXT;
ALTER TABLE public.surcharge_rules ALTER COLUMN trigger TYPE TEXT USING trigger::TEXT;
ALTER TABLE public.surcharge_rules ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- =============================================
-- Phase 3: Set new TEXT defaults
-- =============================================
ALTER TABLE public.profiles ALTER COLUMN price_group SET DEFAULT 'standard';

-- =============================================
-- Phase 4: Drop all enum types (now safe)
-- =============================================
DROP TYPE IF EXISTS public.price_group;
DROP TYPE IF EXISTS public.surcharge_trigger;
DROP TYPE IF EXISTS public.surcharge_type;

-- =============================================
-- Phase 5: Rename + add columns
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_group_label TEXT;

-- surcharge_rules: rename + add name
ALTER TABLE public.surcharge_rules DROP CONSTRAINT IF EXISTS surcharge_rules_provider_id_trigger_key;
ALTER TABLE public.surcharge_rules ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.surcharge_rules RENAME COLUMN trigger TO trigger_type;
ALTER TABLE public.surcharge_rules RENAME COLUMN type TO calculation_type;

UPDATE public.surcharge_rules SET name = CASE
  WHEN trigger_type = 'notfall' THEN 'Notfallzuschlag'
  WHEN trigger_type = 'wochenende' THEN 'Wochenendzuschlag'
  WHEN trigger_type = 'anfahrt' THEN 'Anfahrtszuschlag'
  WHEN trigger_type = 'schwieriges_pferd' THEN 'Zuschlag schwieriges Pferd'
  ELSE trigger_type
END WHERE name IS NULL;

-- service_price_overrides: fix unique constraint
ALTER TABLE public.service_price_overrides
  DROP CONSTRAINT IF EXISTS service_price_overrides_service_id_price_group_provider_id_key;
ALTER TABLE public.service_price_overrides
  ADD CONSTRAINT service_price_overrides_service_price_group_uq UNIQUE (service_id, price_group);

-- appointments: neue Preisfelder
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS applied_price NUMERIC,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC,
  ADD COLUMN IF NOT EXISTS price_group_applied TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT;

ALTER TABLE public.appointments RENAME COLUMN surcharge_label TO surcharge_reason;
