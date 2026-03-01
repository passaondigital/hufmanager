
-- Employee Notifications table
CREATE TABLE IF NOT EXISTS public.employee_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  link_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees see own notifications"
  ON public.employee_notifications FOR SELECT TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Employees update own notifications"
  ON public.employee_notifications FOR UPDATE TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert employee notifications"
  ON public.employee_notifications FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employee_profiles WHERE provider_id = auth.uid()
    )
    OR employee_id IN (
      SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_employee_notifications_employee ON public.employee_notifications(employee_id);
CREATE INDEX idx_employee_notifications_unread ON public.employee_notifications(employee_id) WHERE read_at IS NULL;

-- Employee Time Records table
CREATE TABLE IF NOT EXISTS public.employee_time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  break_type TEXT DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.employee_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage own time records"
  ON public.employee_time_records FOR ALL TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers see their employees time records"
  ON public.employee_time_records FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE INDEX idx_employee_time_records_employee ON public.employee_time_records(employee_id);
CREATE INDEX idx_employee_time_records_date ON public.employee_time_records(date);

-- Add onboarding_completed to employee_profiles
ALTER TABLE public.employee_profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed JSONB DEFAULT '{}';

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Storage bucket for employee avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-avatars', 'employee-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Employees upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Employees update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read employee avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'employee-avatars');
