-- Fix broken trigger that references non-existent 'plan' column
CREATE OR REPLACE FUNCTION public.notify_admin_on_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  edge_url text;
  service_key text;
BEGIN
  edge_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/admin-notifications';
  service_key := current_setting('app.settings.service_role_key', true);

  IF edge_url IS NULL OR edge_url = '/functions/v1/admin-notifications' THEN
    edge_url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/admin-notifications';
  END IF;

  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify on significant changes (email or name)
    IF OLD.email IS DISTINCT FROM NEW.email OR OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      payload := jsonb_build_object(
        'type', 'UPDATE',
        'record', jsonb_build_object(
          'email', NEW.email,
          'full_name', NEW.full_name
        ),
        'old_record', jsonb_build_object(
          'email', OLD.email,
          'full_name', OLD.full_name
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
$function$;

-- Now fix Heiko's onboarding
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE id = 'aa66b911-8ccc-46d1-8bc5-abab9a5caf6d';