-- P0 CORRECTION PASS
-- Prepared locally. Do not apply to production without the documented
-- backup, staging and approval gates.
--
-- This migration corrects two gaps in the first P0 pass:
--   1. privilege checks use the actual function signatures, including the
--      existing no-argument get_admin_auth_metadata();
--   2. the invoice SECURITY DEFINER RPC enforces tenant and amount integrity
--      before either header or item is written.

CREATE OR REPLACE FUNCTION public.search_horse_by_readable_id(search_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  clean_id text := upper(trim(replace(search_id, '#', '')));
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL OR char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_build_object(
    'found', true,
    'id', h.id,
    'readable_id', h.readable_id,
    'name', h.name,
    'photo_url', h.photo_url,
    'breed', h.breed
  )
  INTO result
  FROM public.horses h
  WHERE h.readable_id = clean_id
    AND h.deleted_at IS NULL
    AND (
      h.owner_id = actor_id
      OR public.is_provider_for_horse(actor_id, h.id)
      OR public.has_horse_partner_access(actor_id, h.id)
      OR public.is_admin(actor_id)
    )
  LIMIT 1;

  RETURN coalesce(result, jsonb_build_object('found', false));
END;
$$;

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

-- Function classes:
--   A trigger/helper: no direct caller grant (handle_new_user, ID generators,
--     trigger guards, random-id helper).
--   B admin-only authenticated API: the role may invoke the RPC, but the body
--     must authorize auth.uid() as admin (repair and auth metadata).
--   C ownership-checked authenticated API: the body must authorize the caller
--     against the target entity (cascade/delete, horse search, invoice RPC).
--   D service_role/internal: service_role is granted explicitly where an
--     internal caller needs the function; this is not a substitute for body
--     authorization when auth.uid() is required.
--
-- Exact signatures matter: the live function is get_admin_auth_metadata() with
-- no argument. The uuid overload is revoked too if a historical deployment
-- still has it; no overload is silently skipped.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.generate_random_id(text)'),
    to_regprocedure('public.admin_repair_user_role(uuid,text,uuid,text)'),
    to_regprocedure('public.delete_client_cascade(uuid)'),
    to_regprocedure('public.delete_provider_cascade(uuid)'),
    to_regprocedure('public.delete_horse_safe(uuid)'),
    to_regprocedure('public.get_admin_auth_metadata()'),
    to_regprocedure('public.get_admin_auth_metadata(uuid)'),
    to_regprocedure('public.generate_profile_readable_id()'),
    to_regprocedure('public.generate_horse_readable_id()'),
    to_regprocedure('public.prevent_billing_self_update()'),
    to_regprocedure('public.protect_lifetime_accounts()')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', fn);
    END IF;
  END LOOP;

  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.get_admin_auth_metadata()'),
    to_regprocedure('public.get_admin_auth_metadata(uuid)'),
    to_regprocedure('public.search_horse_by_readable_id(text)'),
    to_regprocedure('public.create_invoice_with_items(jsonb,jsonb)'),
    to_regprocedure('public.admin_repair_user_role(uuid,text,uuid,text)'),
    to_regprocedure('public.delete_client_cascade(uuid)'),
    to_regprocedure('public.delete_provider_cascade(uuid)'),
    to_regprocedure('public.delete_horse_safe(uuid)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;
END $$;
