-- Ephemeral live position for delivery-style ETA.
-- Only the provider can access daily_tours through normal RLS; clients receive
-- an aggregated ETA via the authenticated get-client-tour-status Edge Function.
-- The frontend overwrites this single position instead of storing a full route.

ALTER TABLE public.daily_tours
  ADD COLUMN IF NOT EXISTS live_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS live_location_at TIMESTAMPTZ;

COMMENT ON COLUMN public.daily_tours.live_lat IS 'Ephemeral provider latitude while a tour is active; cleared after tour end.';
COMMENT ON COLUMN public.daily_tours.live_lng IS 'Ephemeral provider longitude while a tour is active; cleared after tour end.';
COMMENT ON COLUMN public.daily_tours.live_accuracy IS 'Browser geolocation accuracy in meters for the ephemeral live position.';
COMMENT ON COLUMN public.daily_tours.live_location_at IS 'Timestamp of the latest ephemeral live position; used only for freshness checks and ETA.';
