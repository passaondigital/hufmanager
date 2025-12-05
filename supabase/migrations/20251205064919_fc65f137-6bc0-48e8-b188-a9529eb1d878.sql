-- Add business_hours to profiles for "Feierabend-Modus"
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{
  "monday": {"enabled": true, "start": "08:00", "end": "18:00"},
  "tuesday": {"enabled": true, "start": "08:00", "end": "18:00"},
  "wednesday": {"enabled": true, "start": "08:00", "end": "18:00"},
  "thursday": {"enabled": true, "start": "08:00", "end": "18:00"},
  "friday": {"enabled": true, "start": "08:00", "end": "18:00"},
  "saturday": {"enabled": false, "start": "09:00", "end": "14:00"},
  "sunday": {"enabled": false, "start": "09:00", "end": "12:00"}
}'::jsonb;

-- Add geolocation to horses for GPS-based navigation
ALTER TABLE public.horses 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_name text;

-- Add display IDs for better tracking (KID, EQID format)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

ALTER TABLE public.horses
ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

-- Create sequence for customer IDs
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START 1;

-- Create sequence for horse IDs  
CREATE SEQUENCE IF NOT EXISTS horse_id_seq START 1;

-- Function to generate customer display ID
CREATE OR REPLACE FUNCTION public.generate_customer_display_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'KID' || LPAD(nextval('customer_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Function to generate horse display ID
CREATE OR REPLACE FUNCTION public.generate_horse_display_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'EQID' || LPAD(nextval('horse_id_seq')::text, 8, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for auto-generating display IDs
DROP TRIGGER IF EXISTS set_customer_display_id ON public.profiles;
CREATE TRIGGER set_customer_display_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_customer_display_id();

DROP TRIGGER IF EXISTS set_horse_display_id ON public.horses;
CREATE TRIGGER set_horse_display_id
  BEFORE INSERT ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_horse_display_id();

-- Update existing profiles without display_id
UPDATE public.profiles 
SET display_id = 'KID' || LPAD(nextval('customer_id_seq')::text, 6, '0')
WHERE display_id IS NULL;

-- Update existing horses without display_id
UPDATE public.horses 
SET display_id = 'EQID' || LPAD(nextval('horse_id_seq')::text, 8, '0')
WHERE display_id IS NULL;