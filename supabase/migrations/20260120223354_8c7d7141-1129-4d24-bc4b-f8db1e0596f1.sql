-- Add signature column to invoices table
ALTER TABLE public.invoices
ADD COLUMN signature_url TEXT;