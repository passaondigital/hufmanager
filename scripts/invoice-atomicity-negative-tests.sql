-- Direct negative tests for create_invoice_with_items(jsonb,jsonb).
-- Prepared for a local/staging database only; never run against production
-- without explicit approval. Supply psql variables:
--   provider_id, valid_client_id, foreign_client_id, valid_horse_id,
--   foreign_horse_id
-- The selected test invoice number must not exist before the run.

\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('request.jwt.claim.sub', :'provider_id', true);

DO $test$
DECLARE
  test_number text := 'P0-NEGATIVE-' || replace(gen_random_uuid()::text, '-', '');
  payload jsonb;
  succeeded boolean;
BEGIN
  payload := jsonb_build_object(
    'provider_id', :'provider_id',
    'client_id', :'foreign_client_id',
    'invoice_number', test_number,
    'total_amount', 10
  );
  succeeded := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      payload,
      jsonb_build_array(jsonb_build_object('title', 'fremd', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
    succeeded := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF succeeded OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: foreign client accepted or invoice was not rolled back';
  END IF;

  payload := jsonb_build_object(
    'provider_id', :'provider_id',
    'client_id', :'valid_client_id',
    'horse_id', :'foreign_horse_id',
    'invoice_number', test_number,
    'total_amount', 10
  );
  succeeded := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      payload,
      jsonb_build_array(jsonb_build_object('title', 'fremd-pferd', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
    succeeded := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF succeeded OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: foreign horse accepted or invoice was not rolled back';
  END IF;

  payload := jsonb_build_object(
    'provider_id', :'provider_id',
    'client_id', :'valid_client_id',
    'horse_id', :'valid_horse_id',
    'invoice_number', test_number,
    'total_amount', 10
  );
  succeeded := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      payload,
      jsonb_build_array(jsonb_build_object('title', 'manipuliert', 'quantity', 1, 'unit_price', 10, 'total_price', 999))
    );
    succeeded := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF succeeded OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: manipulated line total accepted or invoice was not rolled back';
  END IF;

  succeeded := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      payload,
      jsonb_build_array(jsonb_build_object('title', 'negative', 'quantity', -1, 'unit_price', 10, 'total_price', -10))
    );
    succeeded := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF succeeded OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: negative quantity accepted or invoice was not rolled back';
  END IF;
END
$test$;

ROLLBACK;
