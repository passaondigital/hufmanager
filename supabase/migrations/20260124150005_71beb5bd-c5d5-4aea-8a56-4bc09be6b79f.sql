-- =============================================
-- SAMMELTERMIN & NOTFALL-TOUR ERWEITERUNGEN
-- =============================================

-- 1. Erweitere appointment_groups für Stalltermine
ALTER TABLE public.appointment_groups 
ADD COLUMN IF NOT EXISTS stable_name TEXT,
ADD COLUMN IF NOT EXISTS stable_address TEXT,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT DEFAULT 60,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'));

-- 2. Tabelle für Tagestouren
CREATE TABLE IF NOT EXISTS public.daily_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tour_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_distance_km NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, tour_date)
);

-- 3. Tabelle für Notfall-Status (wenn Hufbearbeiter bei Notfall ist)
CREATE TABLE IF NOT EXISTS public.tour_emergency_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES public.daily_tours(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  emergency_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reason TEXT,
  estimated_delay_minutes INT DEFAULT 30,
  notifications_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Erweitere appointments für Tour-Reihenfolge und Notfall-Typ
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS tour_order INT,
ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS added_during_tour BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stable_group_id UUID REFERENCES public.appointment_groups(id) ON DELETE SET NULL;

-- 5. RLS Policies für daily_tours
ALTER TABLE public.daily_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage own tours"
ON public.daily_tours
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- 6. RLS Policies für tour_emergency_status
ALTER TABLE public.tour_emergency_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage own emergency status"
ON public.tour_emergency_status
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- 7. Index für schnelle Tour-Abfragen
CREATE INDEX IF NOT EXISTS idx_appointments_tour_order ON public.appointments(provider_id, date, tour_order);
CREATE INDEX IF NOT EXISTS idx_daily_tours_date ON public.daily_tours(provider_id, tour_date);
CREATE INDEX IF NOT EXISTS idx_appointments_stable_group ON public.appointments(stable_group_id);

-- 8. Funktion zum Abrufen aktiver Notfall-Status
CREATE OR REPLACE FUNCTION public.get_active_emergency_for_provider(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  started_at TIMESTAMPTZ,
  estimated_delay_minutes INT,
  reason TEXT,
  tour_date DATE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tes.id,
    tes.started_at,
    tes.estimated_delay_minutes,
    tes.reason,
    dt.tour_date
  FROM tour_emergency_status tes
  JOIN daily_tours dt ON tes.tour_id = dt.id
  WHERE tes.provider_id = p_provider_id 
    AND tes.ended_at IS NULL
  LIMIT 1;
$$;

-- 9. Trigger für updated_at auf daily_tours
CREATE TRIGGER update_daily_tours_updated_at
BEFORE UPDATE ON public.daily_tours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();