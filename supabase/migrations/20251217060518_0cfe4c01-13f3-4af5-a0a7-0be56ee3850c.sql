-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Ensure messages have REPLICA IDENTITY for realtime to work properly
ALTER TABLE public.messages REPLICA IDENTITY FULL;