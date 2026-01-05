-- Fix: appointments_rls_bypass
-- Drop overly permissive policies that allow anyone to access all appointments
DROP POLICY IF EXISTS "Full Access Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Notfall Access" ON public.appointments;

-- Fix: invoice_client_update
-- Drop policy that allows clients to update invoice status/amount (fraud risk)
DROP POLICY IF EXISTS "Clients can update status of own invoices" ON public.invoices;