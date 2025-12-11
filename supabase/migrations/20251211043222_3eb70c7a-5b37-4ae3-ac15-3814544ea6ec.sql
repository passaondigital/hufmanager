-- ================================================
-- RLS POLICY FIX: Erlaubt CRUD-Operationen für eigene Daten
-- ================================================

-- ============ HORSES ============
-- Providers können Pferde auch für Clients erstellen, die sie selbst angelegt haben
DROP POLICY IF EXISTS "Providers can insert horses for granted clients" ON public.horses;
CREATE POLICY "Providers can insert horses for granted clients" 
ON public.horses 
FOR INSERT 
WITH CHECK (
  -- Clients können ihre eigenen Pferde anlegen
  (auth.uid() = owner_id)
  OR
  -- Providers können Pferde für Clients anlegen (mit Access Grant oder von ihnen erstellt)
  (has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.client_id = horses.owner_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = horses.owner_id 
      AND p.created_by_provider_id = auth.uid()
    )
  ))
);

-- ============ CONTACTS ============
-- Vereinfache die Insert-Policy für Contacts
DROP POLICY IF EXISTS "Providers can insert own contacts" ON public.contacts;
CREATE POLICY "Providers can insert own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  auth.uid() = provider_id
);

-- ============ SERVICES ============
-- Vereinfache die Insert-Policy für Services
DROP POLICY IF EXISTS "Providers can insert services" ON public.services;
CREATE POLICY "Providers can insert services" 
ON public.services 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id IS NULL OR provider_id = auth.uid())
);

-- Update-Policy auch anpassen
DROP POLICY IF EXISTS "Providers can update own services" ON public.services;
CREATE POLICY "Providers can update own services" 
ON public.services 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);

-- Delete-Policy anpassen
DROP POLICY IF EXISTS "Providers can delete own services" ON public.services;
CREATE POLICY "Providers can delete own services" 
ON public.services 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);

-- ============ OFFERS ============
-- Vereinfache die Insert-Policy für Offers
DROP POLICY IF EXISTS "Providers can insert offers" ON public.offers;
CREATE POLICY "Providers can insert offers" 
ON public.offers 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id IS NULL OR provider_id = auth.uid())
);

-- Update-Policy anpassen
DROP POLICY IF EXISTS "Providers can update own offers" ON public.offers;
CREATE POLICY "Providers can update own offers" 
ON public.offers 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);

-- Delete-Policy anpassen
DROP POLICY IF EXISTS "Providers can delete own offers" ON public.offers;
CREATE POLICY "Providers can delete own offers" 
ON public.offers 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);

-- ============ FEEDBACKS ============
-- Vereinfache die Insert-Policy für Feedbacks
DROP POLICY IF EXISTS "Providers can insert feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can insert feedbacks" 
ON public.feedbacks 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id IS NULL OR provider_id = auth.uid())
);

-- Update-Policy anpassen
DROP POLICY IF EXISTS "Providers can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can update own feedbacks" 
ON public.feedbacks 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);

-- Delete-Policy anpassen
DROP POLICY IF EXISTS "Providers can delete own feedbacks" ON public.feedbacks;
CREATE POLICY "Providers can delete own feedbacks" 
ON public.feedbacks 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (provider_id = auth.uid() OR provider_id IS NULL)
);