-- Fix: Add search_path to handle_new_user function
-- This function is triggered when new users sign up to create their profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- 1. Profil anlegen (JETZT OHNE 'role', da die Spalte fehlt!)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Neuer Nutzer')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Rolle vergeben (Hier gehört sie hin!)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'provider');
  EXCEPTION WHEN OTHERS THEN
    -- Wenn Fehler (z.B. "Gibt es schon"), dann einfach lächeln und weitermachen
    NULL;
  END;

  RETURN new;
END;
$function$;