
-- ============================================
-- FUHRPARK Erweiterung - Fehlende Felder & Kosten-Tabelle
-- ============================================

-- 1) Erweitere provider_vehicles um fehlende Felder
ALTER TABLE public.provider_vehicles
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS tuev_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS initial_odometer INTEGER DEFAULT 0;

-- 2) Vehicle Costs table - Tankbuch & Kosten
CREATE TABLE public.vehicle_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.provider_vehicles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES auth.users(id),
  
  cost_type TEXT NOT NULL CHECK (cost_type IN ('fuel', 'repair', 'maintenance', 'insurance', 'tax', 'tuev', 'tire', 'wash', 'parking', 'toll', 'other')),
  
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Tankbuch-spezifisch
  liters NUMERIC(8,2),
  price_per_liter NUMERIC(6,3),
  mileage_at_cost INTEGER,
  is_full_tank BOOLEAN DEFAULT false,
  fuel_station TEXT,
  
  receipt_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies for vehicle_costs
CREATE POLICY "Provider can view own vehicle costs"
ON public.vehicle_costs FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_employee_of_provider(auth.uid(), provider_id)
);

CREATE POLICY "Provider or employee can insert vehicle costs"
ON public.vehicle_costs FOR INSERT
TO authenticated
WITH CHECK (
  provider_id = auth.uid()
  OR public.is_employee_of_provider(auth.uid(), provider_id)
);

CREATE POLICY "Provider can update own vehicle costs"
ON public.vehicle_costs FOR UPDATE
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Provider can delete own vehicle costs"
ON public.vehicle_costs FOR DELETE
TO authenticated
USING (provider_id = auth.uid());

-- 5) Indexes
CREATE INDEX idx_vehicle_costs_vehicle_id ON public.vehicle_costs(vehicle_id);
CREATE INDEX idx_vehicle_costs_provider_id ON public.vehicle_costs(provider_id);
CREATE INDEX idx_vehicle_costs_date ON public.vehicle_costs(date);
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_assigned_employee ON public.provider_vehicles(assigned_employee_id) WHERE assigned_employee_id IS NOT NULL;

-- 6) Trigger for updated_at
CREATE TRIGGER update_vehicle_costs_updated_at
BEFORE UPDATE ON public.vehicle_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
