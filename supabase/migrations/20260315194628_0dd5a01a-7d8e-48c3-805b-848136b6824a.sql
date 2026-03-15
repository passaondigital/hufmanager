-- Temporarily disable the appointment validation trigger for backfill
ALTER TABLE public.appointments DISABLE TRIGGER trg_validate_appointment;

-- Backfill edid for existing appointments
DO $$
DECLARE
  apt RECORD;
  counter INTEGER := 1;
  new_edid TEXT;
BEGIN
  FOR apt IN 
    SELECT id FROM public.appointments 
    WHERE edid IS NULL 
    ORDER BY created_at ASC
  LOOP
    new_edid := '#ED' || LPAD(counter::TEXT, 5, '0');
    WHILE EXISTS (SELECT 1 FROM public.appointments WHERE edid = new_edid) LOOP
      counter := counter + 1;
      new_edid := '#ED' || LPAD(counter::TEXT, 5, '0');
    END LOOP;
    
    UPDATE public.appointments SET edid = new_edid WHERE id = apt.id;
    counter := counter + 1;
  END LOOP;
END;
$$;

-- Re-enable the trigger
ALTER TABLE public.appointments ENABLE TRIGGER trg_validate_appointment;