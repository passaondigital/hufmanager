-- Add rate limiting for lead submissions to prevent spam/flooding

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_lead_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rate limit: max 5 submissions per email per hour
  IF NEW.email IS NOT NULL AND (
    SELECT COUNT(*) FROM public.leads 
    WHERE email = NEW.email 
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
  END IF;
  
  -- Rate limit: max 10 submissions per provider per hour (IP-based would be better but not available)
  IF (
    SELECT COUNT(*) FROM public.leads 
    WHERE provider_id = NEW.provider_id 
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 50 THEN
    RAISE EXCEPTION 'Dieses Formular ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting on lead inserts
DROP TRIGGER IF EXISTS lead_rate_limit_trigger ON public.leads;
CREATE TRIGGER lead_rate_limit_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lead_rate_limit();

-- Reduce message length limit from 5000 to 2000 chars for more reasonable limit
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_message_length;
ALTER TABLE public.leads ADD CONSTRAINT leads_message_length CHECK (char_length(message) <= 2000);