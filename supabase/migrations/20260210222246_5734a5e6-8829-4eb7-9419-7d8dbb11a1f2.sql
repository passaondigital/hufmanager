
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
ON public.ai_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
ON public.ai_chat_messages
FOR DELETE
USING (auth.uid() = user_id);
