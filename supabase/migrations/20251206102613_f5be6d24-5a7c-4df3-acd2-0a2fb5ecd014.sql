-- Fix 1: Feedbacks RLS - restrict to own feedbacks only
DROP POLICY IF EXISTS "Providers can manage feedbacks" ON public.feedbacks;

CREATE POLICY "Providers can manage own feedbacks" 
ON public.feedbacks 
FOR ALL 
USING (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());

-- Fix 2: Invoices RLS - restrict to provider who owns the related appointment/horse relationship
-- Since invoices have client_id but no direct provider reference, we check via appointments or access_grants
DROP POLICY IF EXISTS "Providers can manage all invoices" ON public.invoices;

CREATE POLICY "Providers can manage invoices for their clients" 
ON public.invoices 
FOR ALL 
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    -- Provider has active access grant for this client
    EXISTS (
      SELECT 1 FROM access_grants ag 
      WHERE ag.client_id = invoices.client_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR
    -- Provider has appointments for this client's horses
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN horses h ON h.id = a.horse_id
      WHERE h.owner_id = invoices.client_id
      AND a.provider_id = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM access_grants ag 
      WHERE ag.client_id = invoices.client_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN horses h ON h.id = a.horse_id
      WHERE h.owner_id = invoices.client_id
      AND a.provider_id = auth.uid()
    )
  )
);