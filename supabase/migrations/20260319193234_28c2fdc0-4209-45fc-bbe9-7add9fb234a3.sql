-- First add the column
ALTER TABLE public.horse_partner_access ADD COLUMN IF NOT EXISTS can_view_chat boolean DEFAULT false;

-- Create tables
CREATE TABLE public.horse_chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(horse_id)
);

CREATE TABLE public.horse_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.horse_chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  file_url text,
  is_read_by jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_horse_chat_messages_channel ON public.horse_chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_horse_chat_channels_horse ON public.horse_chat_channels(horse_id);

ALTER TABLE public.horse_chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.has_horse_chat_access(p_user_id uuid, p_horse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM horses h WHERE h.id = p_horse_id AND h.owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.horse_id = p_horse_id AND a.provider_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM horse_partner_access hpa 
    WHERE hpa.horse_id = p_horse_id AND hpa.partner_profile_id = p_user_id 
      AND hpa.can_view_chat = true AND hpa.owner_approved = true
  ) OR EXISTS (
    SELECT 1 FROM employee_horse_access eha 
    WHERE eha.horse_id = p_horse_id AND eha.employee_id = p_user_id
  );
$$;

-- RLS policies
CREATE POLICY "Users can view horse chat channels they have access to"
  ON public.horse_chat_channels FOR SELECT TO authenticated
  USING (public.has_horse_chat_access(auth.uid(), horse_id));

CREATE POLICY "Authorized users can create channels"
  ON public.horse_chat_channels FOR INSERT TO authenticated
  WITH CHECK (public.has_horse_chat_access(auth.uid(), horse_id));

CREATE POLICY "Users can view messages in accessible channels"
  ON public.horse_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM horse_chat_channels hcc 
    WHERE hcc.id = channel_id AND public.has_horse_chat_access(auth.uid(), hcc.horse_id)
  ));

CREATE POLICY "Users can send messages to accessible channels"
  ON public.horse_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM horse_chat_channels hcc 
      WHERE hcc.id = channel_id AND public.has_horse_chat_access(auth.uid(), hcc.horse_id)
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.horse_chat_messages;