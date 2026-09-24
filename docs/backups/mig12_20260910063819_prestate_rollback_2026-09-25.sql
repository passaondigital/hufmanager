-- Rollback für 20260910063819_tenant_scope_invoice_number_uniqueness (PROD-Apply 25.09.2026)
-- Stellt den globalen UNIQUE (invoice_number) wieder her.
-- ACHTUNG: schlägt fehl, sobald zwei Betriebe dieselbe Nummer haben (genau der gewollte Zustand
-- nach dem Fix). Dann ist ein Rollback nur mit Datenentscheidung möglich -> nicht blind ausführen.
BEGIN;
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_provider_invoice_number_key,
  ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260910063819';
COMMIT;
