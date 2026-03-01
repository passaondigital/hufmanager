
-- ============================================================
-- FIX 6: Employee Conversations & Messages (separate from client conversations)
-- Mirrors the partner_conversations / partner_messages pattern
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employee_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  subject text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, provider_id)
);

ALTER TABLE public.employee_conversations ENABLE ROW LEVEL SECURITY;

-- Employees can see their own conversations
CREATE POLICY "employee_own_conversations" ON public.employee_conversations
  FOR ALL USING (
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid())
    OR provider_id = auth.uid()
  );

CREATE TABLE IF NOT EXISTS public.employee_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.employee_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_messages ENABLE ROW LEVEL SECURITY;

-- Users in the conversation can see messages
CREATE POLICY "employee_conversation_messages" ON public.employee_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.employee_conversations
      WHERE employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid())
         OR provider_id = auth.uid()
    )
  );

-- Message length validation trigger (reuse existing function)
CREATE TRIGGER validate_employee_message_length
  BEFORE INSERT OR UPDATE ON public.employee_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_message_length();

-- ============================================================
-- Employee sync queue for offline mode
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employee_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

ALTER TABLE public.employee_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_own_sync_queue" ON public.employee_sync_queue
  FOR ALL USING (
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- Employee account self-delete function
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_employee_account(_employee_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _emp_id uuid;
  _provider_id uuid;
  _emp_name text;
BEGIN
  -- Verify the caller is the employee themselves
  IF auth.uid() != _employee_user_id THEN
    RAISE EXCEPTION 'Nur der eigene Account kann gelöscht werden';
  END IF;

  -- Get employee profile
  SELECT id, provider_id, full_name INTO _emp_id, _provider_id, _emp_name
  FROM public.employee_profiles
  WHERE user_id = _employee_user_id;

  IF _emp_id IS NULL THEN
    RAISE EXCEPTION 'Kein Mitarbeiterprofil gefunden';
  END IF;

  -- Soft-delete employee profile
  UPDATE public.employee_profiles
  SET status = 'inactive', updated_at = now()
  WHERE id = _emp_id;

  -- Soft-delete related data
  UPDATE public.employee_assignments
  SET status = 'cancelled'
  WHERE employee_id = _emp_id AND status NOT IN ('completed', 'cancelled', 'checked_out');

  -- Log for provider visibility
  INSERT INTO public.admin_activity_log (admin_id, action_type, target_type, target_id, target_name, details)
  VALUES (
    _provider_id,
    'employee_self_delete',
    'employee',
    _emp_id::text,
    _emp_name,
    jsonb_build_object('deleted_by', 'self', 'deleted_at', now()::text)
  );

  -- Soft-delete auth profile  
  UPDATE public.profiles
  SET deleted_at = now()
  WHERE id = _employee_user_id;
END;
$$;
