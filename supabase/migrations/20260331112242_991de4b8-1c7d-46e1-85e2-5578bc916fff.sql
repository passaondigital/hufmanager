-- Add storno reference columns to admin_invoices
ALTER TABLE public.admin_invoices
  ADD COLUMN IF NOT EXISTS storno_of_id uuid REFERENCES public.admin_invoices(id),
  ADD COLUMN IF NOT EXISTS storno_reason text,
  ADD COLUMN IF NOT EXISTS is_storno boolean DEFAULT false;

-- Add amendment columns to admin_contracts
ALTER TABLE public.admin_contracts
  ADD COLUMN IF NOT EXISTS amendment_of_id uuid REFERENCES public.admin_contracts(id),
  ADD COLUMN IF NOT EXISTS amendment_text text,
  ADD COLUMN IF NOT EXISTS is_amendment boolean DEFAULT false;

-- Index for fast lookup of storno/amendments
CREATE INDEX IF NOT EXISTS idx_admin_invoices_storno_of ON public.admin_invoices(storno_of_id) WHERE storno_of_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_contracts_amendment_of ON public.admin_contracts(amendment_of_id) WHERE amendment_of_id IS NOT NULL;