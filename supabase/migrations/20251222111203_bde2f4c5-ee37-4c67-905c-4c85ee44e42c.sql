-- Function to send push notification via edge function when new chat message arrives
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_conversation record;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation 
  FROM public.conversations 
  WHERE id = NEW.conversation_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Determine recipient (the other person in the conversation)
  IF NEW.sender_id = v_conversation.provider_id THEN
    v_recipient_id := v_conversation.client_id;
  ELSE
    v_recipient_id := v_conversation.provider_id;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(full_name, email, 'Jemand') INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Call edge function to send push notification using pg_net
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', v_recipient_id::text,
      'title', 'Neue Nachricht von ' || v_sender_name,
      'body', LEFT(NEW.content, 100),
      'url', '/chat'
    )::text
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RAISE LOG 'Failed to send push notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_new_chat_message_notification ON public.messages;
CREATE TRIGGER trigger_new_chat_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_message();