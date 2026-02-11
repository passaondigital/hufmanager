
-- =============================================
-- 1. Abwesenheitsanträge (Urlaub, Krankheit, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS public.employee_absence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL DEFAULT 'vacation' CHECK (type IN ('vacation', 'sick', 'personal', 'training', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_absence_requests ENABLE ROW LEVEL SECURITY;

-- MA kann eigene Anträge sehen
CREATE POLICY "Employees can view own absence requests"
ON public.employee_absence_requests FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  )
);

-- MA kann Anträge erstellen
CREATE POLICY "Employees can create own absence requests"
ON public.employee_absence_requests FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  )
);

-- MA kann eigene pending-Anträge stornieren
CREATE POLICY "Employees can cancel own pending requests"
ON public.employee_absence_requests FOR UPDATE
USING (
  employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Provider kann Anträge seiner MA sehen und bearbeiten
CREATE POLICY "Providers can manage employee absence requests"
ON public.employee_absence_requests FOR ALL
USING (provider_id = auth.uid());

-- =============================================
-- 2. Materialzuweisungen an Mitarbeiter
-- =============================================
CREATE TABLE IF NOT EXISTS public.employee_material_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  material_name TEXT NOT NULL,
  material_category TEXT,
  quantity_assigned NUMERIC NOT NULL DEFAULT 0,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'Stück',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_material_assignments ENABLE ROW LEVEL SECURITY;

-- MA kann zugewiesenes Material sehen
CREATE POLICY "Employees can view own material assignments"
ON public.employee_material_assignments FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  )
);

-- MA kann Verbrauch melden (nur quantity_used update)
CREATE POLICY "Employees can report material usage"
ON public.employee_material_assignments FOR UPDATE
USING (
  employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  )
);

-- Provider kann Material seiner MA verwalten
CREATE POLICY "Providers can manage employee materials"
ON public.employee_material_assignments FOR ALL
USING (provider_id = auth.uid());

-- Trigger für updated_at
CREATE TRIGGER update_employee_absence_requests_updated_at
BEFORE UPDATE ON public.employee_absence_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_material_assignments_updated_at
BEFORE UPDATE ON public.employee_material_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
