-- Add soft delete columns to relevant tables
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.horses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS equine_type TEXT DEFAULT 'horse';

-- Create enum type for equine types if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equine_type') THEN
    CREATE TYPE public.equine_type AS ENUM ('horse', 'pony', 'donkey', 'mule', 'zebra');
  END IF;
END $$;

-- Add index for soft delete filtering (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_horses_deleted_at ON public.horses(deleted_at) WHERE deleted_at IS NULL;

-- Add unique constraint for duplicate check (first_name + last_name + email/phone combo)
-- This is handled in application logic since it's more complex

-- Update RLS policies to filter out soft-deleted records
-- Profiles: Providers can only view non-deleted profiles
DROP POLICY IF EXISTS "Providers can view actively connected profiles" ON public.profiles;
CREATE POLICY "Providers can view actively connected profiles" 
ON public.profiles FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    (auth.uid() = id) OR 
    (has_role(auth.uid(), 'provider'::app_role) AND 
     EXISTS (
       SELECT 1 FROM access_grants ag
       WHERE ag.client_id = profiles.id 
       AND ag.provider_id = auth.uid() 
       AND ag.is_active = true
     ))
  )
);

DROP POLICY IF EXISTS "Providers can view created profiles" ON public.profiles;
CREATE POLICY "Providers can view created profiles" 
ON public.profiles FOR SELECT
USING ((deleted_at IS NULL) AND (created_by_provider_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT
USING ((deleted_at IS NULL) AND (auth.uid() = id));

-- Contacts: Filter out soft-deleted
DROP POLICY IF EXISTS "Providers can view own contacts" ON public.contacts;
CREATE POLICY "Providers can view own contacts" 
ON public.contacts FOR SELECT
USING ((deleted_at IS NULL) AND (auth.uid() = provider_id));

-- Horses: Filter out soft-deleted
DROP POLICY IF EXISTS "Clients can view own horses" ON public.horses;
CREATE POLICY "Clients can view own horses" 
ON public.horses FOR SELECT
USING ((deleted_at IS NULL) AND (auth.uid() = owner_id));

DROP POLICY IF EXISTS "Providers can view horses with active access" ON public.horses;
CREATE POLICY "Providers can view horses with active access" 
ON public.horses FOR SELECT
USING (
  (deleted_at IS NULL) AND 
  has_role(auth.uid(), 'provider'::app_role) AND 
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id 
    AND ag.provider_id = auth.uid() 
    AND ag.is_active = true
  )
);