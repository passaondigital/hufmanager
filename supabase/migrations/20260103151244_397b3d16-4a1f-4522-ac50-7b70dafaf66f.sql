-- Add idempotency check to prevent notification spam
-- This prevents duplicate notifications within a 5-minute window

-- 1. Update create_appointment_status_notification with idempotency check
CREATE OR REPLACE FUNCTION public.create_appointment_status_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  horse_record RECORD;
  owner_id uuid;
  provider_name text;
  notification_exists boolean;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get horse and owner info
    SELECT h.name, h.owner_id INTO horse_record
    FROM public.horses h
    WHERE h.id = NEW.horse_id AND h.deleted_at IS NULL;
    
    owner_id := horse_record.owner_id;
    
    -- Only proceed if owner exists and is not deleted
    IF owner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = owner_id AND deleted_at IS NULL
    ) THEN
      -- IDEMPOTENCY CHECK: Don't send duplicate notifications within 5 minutes
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = owner_id
          AND type = 'appointment'
          AND message LIKE '%' || COALESCE(horse_record.name, 'dein Pferd') || '%'
          AND message LIKE '%' || NEW.status || '%'
          AND created_at > NOW() - INTERVAL '5 minutes'
      ) INTO notification_exists;
      
      IF notification_exists THEN
        -- Skip duplicate notification
        RETURN NEW;
      END IF;
      
      -- Get provider name
      SELECT full_name INTO provider_name
      FROM public.profiles
      WHERE id = NEW.provider_id AND deleted_at IS NULL;
      
      -- Create notification for horse owner
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        owner_id,
        'Termin aktualisiert',
        'Termin für ' || COALESCE(horse_record.name, 'dein Pferd') || ': Status ist jetzt "' || NEW.status || '"',
        'appointment',
        '/client-home'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Update notify_client_on_appointment_created with idempotency check
CREATE OR REPLACE FUNCTION public.notify_client_on_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  horse_record RECORD;
  provider_name text;
  notification_exists boolean;
BEGIN
  -- Get horse and owner info
  SELECT h.name, h.owner_id INTO horse_record
  FROM public.horses h
  WHERE h.id = NEW.horse_id;
  
  -- Get provider name
  SELECT full_name INTO provider_name
  FROM public.profiles
  WHERE id = NEW.provider_id;
  
  -- IDEMPOTENCY CHECK: Don't send duplicate notifications within 5 minutes
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = horse_record.owner_id
      AND type = 'appointment_created'
      AND message LIKE '%' || horse_record.name || '%'
      AND message LIKE '%' || to_char(NEW.date, 'DD.MM.YYYY') || '%'
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) INTO notification_exists;
  
  IF notification_exists THEN
    -- Skip duplicate notification
    RETURN NEW;
  END IF;
  
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
$function$;

-- 3. Update notify_provider_on_horse_created with idempotency check
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  owner_record RECORD;
  provider_id uuid;
  notification_exists boolean;
BEGIN
  -- Get owner info (only if not deleted)
  SELECT full_name, created_by_provider_id INTO owner_record
  FROM public.profiles
  WHERE id = NEW.owner_id AND deleted_at IS NULL;
  
  provider_id := owner_record.created_by_provider_id;
  
  -- Also check access_grants for connected providers
  IF provider_id IS NULL THEN
    SELECT ag.provider_id INTO provider_id
    FROM public.access_grants ag
    WHERE ag.client_id = NEW.owner_id
      AND ag.is_active = true
    LIMIT 1;
  END IF;
  
  -- Only create notification if provider exists and is valid
  IF provider_id IS NOT NULL AND provider_id != NEW.owner_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = provider_id AND deleted_at IS NULL
  ) THEN
    -- IDEMPOTENCY CHECK: Don't send duplicate notifications within 5 minutes
    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = provider_id
        AND type = 'horse_created'
        AND message LIKE '%' || NEW.name || '%'
        AND created_at > NOW() - INTERVAL '5 minutes'
    ) INTO notification_exists;
    
    IF notification_exists THEN
      RETURN NEW;
    END IF;
    
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
$function$;