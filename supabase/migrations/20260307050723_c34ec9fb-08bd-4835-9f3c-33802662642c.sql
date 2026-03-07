-- Database webhook: Notify admins on profile INSERT (new user)
-- and on profile UPDATE (plan change) and DELETE (account deleted)
-- Using pg_net to call the edge function

-- Create a function that calls the admin-notifications edge function
CREATE OR REPLACE FUNCTION public.notify_admin_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  edge_url text;
  service_key text;
BEGIN
  edge_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/admin-notifications';
  service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback: use direct URL if settings not available
  IF edge_url IS NULL OR edge_url = '/functions/v1/admin-notifications' THEN
    edge_url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/admin-notifications';
  END IF;

  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'role', NEW.role,
        'plan', NEW.plan
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify on plan changes
    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
      payload := jsonb_build_object(
        'type', 'UPDATE',
        'record', jsonb_build_object(
          'email', NEW.email,
          'full_name', NEW.full_name,
          'plan', NEW.plan
        ),
        'old_record', jsonb_build_object(
          'email', OLD.email,
          'full_name', OLD.full_name,
          'plan', OLD.plan
        )
      );
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'old_record', jsonb_build_object(
        'email', OLD.email,
        'full_name', OLD.full_name
      )
    );
  END IF;

  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS notify_admin_profile_changes ON public.profiles;
CREATE TRIGGER notify_admin_profile_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_profile_change();