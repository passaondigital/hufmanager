-- Create hoof_history table for tracking hoof health entries
CREATE TABLE public.hoof_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('standard', 'beschlag', 'krankheitsfall', 'kontrolle')),
  description TEXT,
  photo_before_url TEXT,
  photo_after_url TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hoof_history ENABLE ROW LEVEL SECURITY;

-- Create policies for horse owners
CREATE POLICY "Horse owners can view hoof history"
ON public.hoof_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.horses
    WHERE horses.id = hoof_history.horse_id
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Horse owners can create hoof history entries"
ON public.hoof_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.horses
    WHERE horses.id = hoof_history.horse_id
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Horse owners can update their hoof history entries"
ON public.hoof_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.horses
    WHERE horses.id = hoof_history.horse_id
    AND horses.owner_id = auth.uid()
  )
);

CREATE POLICY "Horse owners can delete hoof history entries"
ON public.hoof_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.horses
    WHERE horses.id = hoof_history.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Create policies for providers with access
CREATE POLICY "Providers with access can view hoof history"
ON public.hoof_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_history.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND ag.status IN ('active', 'pending')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.profiles p ON p.id = h.owner_id
    WHERE h.id = hoof_history.horse_id
    AND p.created_by_provider_id = auth.uid()
  )
);

CREATE POLICY "Providers with access can create hoof history entries"
ON public.hoof_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_history.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND ag.status IN ('active', 'pending')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.profiles p ON p.id = h.owner_id
    WHERE h.id = hoof_history.horse_id
    AND p.created_by_provider_id = auth.uid()
  )
);

CREATE POLICY "Entry creators can update their entries"
ON public.hoof_history
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Entry creators can delete their entries"
ON public.hoof_history
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hoof_history_updated_at
BEFORE UPDATE ON public.hoof_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_hoof_history_horse_id ON public.hoof_history(horse_id);
CREATE INDEX idx_hoof_history_entry_date ON public.hoof_history(entry_date DESC);