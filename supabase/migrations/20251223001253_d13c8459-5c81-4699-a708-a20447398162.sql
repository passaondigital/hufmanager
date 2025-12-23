-- Allow clients to update the status of their own invoices
CREATE POLICY "Clients can update status of own invoices" 
ON public.invoices 
FOR UPDATE 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);