-- ===========================================
-- FIX RLS POLICIES FOR ALL CRITICAL TABLES
-- ===========================================

-- 1. SERVICES: Ensure providers can INSERT their own services
DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;

CREATE POLICY "Providers can manage own services"
ON public.services
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- 2. OFFERS: Ensure providers can INSERT their own offers  
DROP POLICY IF EXISTS "Providers can manage own offers" ON public.offers;

CREATE POLICY "Providers can manage own offers"
ON public.offers
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- 3. FEEDBACKS: Ensure providers can INSERT their own feedbacks
DROP POLICY IF EXISTS "Providers can manage own feedbacks" ON public.feedbacks;

CREATE POLICY "Providers can manage own feedbacks"
ON public.feedbacks
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- 4. HORSES: Fix policies to allow providers to insert horses for their clients
-- Provider INSERT policy needs fixing - the check for access_grants happens before the horse exists
DROP POLICY IF EXISTS "Providers can insert horses for granted clients" ON public.horses;

CREATE POLICY "Providers can insert horses for granted clients"
ON public.horses
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND (
    -- Either the owner has granted access
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.client_id = horses.owner_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
    OR
    -- Or the owner was created by this provider
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = horses.owner_id
        AND p.created_by_provider_id = auth.uid()
    )
  )
);

-- 5. Ensure HOOF_ANALYSES can be created by providers
DROP POLICY IF EXISTS "Providers can create analyses" ON public.hoof_analyses;

CREATE POLICY "Providers can create analyses"
ON public.hoof_analyses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- 6. Ensure LEADS can be viewed by the provider who owns them
-- Already correct based on existing policies

-- 7. BUSINESS_SETTINGS: Ensure providers can INSERT new settings
DROP POLICY IF EXISTS "Users can manage own settings securely" ON public.business_settings;

CREATE POLICY "Users can manage own settings securely"
ON public.business_settings
FOR ALL
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR user_id IS NULL))
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);