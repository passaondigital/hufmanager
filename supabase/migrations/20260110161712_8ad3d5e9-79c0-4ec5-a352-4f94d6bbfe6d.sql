-- Add customer_type to invoices table for VAT handling
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'privat' CHECK (customer_type IN ('privat', 'gewerbe'));

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.customer_type IS 'Customer type: privat (19% MwSt) or gewerbe (Netto, Reverse Charge möglich)';