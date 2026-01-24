-- Create table for tour breadcrumbs (location tracking during tours)
CREATE TABLE public.tour_breadcrumbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES public.daily_tours(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tour_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_tour_breadcrumbs_provider_date ON public.tour_breadcrumbs(provider_id, tour_date);
CREATE INDEX idx_tour_breadcrumbs_tour_id ON public.tour_breadcrumbs(tour_id);

-- Enable RLS
ALTER TABLE public.tour_breadcrumbs ENABLE ROW LEVEL SECURITY;

-- Providers can only see their own breadcrumbs
CREATE POLICY "Providers can view their own breadcrumbs" 
ON public.tour_breadcrumbs 
FOR SELECT 
USING (auth.uid() = provider_id);

-- Providers can insert their own breadcrumbs
CREATE POLICY "Providers can insert their own breadcrumbs" 
ON public.tour_breadcrumbs 
FOR INSERT 
WITH CHECK (auth.uid() = provider_id);

-- Providers can delete their own breadcrumbs
CREATE POLICY "Providers can delete their own breadcrumbs" 
ON public.tour_breadcrumbs 
FOR DELETE 
USING (auth.uid() = provider_id);

-- Add tour_active_since to daily_tours if not exists
ALTER TABLE public.daily_tours 
ADD COLUMN IF NOT EXISTS tour_active_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tour_ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_distance_km DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS optimized_order JSONB;