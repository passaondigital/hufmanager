-- Add travel cost settings to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN travel_cost_per_km numeric DEFAULT 0.50,
ADD COLUMN travel_cost_flat numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.business_settings.travel_cost_per_km IS 'Cost per kilometer for travel (default 0.50€)';
COMMENT ON COLUMN public.business_settings.travel_cost_flat IS 'Flat travel cost regardless of distance';