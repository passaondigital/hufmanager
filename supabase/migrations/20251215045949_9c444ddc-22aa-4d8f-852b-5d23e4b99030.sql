-- Add link column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS link text;

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Create function to create notification on new message
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv_record RECORD;
  recipient_id uuid;
  sender_name text;
BEGIN
  -- Get conversation details
  SELECT provider_id, client_id INTO conv_record
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient (the other party)
  IF NEW.sender_id = conv_record.provider_id THEN
    recipient_id := conv_record.client_id;
  ELSE
    recipient_id := conv_record.provider_id;
  END IF;
  
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Create notification for recipient
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    recipient_id,
    'Neue Nachricht',
    COALESCE(sender_name, 'Jemand') || ': ' || LEFT(NEW.content, 100),
    'chat',
    '/chat?startWith=' || NEW.sender_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_new_message_notification ON public.messages;
CREATE TRIGGER on_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- Create function to create notification on appointment status change
CREATE OR REPLACE FUNCTION public.create_appointment_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    WHERE h.id = NEW.horse_id;
    
    owner_id := horse_record.owner_id;
    
    -- Get provider name
    SELECT full_name INTO provider_name
    FROM public.profiles
    WHERE id = NEW.provider_id;
    
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
  
  RETURN NEW;
END;
$$;

-- Create trigger for appointment status changes
DROP TRIGGER IF EXISTS on_appointment_status_change ON public.appointments;
CREATE TRIGGER on_appointment_status_change
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_appointment_status_notification();