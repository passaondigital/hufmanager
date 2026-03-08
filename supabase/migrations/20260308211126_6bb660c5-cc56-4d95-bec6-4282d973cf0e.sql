-- Trust counters in business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS horses_treated INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS years_experience INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_area_km INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS instagram_posts JSONB DEFAULT '[]'::jsonb;

-- Lead scoring columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_quality TEXT DEFAULT 'cold';

-- Lead scoring trigger function
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  score INT := 0;
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    score := score + 10;
  END IF;
  IF NEW.message IS NOT NULL AND char_length(NEW.message) > 50 THEN
    score := score + 5;
  END IF;
  IF NEW.source IS NOT NULL AND (NEW.source ILIKE '%google%' OR NEW.source ILIKE '%organic%') THEN
    score := score + 20;
  END IF;
  IF NEW.lead_type = 'termin' THEN
    score := score + 10;
  END IF;
  IF NEW.lead_type = 'notfall' THEN
    score := score + 15;
  END IF;

  NEW.lead_score := score;
  
  IF score >= 50 THEN
    NEW.lead_quality := 'hot';
  ELSIF score >= 25 THEN
    NEW.lead_quality := 'warm';
  ELSE
    NEW.lead_quality := 'cold';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_lead_score ON public.leads;
CREATE TRIGGER trg_calculate_lead_score
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_lead_score();