-- Create set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Futterplan
CREATE TABLE IF NOT EXISTS public.horse_feed_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  meal_name TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  product_name TEXT,
  amount TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  shared_with_stall BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Bewegungstagebuch
CREATE TABLE IF NOT EXISTS public.horse_exercise_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER,
  intensity TEXT DEFAULT 'mittel',
  notes TEXT,
  mood TEXT,
  performed_by TEXT,
  shared_with_stall BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Medikamentenerinnerungen
CREATE TABLE IF NOT EXISTS public.horse_medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  medication_type TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  last_given_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.horse_feed_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_exercise_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_medication_reminders ENABLE ROW LEVEL SECURITY;

-- Feed Plans policies
CREATE POLICY "feed_plans_select" ON public.horse_feed_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "feed_plans_insert" ON public.horse_feed_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "feed_plans_update" ON public.horse_feed_plans FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));
CREATE POLICY "feed_plans_delete" ON public.horse_feed_plans FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));

-- Exercise Log policies
CREATE POLICY "exercise_log_select" ON public.horse_exercise_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "exercise_log_insert" ON public.horse_exercise_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "exercise_log_update" ON public.horse_exercise_log FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));
CREATE POLICY "exercise_log_delete" ON public.horse_exercise_log FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));

-- Medication Reminders policies
CREATE POLICY "med_reminders_select" ON public.horse_medication_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "med_reminders_insert" ON public.horse_medication_reminders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = (SELECT owner_id FROM public.horses WHERE id = horse_id) AND ag.provider_id = auth.uid() AND ag.status = 'active'));
CREATE POLICY "med_reminders_update" ON public.horse_medication_reminders FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));
CREATE POLICY "med_reminders_delete" ON public.horse_medication_reminders FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.horses h WHERE h.id = horse_id AND h.owner_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_horse_feed_plans_horse ON public.horse_feed_plans(horse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_horse_exercise_log_horse ON public.horse_exercise_log(horse_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_horse_med_reminders_horse ON public.horse_medication_reminders(horse_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_horse_med_reminders_due ON public.horse_medication_reminders(next_due_date) WHERE deleted_at IS NULL AND is_active = true;

-- Triggers
CREATE TRIGGER set_updated_at_horse_feed_plans BEFORE UPDATE ON public.horse_feed_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_horse_medication_reminders BEFORE UPDATE ON public.horse_medication_reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();