-- Fix Security Finding 1: profiles_table_public_exposure
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Providers can view connected profiles" ON public.profiles;

-- Create stricter policy: Providers can only see profiles of clients with ACTIVE access_grants
CREATE POLICY "Providers can view actively connected profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR
  (has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
  ))
);

-- Fix Security Finding 2: horses_location_data_exposure
-- Update the provider SELECT policy to require active access_grants only (not historical appointments)
DROP POLICY IF EXISTS "Providers can view granted horses" ON public.horses;

CREATE POLICY "Providers can view horses with active access"
ON public.horses
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
);

-- Fix Security Finding 3: business_settings_financial_exposure
-- Drop and recreate with explicit NOT NULL check
DROP POLICY IF EXISTS "Users can manage own settings" ON public.business_settings;

CREATE POLICY "Users can manage own settings securely"
ON public.business_settings
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  user_id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  user_id IS NOT NULL
);

-- Fix Security Finding 4: horses_medical_history_exposure
-- The "Providers can manage horses" policy is too broad - restrict it
DROP POLICY IF EXISTS "Providers can manage horses" ON public.horses;

-- Providers can only INSERT/UPDATE/DELETE horses if they have active access
CREATE POLICY "Providers can insert horses for granted clients"
ON public.horses
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
);

CREATE POLICY "Providers can update horses with active access"
ON public.horses
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
);

CREATE POLICY "Providers can delete horses with active access"
ON public.horses
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
);

-- Fix Security Finding 5: appointments_signature_exposure
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Providers can manage all appointments" ON public.appointments;

-- Providers can only see/manage their OWN appointments
CREATE POLICY "Providers can view own appointments"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  provider_id = auth.uid()
);

CREATE POLICY "Providers can insert own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND
  provider_id = auth.uid()
);

CREATE POLICY "Providers can update own appointments"
ON public.appointments
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  provider_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND
  provider_id = auth.uid()
);

CREATE POLICY "Providers can delete own appointments"
ON public.appointments
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND
  provider_id = auth.uid()
);