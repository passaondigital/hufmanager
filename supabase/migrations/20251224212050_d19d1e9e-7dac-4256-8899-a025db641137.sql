-- Create trigger to automatically create notifications when new messages are inserted
CREATE TRIGGER on_message_inserted_create_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- Also ensure push notifications trigger exists
CREATE TRIGGER on_message_inserted_send_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_message();