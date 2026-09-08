-- P0 INVOICE CONSISTENCY
-- Invoice header and line items are one transaction. Any validation or insert
-- failure aborts the whole RPC call and rolls back both writes.

CREATE OR REPLACE FUNCTION public.create_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_provider_id uuid;
  v_invoice public.invoices;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_provider_id := NULLIF(p_invoice->>'provider_id', '')::uuid;
  IF v_provider_id IS NULL OR v_provider_id <> v_actor THEN
    RAISE EXCEPTION 'Invoice provider must match authenticated user';
  END IF;

  IF p_invoice->>'client_id' IS NULL OR NULLIF(p_invoice->>'client_id', '') IS NULL THEN
    RAISE EXCEPTION 'Invoice client is required';
  END IF;

  INSERT INTO public.invoices (
    client_id, provider_id, horse_id, invoice_number, issue_date, due_date,
    total_amount, status, payment_method, customer_type, notes,
    signature_url, payment_status
  )
  VALUES (
    (p_invoice->>'client_id')::uuid,
    v_provider_id,
    NULLIF(p_invoice->>'horse_id', '')::uuid,
    NULLIF(p_invoice->>'invoice_number', ''),
    COALESCE(NULLIF(p_invoice->>'issue_date', '')::date, CURRENT_DATE),
    NULLIF(p_invoice->>'due_date', '')::date,
    (p_invoice->>'total_amount')::numeric,
    COALESCE(NULLIF(p_invoice->>'status', ''), 'draft'),
    NULLIF(p_invoice->>'payment_method', ''),
    NULLIF(p_invoice->>'customer_type', ''),
    NULLIF(p_invoice->>'notes', ''),
    NULLIF(p_invoice->>'signature_url', ''),
    NULLIF(p_invoice->>'payment_status', '')
  )
  RETURNING * INTO v_invoice;

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invoice items must be an array';
  END IF;

  INSERT INTO public.invoice_items (
    invoice_id, inventory_item_id, title, quantity, unit_price, total_price
  )
  SELECT
    v_invoice.id,
    item.inventory_item_id,
    item.title,
    item.quantity,
    item.unit_price,
    item.total_price
  FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS item(
    inventory_item_id uuid,
    title text,
    quantity numeric,
    unit_price numeric,
    total_price numeric
  );

  RETURN to_jsonb(v_invoice);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invoice_with_items(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(jsonb, jsonb) TO authenticated, service_role;
