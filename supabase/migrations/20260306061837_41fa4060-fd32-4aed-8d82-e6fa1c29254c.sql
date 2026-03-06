
-- Tranche 1 Vorbereitung: Client-App Felder auf profiles
-- notification_preference + notification_language

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preference text NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS notification_language text NOT NULL DEFAULT 'de';

-- Validation trigger statt CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_profile_notification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.notification_preference NOT IN ('push', 'email', 'both', 'none') THEN
    RAISE EXCEPTION 'Invalid notification_preference: %. Must be push, email, both, or none', NEW.notification_preference;
  END IF;
  IF NEW.notification_language NOT IN ('de', 'at', 'ch') THEN
    RAISE EXCEPTION 'Invalid notification_language: %. Must be de, at, or ch', NEW.notification_language;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_profile_notification_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_notification_fields();
