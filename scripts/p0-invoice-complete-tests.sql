-- Complete P0 invoice integrity and tenant-isolation tests.
-- XXL/local staging only. Every fixture and successful invoice is rolled back.
-- Required psql variables: provider_id, valid_client_id, foreign_client_id,
-- foreign_provider_id.

\set ON_ERROR_STOP on
BEGIN;

SET LOCAL "request.jwt.claim.sub" = :'provider_id';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "p0.valid_client_id" = :'valid_client_id';
SET LOCAL "p0.foreign_client_id" = :'foreign_client_id';
SET LOCAL "p0.foreign_provider_id" = :'foreign_provider_id';

DO $test$
#variable_conflict use_variable
DECLARE
  provider_id uuid := auth.uid();
  valid_client_id uuid := current_setting('p0.valid_client_id')::uuid;
  foreign_client_id uuid := current_setting('p0.foreign_client_id')::uuid;
  foreign_provider_id uuid := current_setting('p0.foreign_provider_id')::uuid;
  valid_horse_id uuid;
  foreign_horse_id uuid;
  valid_inventory_id uuid;
  foreign_inventory_id uuid;
  test_number text;
  payload jsonb;
  result jsonb;
  rejected boolean;
  rejection text;
BEGIN
  UPDATE public.profiles
  SET created_by_provider_id = provider_id
  WHERE id = valid_client_id;

  UPDATE public.profiles
  SET created_by_provider_id = foreign_provider_id
  WHERE id = foreign_client_id;

  INSERT INTO public.horses (owner_id, name)
  VALUES (valid_client_id, 'P0 Valid Horse')
  RETURNING id INTO valid_horse_id;

  INSERT INTO public.horses (owner_id, name)
  VALUES (foreign_client_id, 'P0 Foreign Horse')
  RETURNING id INTO foreign_horse_id;

  INSERT INTO public.inventory_items (user_id, product_name, current_stock, price_sell)
  VALUES (provider_id, 'P0 Own Material', 10, 10)
  RETURNING id INTO valid_inventory_id;

  INSERT INTO public.inventory_items (user_id, product_name, current_stock, price_sell)
  VALUES (foreign_provider_id, 'P0 Foreign Material', 10, 10)
  RETURNING id INTO foreign_inventory_id;

  -- Positive control.
  test_number := 'P0-POSITIVE-' || replace(gen_random_uuid()::text, '-', '');
  payload := jsonb_build_object(
    'provider_id', provider_id,
    'client_id', valid_client_id,
    'horse_id', valid_horse_id,
    'invoice_number', test_number,
    'total_amount', 10
  );
  result := public.create_invoice_with_items(
    payload,
    jsonb_build_array(jsonb_build_object(
      'inventory_item_id', valid_inventory_id,
      'title', 'P0 Own Material',
      'quantity', 1,
      'unit_price', 10,
      'total_price', 10
    ))
  );
  IF result->>'id' IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.invoices i
       JOIN public.invoice_items ii ON ii.invoice_id = i.id
       WHERE i.invoice_number = test_number
         AND i.provider_id = provider_id
         AND i.total_amount = 10
         AND ii.inventory_item_id = valid_inventory_id
         AND ii.total_price = 10
     ) THEN
    RAISE EXCEPTION 'FAIL: valid invoice was not created atomically';
  END IF;
  RAISE NOTICE 'PASS invoice positive control';

  -- Foreign client.
  test_number := 'P0-FOREIGN-CLIENT-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', foreign_client_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('title', 'foreign client', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: foreign client accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS foreign client rejected: %', rejection;

  -- Foreign horse paired with an otherwise valid client.
  test_number := 'P0-FOREIGN-HORSE-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', foreign_horse_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('title', 'foreign horse', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: foreign horse accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS foreign horse rejected: %', rejection;

  -- Foreign inventory.
  test_number := 'P0-FOREIGN-INVENTORY-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', valid_horse_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('inventory_item_id', foreign_inventory_id, 'title', 'foreign inventory', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: foreign inventory accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS foreign inventory rejected: %', rejection;

  -- Manipulated line total.
  test_number := 'P0-LINE-TOTAL-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', valid_horse_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('title', 'line total', 'quantity', 1, 'unit_price', 10, 'total_price', 999))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: manipulated line total accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS manipulated line total rejected: %', rejection;

  -- Manipulated invoice total.
  test_number := 'P0-INVOICE-TOTAL-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', valid_horse_id, 'invoice_number', test_number, 'total_amount', 999),
      jsonb_build_array(jsonb_build_object('title', 'invoice total', 'quantity', 1, 'unit_price', 10, 'total_price', 10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: manipulated invoice total accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS manipulated invoice total rejected: %', rejection;

  -- Negative quantity.
  test_number := 'P0-NEGATIVE-QUANTITY-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', valid_horse_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('title', 'negative quantity', 'quantity', -1, 'unit_price', 10, 'total_price', -10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: negative quantity accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS negative quantity rejected: %', rejection;

  -- Negative unit price.
  test_number := 'P0-NEGATIVE-PRICE-' || replace(gen_random_uuid()::text, '-', '');
  rejected := false;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('provider_id', provider_id, 'client_id', valid_client_id, 'horse_id', valid_horse_id, 'invoice_number', test_number, 'total_amount', 10),
      jsonb_build_array(jsonb_build_object('title', 'negative price', 'quantity', 1, 'unit_price', -10, 'total_price', -10))
    );
  EXCEPTION WHEN OTHERS THEN rejected := true; rejection := SQLERRM;
  END;
  IF NOT rejected OR EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = test_number) THEN
    RAISE EXCEPTION 'FAIL: negative price accepted or partial invoice persisted';
  END IF;
  RAISE NOTICE 'PASS negative price rejected: %', rejection;
END
$test$;

ROLLBACK;
