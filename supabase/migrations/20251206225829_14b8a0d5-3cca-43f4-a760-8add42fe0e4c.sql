-- Fix offers policy to restrict provider management to their own offers only
DROP POLICY IF EXISTS "Providers can manage own offers" ON public.offers;

CREATE POLICY "Providers can manage own offers"
ON public.offers
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- Fix services policy to restrict provider management to their own services only
DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;

CREATE POLICY "Providers can manage own services"
ON public.services
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());