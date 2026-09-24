BEGIN;
-- Invoice counters are tenant-scoped, so invoice-number uniqueness must be
-- tenant-scoped too. The historical global constraint prevented a second
-- provider from using its own RE-YYYY-0001 number.
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_invoice_number_key,
ADD CONSTRAINT invoices_provider_invoice_number_key
UNIQUE (provider_id, invoice_number);

INSERT INTO supabase_migrations.schema_migrations(version, name, statements, created_by)
VALUES ('20260910063819', 'tenant_scope_invoice_number_uniqueness', ARRAY[$mig$-- Invoice counters are tenant-scoped, so invoice-number uniqueness must be
-- tenant-scoped too. The historical global constraint prevented a second
-- provider from using its own RE-YYYY-0001 number.
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_invoice_number_key,
ADD CONSTRAINT invoices_provider_invoice_number_key
UNIQUE (provider_id, invoice_number);
$mig$], 'claude-code');
COMMIT;
