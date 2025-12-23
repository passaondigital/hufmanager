-- Fix notification triggers to not fire on soft-delete operations
-- The issue is that when we set deleted_at, the UPDATE trigger fires and tries to create notifications

-- 1. Update notify_provider_on_horse_updated to skip when deleted_at is being set
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  owner_record RECORD;
  provider_id uuid;
  is_client_update boolean;
BEGIN
  -- Skip if this is a soft-delete operation (deleted_at is being set)
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
    RETURN NEW;
  END IF;

  -- Check if update was made by owner (client) not provider
  SELECT full_name, created_by_provider_id INTO owner_record
  FROM public.profiles
  WHERE id = NEW.owner_id AND deleted_at IS NULL;
  
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
  
  -- Only create notification if provider exists and is not deleted
  IF provider_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = provider_id AND deleted_at IS NULL
  ) THEN
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
$function$;

-- 2. Update notify_provider_on_horse_created to check if profile exists
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  owner_record RECORD;
  provider_id uuid;
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

-- 3. Update create_appointment_status_notification to check if owner exists
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