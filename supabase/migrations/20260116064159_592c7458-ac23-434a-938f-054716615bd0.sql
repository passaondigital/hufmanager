-- Update validate_lead_input to strip HTML/script tags for XSS prevention
CREATE OR REPLACE FUNCTION public.validate_lead_input()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate and trim name (max 100 chars), strip HTML tags
  IF NEW.name IS NOT NULL THEN
    NEW.name := TRIM(NEW.name);
    -- Strip HTML/script tags to prevent XSS
    NEW.name := regexp_replace(NEW.name, '<[^>]*>', '', 'g');
    IF char_length(NEW.name) > 100 THEN
      RAISE EXCEPTION 'Name exceeds maximum length of 100 characters';
    END IF;
  END IF;
  
  -- Validate and trim email (max 255 chars, basic format)
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
    IF char_length(NEW.email) > 255 THEN
      RAISE EXCEPTION 'Email exceeds maximum length of 255 characters';
    END IF;
    IF NEW.email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;
  
  -- Validate and trim phone (max 30 chars, allow common phone formats)
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := TRIM(NEW.phone);
    IF char_length(NEW.phone) > 30 THEN
      RAISE EXCEPTION 'Phone number exceeds maximum length of 30 characters';
    END IF;
  END IF;
  
  -- Validate postal code (4-10 digits, common formats)
  IF NEW.postal_code IS NOT NULL THEN
    NEW.postal_code := TRIM(NEW.postal_code);
    IF char_length(NEW.postal_code) > 10 THEN
      RAISE EXCEPTION 'Postal code exceeds maximum length of 10 characters';
    END IF;
    IF NEW.postal_code !~ '^[0-9A-Za-z\s-]{3,10}$' THEN
      RAISE EXCEPTION 'Invalid postal code format';
    END IF;
  END IF;
  
  -- Validate message (max 2000 chars), strip HTML tags
  IF NEW.message IS NOT NULL THEN
    NEW.message := TRIM(NEW.message);
    -- Strip HTML/script tags to prevent XSS
    NEW.message := regexp_replace(NEW.message, '<[^>]*>', '', 'g');
    IF char_length(NEW.message) > 2000 THEN
      RAISE EXCEPTION 'Message exceeds maximum length of 2000 characters';
    END IF;
  END IF;
  
  -- Validate lead_type (whitelist allowed values)
  IF NEW.lead_type IS NOT NULL AND NEW.lead_type NOT IN ('termin', 'anfrage', 'sonstiges', 'beratung', 'notfall') THEN
    NEW.lead_type := 'termin'; -- Default to safe value
  END IF;
  
  RETURN NEW;
END;
$function$;