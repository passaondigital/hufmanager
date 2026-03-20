-- Fix: notify_admin_new_user trigger uses non-existent 'data' column
-- Remove 'data' field from the insert statement
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, created_at)
  SELECT ur.user_id, 'new_user_registered',
    'Neuer Nutzer registriert',
    'Ein neuer Nutzer hat sich registriert: ' || COALESCE(NEW.full_name, NEW.email, 'Unbekannt'),
    now()
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;