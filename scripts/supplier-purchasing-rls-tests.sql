-- Supplier and purchasing tenant-isolation tests.
-- XXL/local staging only. All fixtures are rolled back.
-- Required psql variables: provider_id, foreign_provider_id.

\set ON_ERROR_STOP on
BEGIN;

SET LOCAL "p0.provider_id" = :'provider_id';
SET LOCAL "p0.foreign_provider_id" = :'foreign_provider_id';

INSERT INTO public.suppliers (provider_id, name)
VALUES (:'foreign_provider_id', 'P0 Foreign Supplier')
RETURNING id \gset foreign_supplier_

INSERT INTO public.inventory_items (user_id, product_name, current_stock, min_stock, price_purchase)
VALUES (:'provider_id', 'P0 Own Purchase Material', 0, 2, 12.50)
RETURNING id \gset own_inventory_

INSERT INTO public.inventory_items (user_id, product_name, current_stock, min_stock, price_purchase)
VALUES (:'foreign_provider_id', 'P0 Foreign Purchase Material', 0, 2, 99.00)
RETURNING id \gset foreign_inventory_

SELECT set_config('p0.foreign_supplier_id', :'foreign_supplier_id', true);
SELECT set_config('p0.own_inventory_id', :'own_inventory_id', true);
SELECT set_config('p0.foreign_inventory_id', :'foreign_inventory_id', true);

SET LOCAL "request.jwt.claim.sub" = :'provider_id';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL ROLE authenticated;

INSERT INTO public.suppliers (provider_id, name, email)
VALUES (:'provider_id', 'P0 Own Supplier', 'p0-supplier@example.invalid')
RETURNING id \gset own_supplier_

INSERT INTO public.purchase_orders (provider_id, supplier_id, status, total_amount)
VALUES (:'provider_id', :'own_supplier_id', 'draft', 0)
RETURNING id \gset own_order_

SELECT set_config('p0.own_order_id', :'own_order_id', true);

INSERT INTO public.purchase_order_items (
  order_id,
  inventory_item_id,
  product_name,
  quantity,
  unit_price
)
VALUES (
  :'own_order_id',
  :'own_inventory_id',
  'P0 Own Purchase Material',
  2,
  12.50
);

UPDATE public.purchase_orders
SET total_amount = 25,
    status = 'ordered',
    ordered_at = now()
WHERE id = :'own_order_id';

DO $test$
DECLARE
  rejected boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.purchase_orders purchase_order
    JOIN public.purchase_order_items order_item ON order_item.order_id = purchase_order.id
    WHERE purchase_order.id = current_setting('p0.own_order_id')::uuid
      AND purchase_order.provider_id = auth.uid()
      AND purchase_order.status = 'ordered'
      AND purchase_order.total_amount = 25
      AND order_item.inventory_item_id = current_setting('p0.own_inventory_id')::uuid
      AND order_item.product_name = 'P0 Own Purchase Material'
  ) THEN
    RAISE EXCEPTION 'FAIL: own supplier/order/item positive control failed';
  END IF;

  rejected := false;
  BEGIN
    INSERT INTO public.suppliers (provider_id, name)
    VALUES (current_setting('p0.foreign_provider_id')::uuid, 'P0 Spoofed Supplier');
  EXCEPTION WHEN insufficient_privilege THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'FAIL: foreign-provider supplier insert was accepted';
  END IF;

  rejected := false;
  BEGIN
    INSERT INTO public.purchase_orders (provider_id, supplier_id, status)
    VALUES (
      current_setting('p0.provider_id')::uuid,
      current_setting('p0.foreign_supplier_id')::uuid,
      'draft'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'FAIL: foreign supplier was accepted on own purchase order';
  END IF;

  rejected := false;
  BEGIN
    INSERT INTO public.purchase_order_items (
      order_id,
      inventory_item_id,
      product_name,
      quantity,
      unit_price
    )
    VALUES (
      current_setting('p0.own_order_id')::uuid,
      current_setting('p0.foreign_inventory_id')::uuid,
      'P0 Foreign Purchase Material',
      1,
      99
    );
  EXCEPTION WHEN insufficient_privilege THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'FAIL: foreign inventory was accepted on purchase order';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.suppliers
    WHERE provider_id = current_setting('p0.foreign_provider_id')::uuid
  ) THEN
    RAISE EXCEPTION 'FAIL: foreign supplier is visible';
  END IF;

  DELETE FROM public.purchase_orders
  WHERE id = current_setting('p0.own_order_id')::uuid;
  IF EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = current_setting('p0.own_order_id')::uuid
  ) OR EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE order_id = current_setting('p0.own_order_id')::uuid
  ) THEN
    RAISE EXCEPTION 'FAIL: own draft order discard did not cascade to its items';
  END IF;

  RAISE NOTICE 'PASS supplier and purchasing tenant isolation';
END
$test$;

ROLLBACK;
