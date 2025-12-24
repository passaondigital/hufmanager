-- Ensure chat push notifications can invoke the edge function securely (internal header)
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs',
      'x-internal-call', 'true'
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
$function$;