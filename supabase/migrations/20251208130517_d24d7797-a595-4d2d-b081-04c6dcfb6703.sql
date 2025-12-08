-- Drop existing triggers first (they depend on the functions)
DROP TRIGGER IF EXISTS set_customer_display_id ON public.profiles;
DROP TRIGGER IF EXISTS set_horse_display_id ON public.horses;
DROP TRIGGER IF EXISTS generate_customer_display_id_trigger ON public.profiles;
DROP TRIGGER IF EXISTS generate_horse_display_id_trigger ON public.horses;

-- Now drop functions with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.generate_customer_display_id() CASCADE;
DROP FUNCTION IF EXISTS public.generate_horse_display_id() CASCADE;

-- Rename display_id to readable_id for consistency (if exists)
DO $$ 
BEGIN
  -- Profiles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'readable_id') THEN
    ALTER TABLE public.profiles RENAME COLUMN display_id TO readable_id;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'readable_id') THEN
    ALTER TABLE public.profiles ADD COLUMN readable_id TEXT UNIQUE;
  END IF;
  
  -- Horses
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'display_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'readable_id') THEN
    ALTER TABLE public.horses RENAME COLUMN display_id TO readable_id;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'readable_id') THEN
    ALTER TABLE public.horses ADD COLUMN readable_id TEXT UNIQUE;
  END IF;
  
  -- Contacts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'readable_id') THEN
    ALTER TABLE public.contacts ADD COLUMN readable_id TEXT UNIQUE;
  END IF;
END $$;

-- Add geo fields for matching (zip_code, city)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create indexes for geo search
CREATE INDEX IF NOT EXISTS idx_profiles_zip_code ON public.profiles(zip_code) WHERE zip_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_zip_code ON public.contacts(zip_code) WHERE zip_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_city ON public.contacts(city) WHERE city IS NOT NULL;

-- Function to generate random 6-digit number
CREATE OR REPLACE FUNCTION public.generate_random_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  random_num INTEGER;
BEGIN
  random_num := floor(random() * 900000 + 100000)::INTEGER;
  new_id := prefix || '-' || random_num::TEXT;
  RETURN new_id;
END;
$$;

-- Function to generate unique readable_id for profiles (PID for providers, KID for clients)
CREATE OR REPLACE FUNCTION public.generate_profile_readable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
  user_role app_role;
BEGIN
  IF NEW.readable_id IS NOT NULL AND NEW.readable_id != '' THEN
    RETURN NEW;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  
  IF user_role = 'provider' THEN
    prefix := 'PID';
  ELSE
    prefix := 'KID';
  END IF;
  
  LOOP
    new_id := generate_random_id(prefix);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE readable_id = new_id) THEN
      NEW.readable_id := new_id;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique readable_id';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to generate unique readable_id for horses (EQID)
CREATE OR REPLACE FUNCTION public.generate_horse_readable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  IF NEW.readable_id IS NOT NULL AND NEW.readable_id != '' THEN
    RETURN NEW;
  END IF;
  
  LOOP
    new_id := generate_random_id('EQID');
    IF NOT EXISTS (SELECT 1 FROM public.horses WHERE readable_id = new_id) THEN
      NEW.readable_id := new_id;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique readable_id';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to generate unique readable_id for contacts
CREATE OR REPLACE FUNCTION public.generate_contact_readable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  IF NEW.readable_id IS NOT NULL AND NEW.readable_id != '' THEN
    RETURN NEW;
  END IF;
  
  CASE NEW.category
    WHEN 'client' THEN prefix := 'KID';
    WHEN 'partner' THEN prefix := 'PRID';
    WHEN 'supplier' THEN prefix := 'PRID';
    WHEN 'lead' THEN prefix := 'LID';
    ELSE prefix := 'CID';
  END CASE;
  
  LOOP
    new_id := generate_random_id(prefix);
    IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE readable_id = new_id) THEN
      NEW.readable_id := new_id;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique readable_id';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER generate_profile_readable_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_readable_id();

CREATE TRIGGER generate_horse_readable_id_trigger
  BEFORE INSERT ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_horse_readable_id();

CREATE TRIGGER generate_contact_readable_id_trigger
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contact_readable_id();