
-- =============================================
-- ADMIN MESSAGING SYSTEM — Phase 1
-- =============================================

-- 1. admin_messages
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_type text NOT NULL DEFAULT 'provider' CHECK (recipient_type IN ('provider','client','partner','employee','portal')),
  subject text NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL DEFAULT 'info' CHECK (message_type IN ('info','offer','warning','request','document')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','important','urgent')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','accepted','declined','pending')),
  requires_action boolean NOT NULL DEFAULT false,
  action_options jsonb,
  action_taken text,
  action_taken_at timestamptz,
  attachments jsonb,
  template_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_admin_messages_recipient ON public.admin_messages(recipient_id, read_at);
CREATE INDEX idx_admin_messages_status ON public.admin_messages(recipient_id, status);

-- 2. admin_message_replies
CREATE TABLE public.admin_message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user' CHECK (sender_type IN ('admin','user')),
  body text NOT NULL,
  attachments jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_message_replies_message ON public.admin_message_replies(message_id);

-- 3. admin_message_templates
CREATE TABLE public.admin_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'info' CHECK (category IN ('offer','info','warning','request')),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  default_action_options jsonb,
  default_priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_templates ENABLE ROW LEVEL SECURITY;

-- admin_messages: Admin full access
CREATE POLICY "admin_full_access_messages" ON public.admin_messages
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- admin_messages: User can SELECT own messages
CREATE POLICY "user_select_own_messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- admin_messages: User can UPDATE own messages (only read_at, status, action_taken, action_taken_at)
CREATE POLICY "user_update_own_messages" ON public.admin_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- admin_message_replies: Admin full access
CREATE POLICY "admin_full_access_replies" ON public.admin_message_replies
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- admin_message_replies: User can read replies on own messages
CREATE POLICY "user_select_own_replies" ON public.admin_message_replies
  FOR SELECT TO authenticated
  USING (message_id IN (SELECT id FROM public.admin_messages WHERE recipient_id = auth.uid()));

-- admin_message_replies: User can insert replies on own messages
CREATE POLICY "user_insert_own_replies" ON public.admin_message_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'user'
    AND message_id IN (SELECT id FROM public.admin_messages WHERE recipient_id = auth.uid())
  );

-- admin_message_templates: Admin only
CREATE POLICY "admin_full_access_templates" ON public.admin_message_templates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
