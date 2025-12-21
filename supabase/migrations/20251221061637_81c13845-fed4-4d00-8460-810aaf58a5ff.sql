-- Function to notify provider when a client logs in for the first time
CREATE OR REPLACE FUNCTION public.notify_provider_on_client_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  provider_id uuid;
BEGIN
  -- Only trigger when has_logged_in changes from false to true
  IF OLD.has_logged_in = false AND NEW.has_logged_in = true THEN
    -- Get the provider who created this client
    provider_id := NEW.created_by_provider_id;
    
    IF provider_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        provider_id,
        'Kunde eingeloggt',
        COALESCE(NEW.full_name, 'Ein Kunde') || ' hat sich zum ersten Mal eingeloggt.',
        'client_login',
        '/kunden'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for client login notification
DROP TRIGGER IF EXISTS on_client_first_login ON public.profiles;
CREATE TRIGGER on_client_first_login
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_provider_on_client_login();

-- Function to notify provider when a horse is created
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_record RECORD;
  provider_id uuid;
BEGIN
  -- Get owner info
  SELECT full_name, created_by_provider_id INTO owner_record
  FROM public.profiles
  WHERE id = NEW.owner_id;
  
  provider_id := owner_record.created_by_provider_id;
  
  -- Also check access_grants for connected providers
  IF provider_id IS NULL THEN
    SELECT ag.provider_id INTO provider_id
    FROM public.access_grants ag
    WHERE ag.client_id = NEW.owner_id
      AND ag.is_active = true
    LIMIT 1;
  END IF;
  
  IF provider_id IS NOT NULL AND provider_id != NEW.owner_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      provider_id,
      'Neues Pferd angelegt',
      COALESCE(owner_record.full_name, 'Ein Kunde') || ' hat ein neues Pferd angelegt: ' || NEW.name,
      'horse_created',
      '/kunden'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for horse creation
DROP TRIGGER IF EXISTS on_horse_created ON public.horses;
CREATE TRIGGER on_horse_created
  AFTER INSERT ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_provider_on_horse_created();

-- Function to notify provider when a horse is updated by client
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_record RECORD;
  provider_id uuid;
  is_client_update boolean;
BEGIN
  -- Check if update was made by owner (client) not provider
  SELECT full_name, created_by_provider_id INTO owner_record
  FROM public.profiles
  WHERE id = NEW.owner_id;
  
  -- Check if current user is the owner (client updating their own horse)
  is_client_update := (auth.uid() = NEW.owner_id);
  
  IF NOT is_client_update THEN
    RETURN NEW;
  END IF;
  
  provider_id := owner_record.created_by_provider_id;
  
  -- Also check access_grants for connected providers
  IF provider_id IS NULL THEN
    SELECT ag.provider_id INTO provider_id
    FROM public.access_grants ag
    WHERE ag.client_id = NEW.owner_id
      AND ag.is_active = true
    LIMIT 1;
  END IF;
  
  IF provider_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      provider_id,
      'Pferdeakte aktualisiert',
      COALESCE(owner_record.full_name, 'Ein Kunde') || ' hat die Akte von ' || NEW.name || ' aktualisiert.',
      'horse_updated',
      '/kunden'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for horse updates
DROP TRIGGER IF EXISTS on_horse_updated ON public.horses;
CREATE TRIGGER on_horse_updated
  AFTER UPDATE ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_provider_on_horse_updated();

-- Function to notify client when provider creates appointment
CREATE OR REPLACE FUNCTION public.notify_client_on_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  horse_record RECORD;
  provider_name text;
BEGIN
  -- Get horse and owner info
  SELECT h.name, h.owner_id INTO horse_record
  FROM public.horses h
  WHERE h.id = NEW.horse_id;
  
  -- Get provider name
  SELECT full_name INTO provider_name
  FROM public.profiles
  WHERE id = NEW.provider_id;
  
  -- Create notification for horse owner
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    horse_record.owner_id,
    'Neuer Termin',
    COALESCE(provider_name, 'Dein Hufbearbeiter') || ' hat einen Termin für ' || horse_record.name || ' am ' || to_char(NEW.date, 'DD.MM.YYYY') || ' erstellt.',
    'appointment_created',
    '/client-home'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for appointment creation
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_appointment_created();