-- P0 XXL-staging reconstruction correction.
-- The original NOT NULL/default migration rolled back with unrelated objects,
-- and later repository code/types require the four payment columns below.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices WHERE provider_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce invoices.provider_id NOT NULL while NULL rows exist';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE status IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce invoices.status NOT NULL while NULL rows exist';
  END IF;
END
$$;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_external_id text,
  ADD COLUMN IF NOT EXISTS payment_link text,
  ALTER COLUMN provider_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft';

CREATE OR REPLACE VIEW public.invoices_client_view
WITH (security_invoker = on)
AS SELECT
  id, invoice_number, client_id, horse_id, issue_date, due_date,
  total_amount, status, pdf_url, notes, created_at, updated_at,
  provider_id, customer_type, payment_method, payment_status, paid_at,
  cancelled_at, cancellation_reason, credit_note_for, signature_url
FROM public.invoices;
