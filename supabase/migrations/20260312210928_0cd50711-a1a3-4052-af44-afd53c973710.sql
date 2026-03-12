-- Employee Horse Access: explicit per-horse assignments for employees
CREATE TABLE IF NOT EXISTS public.employee_horse_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  can_add_notes boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, horse_id)
);

-- RLS
ALTER TABLE public.employee_horse_access ENABLE ROW LEVEL SECURITY;

-- Employees can read their own access entries
CREATE POLICY "employees_read_own_access"
  ON public.employee_horse_access
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Providers can manage access for their employees
CREATE POLICY "providers_manage_employee_access"
  ON public.employee_horse_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = employee_horse_access.employee_id
        AND ep.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = employee_horse_access.employee_id
        AND ep.provider_id = auth.uid()
    )
  );