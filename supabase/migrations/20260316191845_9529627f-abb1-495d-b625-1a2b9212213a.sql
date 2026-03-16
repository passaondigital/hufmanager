CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, created_at)
  SELECT ur.user_id, 'new_user_registered',
    'Neuer Nutzer registriert',
    'Ein neuer Nutzer hat sich registriert: ' || COALESCE(NEW.full_name, NEW.email, 'Unbekannt'),
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'role', NEW.role,
      'full_name', NEW.full_name,
      'created_at', NEW.created_at
    ),
    now()
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$function$;