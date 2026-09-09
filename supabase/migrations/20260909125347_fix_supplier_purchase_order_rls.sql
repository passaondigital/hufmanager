-- Restore the supplier and purchasing flows while preserving provider isolation.

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz;

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS product_name text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.purchase_orders'::regclass
      AND conname = 'purchase_orders_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.purchase_order_items'::regclass
      AND conname = 'purchase_order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT purchase_order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.purchase_order_items'::regclass
      AND conname = 'purchase_order_items_inventory_item_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT purchase_order_items_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
  END IF;
END
$migration$;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view own suppliers" ON public.suppliers;
CREATE POLICY "Providers can view own suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can insert own suppliers" ON public.suppliers;
CREATE POLICY "Providers can insert own suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can update own suppliers" ON public.suppliers;
CREATE POLICY "Providers can update own suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id)
  WITH CHECK ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can delete own suppliers" ON public.suppliers;
CREATE POLICY "Providers can delete own suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view own purchase orders" ON public.purchase_orders;
CREATE POLICY "Providers can view own purchase orders"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can insert own purchase orders" ON public.purchase_orders;
CREATE POLICY "Providers can insert own purchase orders"
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (
      supplier_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.suppliers supplier
        WHERE supplier.id = supplier_id
          AND supplier.provider_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Providers can update own purchase orders" ON public.purchase_orders;
CREATE POLICY "Providers can update own purchase orders"
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id)
  WITH CHECK (
    (SELECT auth.uid()) = provider_id
    AND (
      supplier_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.suppliers supplier
        WHERE supplier.id = supplier_id
          AND supplier.provider_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Providers can delete own purchase orders" ON public.purchase_orders;
CREATE POLICY "Providers can delete own purchase orders"
  ON public.purchase_orders FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Users can view own order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can update own order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can delete own order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Providers can view own purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Providers can insert own purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Providers can update own purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Providers can delete own purchase order items" ON public.purchase_order_items;

CREATE POLICY "Providers can view own purchase order items"
  ON public.purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders purchase_order
      WHERE purchase_order.id = order_id
        AND purchase_order.provider_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Providers can insert own purchase order items"
  ON public.purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders purchase_order
      WHERE purchase_order.id = order_id
        AND purchase_order.provider_id = (SELECT auth.uid())
    )
    AND (
      inventory_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.inventory_items inventory_item
        WHERE inventory_item.id = inventory_item_id
          AND inventory_item.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "Providers can update own purchase order items"
  ON public.purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders purchase_order
      WHERE purchase_order.id = order_id
        AND purchase_order.provider_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders purchase_order
      WHERE purchase_order.id = order_id
        AND purchase_order.provider_id = (SELECT auth.uid())
    )
    AND (
      inventory_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.inventory_items inventory_item
        WHERE inventory_item.id = inventory_item_id
          AND inventory_item.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "Providers can delete own purchase order items"
  ON public.purchase_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders purchase_order
      WHERE purchase_order.id = order_id
        AND purchase_order.provider_id = (SELECT auth.uid())
    )
  );
