-- ============================================
-- VEHICLE MODULE: Betriebsfahrzeug Management
-- Step 1: Create provider_vehicles FIRST
-- ============================================

-- Provider vehicle data table
CREATE TABLE IF NOT EXISTS public.provider_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vehicle identification
  license_plate TEXT, -- Kennzeichen
  brand TEXT, -- Marke (z.B. VW)
  model TEXT, -- Modell (z.B. T6)
  year INTEGER, -- Baujahr
  color TEXT, -- Farbe
  
  -- Operational data
  current_odometer INTEGER, -- Aktueller Tachostand
  fuel_type TEXT, -- Benzin, Diesel, Elektro, Hybrid
  average_consumption DECIMAL(5,2), -- L/100km
  
  -- Insurance & costs
  insurance_company TEXT, -- Versicherung
  insurance_policy_number TEXT, -- Policen-Nr
  insurance_expiry DATE, -- Ablaufdatum
  tax_yearly DECIMAL(10,2), -- KFZ-Steuer pro Jahr
  
  -- Tracking settings
  price_per_km DECIMAL(5,3) DEFAULT 0.30, -- €/km für Abrechnung
  travel_cost_flat DECIMAL(10,2), -- Pauschale Anfahrt
  
  is_primary BOOLEAN DEFAULT true, -- Hauptfahrzeug
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_vehicles ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own vehicles
DROP POLICY IF EXISTS "Providers manage own vehicles" ON public.provider_vehicles;
CREATE POLICY "Providers manage own vehicles"
ON public.provider_vehicles FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Update trigger
CREATE OR REPLACE TRIGGER update_provider_vehicles_updated_at
BEFORE UPDATE ON public.provider_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();