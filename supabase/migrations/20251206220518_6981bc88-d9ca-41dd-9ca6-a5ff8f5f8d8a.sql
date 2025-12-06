-- Create table for LTZ Hoof Analysis records
CREATE TABLE public.hoof_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Step 1: Exterieur & Gang (Before touching the hoof)
  stance_front TEXT, -- Stellung Vordergliedmaße: zeheneng, zehenweit, bodenweit, bodeneng, regular
  stance_rear TEXT,  -- Stellung Hintergliedmaße: zeheneng, zehenweit, bodenweit, bodeneng, regular
  croup_movement TEXT, -- Bewegung Kruppe: equal, left_higher, right_higher
  belly_swing TEXT, -- Bauchpendel: equal, left, right
  footfall_left TEXT, -- Fußung Links: arching, threading, planar
  footfall_right TEXT, -- Fußung Rechts: arching, threading, planar
  
  -- Step 2: Per-Hoof LTZ Parameters (stored as JSONB for each hoof)
  hoof_data_vl JSONB DEFAULT '{}', -- Vorne Links
  hoof_data_vr JSONB DEFAULT '{}', -- Vorne Rechts
  hoof_data_hl JSONB DEFAULT '{}', -- Hinten Links
  hoof_data_hr JSONB DEFAULT '{}', -- Hinten Rechts
  
  -- General notes and recommendations
  notes TEXT,
  recommendations TEXT[], -- Auto-generated recommendations based on analysis
  status TEXT DEFAULT 'draft' -- draft, completed
);

-- Enable Row Level Security
ALTER TABLE public.hoof_analyses ENABLE ROW LEVEL SECURITY;

-- Providers can view their own analyses
CREATE POLICY "Providers can view their own analyses"
ON public.hoof_analyses
FOR SELECT
USING (provider_id = auth.uid());

-- Providers can create analyses
CREATE POLICY "Providers can create analyses"
ON public.hoof_analyses
FOR INSERT
WITH CHECK (provider_id = auth.uid());

-- Providers can update their own analyses
CREATE POLICY "Providers can update their own analyses"
ON public.hoof_analyses
FOR UPDATE
USING (provider_id = auth.uid());

-- Providers can delete their own analyses
CREATE POLICY "Providers can delete their own analyses"
ON public.hoof_analyses
FOR DELETE
USING (provider_id = auth.uid());

-- Clients can view analyses for their horses
CREATE POLICY "Clients can view analyses for their horses"
ON public.hoof_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.horses
    WHERE horses.id = hoof_analyses.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_hoof_analyses_updated_at
BEFORE UPDATE ON public.hoof_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_hoof_analyses_horse_id ON public.hoof_analyses(horse_id);
CREATE INDEX idx_hoof_analyses_provider_id ON public.hoof_analyses(provider_id);
CREATE INDEX idx_hoof_analyses_created_at ON public.hoof_analyses(created_at DESC);