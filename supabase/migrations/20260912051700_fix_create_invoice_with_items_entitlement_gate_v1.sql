-- HufManager Slim — Access/Entitlement V1, Phase 9 corrective patch
-- (security review finding F1, 2026-09-12 — see
-- docs/HUFMANAGER_SLIM_ENTITLEMENT_SECURITY_REVIEW_2026-09-12.md).
--
-- public.create_invoice_with_items (supabase/migrations/20260908161000_p0_correction_pass.sql)
-- is SECURITY DEFINER, owned by `postgres`, which has rolbypassrls = true.
-- RLS is bypassed entirely for a BYPASSRLS role regardless of
-- SECURITY DEFINER/INVOKER — so the new Phase 9 RESTRICTIVE gate on
-- public.invoices (20260912051500) is completely invisible to this RPC,
-- which is the app's real, only invoice-creation path. A provider without
-- HufManager Slim access could call this RPC directly and still create a
-- real invoice, defeating the gate on the one table where it matters most
-- (monetization).
--
-- Fix is in-body, not RLS-based, because RLS structurally cannot reach a
-- BYPASSRLS-owned function: same canonical entitlement check the RLS gate
-- uses (has_hufmanager_access_v1() OR is_admin() OR is_master_admin()),
-- enforced right after the existing "invoice provider must match
-- authenticated user" check, i.e. once v_actor is confirmed to be the
-- acting provider on this invoice. Deliberately a new migration, not an
-- edit to the original 20260908161000 file: this function was written
-- before public.has_hufmanager_access_v1() existed, so referencing it
-- there would create a forward dependency on a later migration. This
-- file is applied last in the sequence, after that helper exists.
--
-- No other change to this function's logic (identifier parsing, ownership
-- checks, amount/item validation, atomicity) — verified line-for-line
-- against the current definition; only the new gate is added.

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
  v_client_id uuid;
  v_horse_id uuid;
  v_invoice public.invoices;
  v_item record;
  v_expected numeric;
  v_items_total numeric := 0;
  v_invoice_total numeric;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(p_invoice) <> 'object' OR jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invoice and items must be JSON objects/arrays';
  END IF;

  BEGIN
    v_provider_id := nullif(p_invoice->>'provider_id', '')::uuid;
    v_client_id := nullif(p_invoice->>'client_id', '')::uuid;
    v_horse_id := nullif(p_invoice->>'horse_id', '')::uuid;
    v_invoice_total := nullif(p_invoice->>'total_amount', '')::numeric;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invoice identifiers and amount must be valid';
  END;

  IF v_provider_id IS NULL OR v_provider_id <> v_actor THEN
    RAISE EXCEPTION 'Invoice provider must match authenticated user';
  END IF;

  -- Security review finding F1: RLS on public.invoices cannot reach this
  -- BYPASSRLS-owned SECURITY DEFINER function, so the entitlement check
  -- must be enforced here explicitly. Mirrors the RLS gate's own logic
  -- exactly (has_hufmanager_access_v1() OR is_admin() OR is_master_admin()).
  IF NOT (
    public.has_hufmanager_access_v1()
    OR public.is_admin(v_actor)
    OR public.is_master_admin()
  ) THEN
    RAISE EXCEPTION 'HufManager Slim access required to create invoices';
  END IF;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Invoice client is required';
  END IF;
  IF v_invoice_total IS NULL OR v_invoice_total < 0 OR v_invoice_total <> round(v_invoice_total, 2) THEN
    RAISE EXCEPTION 'Invoice total must be a non-negative amount with at most two decimals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_client_id
      AND p.deleted_at IS NULL
      AND (
        p.created_by_provider_id = v_actor
        OR EXISTS (
          SELECT 1 FROM public.access_grants ag
          WHERE ag.provider_id = v_actor
            AND ag.client_id = p.id
            AND ag.is_active = true
            AND coalesce(ag.status, 'active') = 'active'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Invoice client is not accessible for this provider';
  END IF;

  IF v_horse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id = v_horse_id
      AND h.owner_id = v_client_id
      AND h.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invoice horse does not belong to the invoice client';
  END IF;

  IF jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one invoice item is required';
  END IF;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS item(
      inventory_item_id uuid,
      title text,
      quantity numeric,
      unit_price numeric,
      total_price numeric
    )
  LOOP
    IF v_item.title IS NULL OR btrim(v_item.title) = '' THEN
      RAISE EXCEPTION 'Invoice item title is required';
    END IF;
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invoice item quantity must be greater than zero';
    END IF;
    IF v_item.unit_price IS NULL OR v_item.unit_price < 0 THEN
      RAISE EXCEPTION 'Invoice item price cannot be negative';
    END IF;
    v_expected := round(v_item.quantity * v_item.unit_price, 2);
    IF v_item.total_price IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'Invoice item total does not match quantity times price';
    END IF;
    IF v_item.inventory_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = v_item.inventory_item_id AND i.user_id = v_actor
    ) THEN
      RAISE EXCEPTION 'Invoice material does not belong to this provider';
    END IF;
    v_items_total := v_items_total + v_expected;
  END LOOP;

  v_items_total := round(v_items_total, 2);
  IF v_invoice_total <> v_items_total THEN
    RAISE EXCEPTION 'Invoice total does not match invoice items';
  END IF;

  INSERT INTO public.invoices (
    client_id, provider_id, horse_id, invoice_number, issue_date, due_date,
    total_amount, status, payment_method, customer_type, notes,
    signature_url, payment_status
  )
  VALUES (
    v_client_id, v_provider_id, v_horse_id, nullif(p_invoice->>'invoice_number', ''),
    coalesce(nullif(p_invoice->>'issue_date', '')::date, current_date),
    nullif(p_invoice->>'due_date', '')::date, v_items_total,
    coalesce(nullif(p_invoice->>'status', ''), 'draft'),
    nullif(p_invoice->>'payment_method', ''), nullif(p_invoice->>'customer_type', ''),
    nullif(p_invoice->>'notes', ''), nullif(p_invoice->>'signature_url', ''),
    nullif(p_invoice->>'payment_status', '')
  )
  RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_items (
    invoice_id, inventory_item_id, title, quantity, unit_price, total_price
  )
  SELECT v_invoice.id, item.inventory_item_id, item.title, item.quantity,
         item.unit_price, round(item.quantity * item.unit_price, 2)
  FROM jsonb_to_recordset(p_items) AS item(
    inventory_item_id uuid, title text, quantity numeric,
    unit_price numeric, total_price numeric
  );

  -- Preserve the existing client contract: callers receive the invoice row
  -- directly (including its generated id), while total_amount is the server
  -- calculated value written above.
  RETURN to_jsonb(v_invoice);
END;
$$;
