
-- 1. Employee Team Messages (group chat per provider)
CREATE TABLE public.employee_team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 5000),
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_team_messages ENABLE ROW LEVEL SECURITY;

-- RLS: employees of provider + provider itself can read
CREATE POLICY "team_messages_select" ON public.employee_team_messages FOR SELECT USING (
  provider_id = auth.uid()
  OR public.is_employee_of_provider(auth.uid(), provider_id)
);

-- RLS: employees of provider + provider can insert
CREATE POLICY "team_messages_insert" ON public.employee_team_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    provider_id = auth.uid()
    OR public.is_employee_of_provider(auth.uid(), provider_id)
  )
);

-- 2. Employee Material Requests
CREATE TABLE public.employee_material_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  material_assignment_id UUID NOT NULL REFERENCES public.employee_material_assignments(id) ON DELETE CASCADE,
  requested_quantity INT NOT NULL DEFAULT 1,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "material_requests_employee" ON public.employee_material_requests FOR ALL USING (
  employee_id = public.get_employee_profile_id(auth.uid())
  OR provider_id = auth.uid()
);

-- 3. Add country and timezone to employee_profiles
ALTER TABLE public.employee_profiles 
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'DE',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Berlin';

-- 4. Enable realtime on team messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_team_messages;
