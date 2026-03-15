-- Horse emergency tokens for QR code access
CREATE TABLE IF NOT EXISTS public.horse_emergency_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(horse_id, token)
);

CREATE INDEX idx_horse_emergency_tokens_horse ON public.horse_emergency_tokens(horse_id);
CREATE INDEX idx_horse_emergency_tokens_token ON public.horse_emergency_tokens(token);

ALTER TABLE public.horse_emergency_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_emergency_tokens"
  ON public.horse_emergency_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.horses h
      WHERE h.id = horse_emergency_tokens.horse_id
      AND h.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.horses h
      WHERE h.id = horse_emergency_tokens.horse_id
      AND h.owner_id = auth.uid()
    )
  );

CREATE POLICY "anon_read_active_tokens"
  ON public.horse_emergency_tokens
  FOR SELECT
  USING (is_active = true);