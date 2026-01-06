-- Add billing_type column to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'einmalig';

-- Add comment explaining the column
COMMENT ON COLUMN public.offers.billing_type IS 'Billing type: einmalig, abo, stuendlich, kostenlos';