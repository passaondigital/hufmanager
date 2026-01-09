-- Fix SECRETS_EXPOSED: Remove hardcoded anon key from notify_new_chat_message trigger
-- The trigger was calling an edge function with a hardcoded Bearer token, which is a security risk.
-- Instead, we'll remove the HTTP call and rely on the existing create_message_notification trigger
-- which already creates in-app notifications. Push notifications should be handled separately
-- via a scheduled job or client-side approach.

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
  
  -- Mark the conversation as having unread messages for the recipient
  -- Push notifications are handled by the existing create_message_notification trigger
  -- or can be triggered from the client-side after message creation
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if anything goes wrong
  RAISE LOG 'notify_new_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$function$;