-- Drop overly permissive ALL policy for providers
DROP POLICY IF EXISTS "so_provider_access" ON public.service_orders;

-- Provider/Partner: SELECT only
CREATE POLICY "provider_select_orders"
ON public.service_orders
FOR SELECT USING (
  provider_id = auth.uid() OR 
  partner_id = auth.uid()
);

-- Provider/Partner: UPDATE only (status, signature etc.)
CREATE POLICY "provider_update_orders"
ON public.service_orders
FOR UPDATE USING (
  provider_id = auth.uid() OR 
  partner_id = auth.uid()
) WITH CHECK (
  provider_id = auth.uid() OR 
  partner_id = auth.uid()
);