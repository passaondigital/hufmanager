-- Invoice-number authorization and format tests.
-- XXL/local staging only. Counter increments are rolled back.
-- Required psql variables: provider_id, foreign_provider_id.

\set ON_ERROR_STOP on
BEGIN;

DO $test$
BEGIN
  IF has_function_privilege('anon', 'public.generate_invoice_number(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute generate_invoice_number(uuid)';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.generate_invoice_number(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot execute generate_invoice_number(uuid)';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (invoice_number)'
  ) THEN
    RAISE EXCEPTION 'FAIL: invoice numbers are still globally unique';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (provider_id, invoice_number)'
  ) THEN
    RAISE EXCEPTION 'FAIL: tenant-scoped invoice number uniqueness is missing';
  END IF;
END
$test$;

SET LOCAL "request.jwt.claim.sub" = :'provider_id';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "p0.foreign_provider_id" = :'foreign_provider_id';
SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  generated_number text;
  rejected boolean := false;
BEGIN
  generated_number := public.generate_invoice_number(auth.uid());
  IF generated_number !~ ('^RE-' || extract(year FROM current_date)::integer || '-[0-9]{4,}$') THEN
    RAISE EXCEPTION 'FAIL: invalid generated invoice number: %', generated_number;
  END IF;

  BEGIN
    PERFORM public.generate_invoice_number(current_setting('p0.foreign_provider_id')::uuid);
  EXCEPTION WHEN OTHERS THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'FAIL: provider generated a foreign invoice number';
  END IF;

  RAISE NOTICE 'PASS invoice number authorization and format: %', generated_number;
END
$test$;

ROLLBACK;
