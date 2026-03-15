-- 1. Add passport_number to horses
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- 2. Add edid to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS edid TEXT UNIQUE;

-- Create index for edid
CREATE INDEX IF NOT EXISTS idx_appointments_edid ON public.appointments(edid) WHERE edid IS NOT NULL;

-- Function to generate appointment readable ID (#ED00001 format)
CREATE OR REPLACE FUNCTION public.generate_appointment_readable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_edid TEXT;
BEGIN
  IF NEW.edid IS NOT NULL AND NEW.edid != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    MAX(
      CASE 
        WHEN edid ~ '^#ED[0-9]+$' 
        THEN CAST(SUBSTRING(edid FROM 4) AS INTEGER) 
        ELSE 0 
      END
    ), 0
  ) + 1 INTO next_num
  FROM public.appointments
  WHERE edid IS NOT NULL;

  new_edid := '#ED' || LPAD(next_num::TEXT, 5, '0');
  
  WHILE EXISTS (SELECT 1 FROM public.appointments WHERE edid = new_edid) LOOP
    next_num := next_num + 1;
    new_edid := '#ED' || LPAD(next_num::TEXT, 5, '0');
  END LOOP;

  NEW.edid := new_edid;
  RETURN NEW;
END;
$$;

-- Create trigger for new appointments
DROP TRIGGER IF EXISTS generate_appointment_edid_trigger ON public.appointments;
CREATE TRIGGER generate_appointment_edid_trigger
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_appointment_readable_id();