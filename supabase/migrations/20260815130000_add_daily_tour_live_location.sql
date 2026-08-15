-- Ephemeral live position and current delay state for delivery-style ETA.
-- Only the provider can access daily_tours through normal RLS; clients receive
-- an aggregated ETA/status via the authenticated get-client-tour-status Edge Function.
-- The frontend overwrites one current position instead of storing a full route.

ALTER TABLE public.daily_tours
  ADD COLUMN IF NOT EXISTS live_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_minutes INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS delay_reported_at TIMESTAMPTZ;

-- Older DayCockpit versions used tour_active_since / tour_ended_at without
-- consistently updating daily_tours.status. Normalize those rows once so the
-- consolidated Slim tour has a single status truth after this migration.
UPDATE public.daily_tours
SET status = 'active', updated_at = now()
WHERE tour_active_since IS NOT NULL
  AND tour_ended_at IS NULL
  AND status IS DISTINCT FROM 'active';

UPDATE public.daily_tours
SET status = 'completed', updated_at = now()
WHERE tour_ended_at IS NOT NULL
  AND status IS DISTINCT FROM 'completed';

COMMENT ON COLUMN public.daily_tours.live_lat IS 'Ephemeral provider latitude while a tour is active; cleared after tour end.';
COMMENT ON COLUMN public.daily_tours.live_lng IS 'Ephemeral provider longitude while a tour is active; cleared after tour end.';
COMMENT ON COLUMN public.daily_tours.live_accuracy IS 'Browser geolocation accuracy in meters for the ephemeral live position.';
COMMENT ON COLUMN public.daily_tours.live_location_at IS 'Timestamp of the latest ephemeral live position; used only for freshness checks and ETA.';
COMMENT ON COLUMN public.daily_tours.delay_minutes IS 'Current provider-reported tour delay in minutes; 0 means no active delay.';
COMMENT ON COLUMN public.daily_tours.delay_reason IS 'Optional short reason for the current tour delay.';
COMMENT ON COLUMN public.daily_tours.delay_reported_at IS 'Timestamp when the current tour delay was last changed.';
