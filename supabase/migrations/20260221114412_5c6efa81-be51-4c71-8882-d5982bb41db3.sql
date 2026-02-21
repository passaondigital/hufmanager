
-- Erweitere funnel_leads um Terminwünsche, Thema und Kontaktpräferenz
ALTER TABLE public.funnel_leads
  ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'frage',
  ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS preferred_slots JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_history JSONB DEFAULT '[]'::jsonb;

-- Kommentar für Klarheit
COMMENT ON COLUMN public.funnel_leads.topic IS 'frage, demo_1zu1, beratung, sonstiges';
COMMENT ON COLUMN public.funnel_leads.contact_preference IS 'phone, video, zoom';
COMMENT ON COLUMN public.funnel_leads.preferred_slots IS 'Array of {date, time, day} objects, min 2 required';
COMMENT ON COLUMN public.funnel_leads.contact_history IS 'Array of {type, date, notes} contact log entries';

-- Öffentliche Insert-Policy für das Kontaktformular (ohne Auth)
CREATE POLICY "Anyone can submit funnel leads" 
  ON public.funnel_leads 
  FOR INSERT 
  WITH CHECK (true);

-- Rate Limiting Trigger für Funnel Leads
CREATE OR REPLACE FUNCTION public.check_funnel_lead_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Max 3 Anfragen pro E-Mail pro Stunde
  IF NEW.email IS NOT NULL AND (
    SELECT COUNT(*) FROM public.funnel_leads 
    WHERE email = NEW.email 
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 3 THEN
    RAISE EXCEPTION 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
  END IF;
  
  -- Input Sanitization
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := TRIM(regexp_replace(NEW.full_name, '<[^>]*>', '', 'g'));
  END IF;
  IF NEW.message IS NOT NULL THEN
    NEW.message := TRIM(regexp_replace(NEW.message, '<[^>]*>', '', 'g'));
    IF char_length(NEW.message) > 2000 THEN
      RAISE EXCEPTION 'Nachricht zu lang (max. 2000 Zeichen)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_funnel_lead_rate_limit_trigger
  BEFORE INSERT ON public.funnel_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_funnel_lead_rate_limit();
