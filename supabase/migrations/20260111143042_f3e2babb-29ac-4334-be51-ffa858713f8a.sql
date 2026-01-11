-- Add cancelled_at column for soft-delete/storno functionality
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add cancellation_reason for documentation
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- Add credit_note_for to link credit notes to original invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS credit_note_for UUID REFERENCES public.invoices(id) DEFAULT NULL;

-- Create index for faster queries on cancelled invoices
CREATE INDEX IF NOT EXISTS idx_invoices_cancelled_at ON public.invoices(cancelled_at);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.cancelled_at IS 'Timestamp when invoice was cancelled/storniert. NULL means active invoice.';
COMMENT ON COLUMN public.invoices.cancellation_reason IS 'Reason for cancellation, e.g. Storno, Gutschrift';
COMMENT ON COLUMN public.invoices.credit_note_for IS 'If this is a credit note, references the original invoice';