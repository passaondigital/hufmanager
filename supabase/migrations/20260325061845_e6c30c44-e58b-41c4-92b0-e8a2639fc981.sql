-- Add tier/type columns to subscription_plans for 3-tier model
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'balance',
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'abo',
  ADD COLUMN IF NOT EXISTS price_per_appointment numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS travel_fee_zone1 numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS travel_fee_zone2 numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS surcharge_per_30min numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS discount_per_extra_horse numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 45,
  ADD COLUMN IF NOT EXISTS duration_weeks integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_appointments integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flat_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_split text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_notice text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS not_included text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_application boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_color text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN subscription_plans.tier IS 'go | balance | intensiv';
COMMENT ON COLUMN subscription_plans.plan_type IS 'single | abo | package';
COMMENT ON COLUMN subscription_plans.flat_price IS 'For package plans like INTENSIV (699€)';
COMMENT ON COLUMN subscription_plans.payment_split IS 'e.g. 50/50 for INTENSIV';