-- Add billing_type enum for services
CREATE TYPE public.billing_type AS ENUM ('standard', 'flat_rate', 'series');

-- Add billing_type to services table
ALTER TABLE public.services 
ADD COLUMN billing_type public.billing_type NOT NULL DEFAULT 'standard';

-- Add series tracking fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN is_series_appointment boolean DEFAULT false,
ADD COLUMN series_current integer DEFAULT NULL,
ADD COLUMN series_total integer DEFAULT NULL,
ADD COLUMN is_internally_paid boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.services.billing_type IS 'standard = normal pricing, flat_rate = subscription/external, series = package';
COMMENT ON COLUMN public.appointments.is_internally_paid IS 'True when service is flat_rate but appointment is marked as paid';
COMMENT ON COLUMN public.appointments.is_series_appointment IS 'True when this is part of a series package';
COMMENT ON COLUMN public.appointments.series_current IS 'Current appointment number in series (e.g., 3 of 5)';
COMMENT ON COLUMN public.appointments.series_total IS 'Total appointments in series (e.g., 5)';