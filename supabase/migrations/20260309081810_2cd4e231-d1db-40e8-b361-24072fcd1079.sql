
-- ══════════════════════════════════════════
-- Chat Feature Upgrade: read receipts, delete, reply, reactions, voice
-- ══════════════════════════════════════════

-- 1. Lesebestätigungen
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Nachrichten löschen
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT false;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT false;

-- 3. Nachrichten zitieren
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_content TEXT;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.employee_messages(id) ON DELETE SET NULL;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS reply_to_content TEXT;

-- 4. Sprachnachrichten
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS voice_url TEXT;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS voice_duration_seconds INT;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS voice_url TEXT;

ALTER TABLE public.employee_messages
ADD COLUMN IF NOT EXISTS voice_duration_seconds INT;

-- 5. Reaktionen-Tabelle
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: Beteiligte können Reaktionen lesen
CREATE POLICY "Users can read reactions for their conversations"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
    AND (c.provider_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- RLS: Nur eigene Reaktionen einfügen
CREATE POLICY "Users can insert own reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS: Nur eigene Reaktionen löschen
CREATE POLICY "Users can delete own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
