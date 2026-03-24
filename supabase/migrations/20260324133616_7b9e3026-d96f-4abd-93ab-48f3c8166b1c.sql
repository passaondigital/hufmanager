-- Trigger function: notify on new user registration (fires when user_roles gets a new entry)
-- Uses pg_net to call the edge function asynchronously
CREATE OR REPLACE FUNCTION public.notify_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _full_name text;
BEGIN
  -- Get user info from profiles
  SELECT email, full_name INTO _email, _full_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/notify-new-registration',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'role', NEW.role::text,
      'email', COALESCE(_email, ''),
      'full_name', COALESCE(_full_name, '')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block registration if notification fails
  RAISE WARNING 'notify_new_registration failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS trg_notify_new_registration ON public.user_roles;
CREATE TRIGGER trg_notify_new_registration
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_registration();