ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS vehicle_consumption_per_100km numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vehicle_fuel_type text DEFAULT NULL;