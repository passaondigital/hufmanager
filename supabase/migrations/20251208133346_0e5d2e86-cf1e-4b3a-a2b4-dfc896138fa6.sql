-- Add stable location fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stable_street text,
ADD COLUMN IF NOT EXISTS stable_zip text,
ADD COLUMN IF NOT EXISTS stable_city text,
ADD COLUMN IF NOT EXISTS stable_latitude double precision,
ADD COLUMN IF NOT EXISTS stable_longitude double precision,
ADD COLUMN IF NOT EXISTS emergency_contacts jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.emergency_contacts IS 'Array of emergency contacts: [{role, name, phone}]';