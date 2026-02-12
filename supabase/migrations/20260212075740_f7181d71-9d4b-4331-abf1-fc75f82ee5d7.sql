
-- Fix: Set search_path on generate_smart_id to prevent search_path injection
CREATE OR REPLACE FUNCTION public.generate_smart_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  prefix text;
  new_id text;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
     IF NEW.role ILIKE '%mitarbeiter%' OR NEW.role ILIKE '%employee%' THEN
        prefix := '#MID-';
     ELSIF NEW.role ILIKE '%partner%' OR NEW.role ILIKE '%tierarzt%' OR NEW.role ILIKE '%therapeut%' THEN
        prefix := '#PRID-';
     ELSIF NEW.role ILIKE '%provider%' OR NEW.role ILIKE '%profi%' THEN
        prefix := '#PID-';
     ELSE
        prefix := '#KID-';
     END IF;
  ELSIF TG_TABLE_NAME = 'businesses' THEN
     prefix := '#BID-';
  ELSIF TG_TABLE_NAME = 'horses' THEN
     prefix := '#EQID-';
  END IF;

  IF NEW.readable_id IS NULL THEN
      new_id := prefix || upper(substring(md5(random()::text) from 1 for 6));
      NEW.readable_id := new_id;
  END IF;
  
  RETURN NEW;
END;
$function$;
