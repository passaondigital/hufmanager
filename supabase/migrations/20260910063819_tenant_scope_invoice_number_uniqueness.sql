-- Invoice counters are tenant-scoped, so invoice-number uniqueness must be
-- tenant-scoped too. The historical global constraint prevented a second
-- provider from using its own RE-YYYY-0001 number.
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_invoice_number_key,
ADD CONSTRAINT invoices_provider_invoice_number_key
UNIQUE (provider_id, invoice_number);
