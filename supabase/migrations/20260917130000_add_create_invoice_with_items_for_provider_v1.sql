-- P1-2 correction (Codex Correction Pass 4 review of autoflow-auto-invoice).
--
-- supabase/functions/autoflow-auto-invoice/index.ts creates invoices
-- head-only, via direct .from("invoices").insert(...) with columns that do
-- not even exist on the current public.invoices schema anymore (subtotal,
-- tax_amount, total, items, appointment_id, client_name, client_email,
-- client_address — verified against live PROD information_schema.columns,
-- 2026-09-17: none of these exist; the current columns are total_amount,
-- client_id (FK profiles.id), no appointment_id at all). Every invocation
-- of this function currently fails hard on that insert.
--
-- Root cause of why it can't just call the existing canonical RPC
-- (create_invoice_with_items, 20260908161000/20260912051700): that RPC is
-- built for an interactively logged-in provider — it reads auth.uid() and
-- requires it to match the invoice's provider_id, plus the same
-- has_hufmanager_access_v1()/is_admin()/is_master_admin() entitlement gate.
-- autoflow-auto-invoice runs from a DB trigger (appointment completed /
-- signed) with no logged-in user and no user JWT to forward — auth.uid()
-- would always be NULL there, so create_invoice_with_items would always
-- reject it with "Authentication required", regardless of who the
-- appointment's provider actually is.
--
-- This is exactly the documented fallback case ("wenn der bestehende RPC
-- technisch nicht aus dem Edge-Kontext verwendbar ist: kleinsten sicheren
-- serverseitigen Adapter bauen, Security-/Entitlement-Regeln NICHT
-- schwächen"). This function is that adapter: identical validation,
-- ownership and atomicity logic to create_invoice_with_items, but the
-- acting provider is an explicit, caller-supplied p_provider_id parameter
-- instead of auth.uid() — because there is no session to read one from.
--
-- Kept safe by grant, not by weakening any check:
--   - REVOKE ALL FROM PUBLIC/anon/authenticated — only service_role may
--     call this. authenticated/anon callers cannot use p_provider_id to
--     create invoices for a provider they don't control, because they can
--     never obtain service_role's key. The one caller with this key is our
--     own edge function server, already fully trusted (it already holds
--     the service_role key today via SUPABASE_SERVICE_ROLE_KEY).
--   - Entitlement check unchanged: has_hufmanager_access_v1() cannot be
--     reused as-is (it reads auth.uid()), so this uses the existing
--     internal, uid-parameterised counterpart
--     public._hm_has_hufmanager_access_v1(uuid) (added in
--     20260911204100_add_hufmanager_slim_access_context_api_v1.sql
--     specifically "for the rare server-side case that legitimately needs
--     another user's status") plus public.is_admin(uuid), which already
--     takes an explicit uid. is_master_admin() has no uid-parameter variant
--     and is deliberately NOT reused here — a background job creating an
--     invoice on a provider's behalf has no reason to ever hit that
--     single-hardcoded-email bypass; omitting it only removes a possible
--     bypass, never adds one.
--   - Same client/horse ownership checks, same item validation (quantity,
--     price, total-matches-items-sum), same single INSERT ... RETURNING
--     transaction boundary for invoices + invoice_items as the canonical
--     RPC. A failed item validation or item insert rolls back the invoice
--     head too — no head-only invoice can be left behind.
--
-- Additionally atomic in this adapter (not present in the original
-- create_invoice_with_items, because interactive invoice creation doesn't
-- need it): links the new invoice to its originating appointment via the
-- existing public.invoice_appointments join table (added in
-- 20260127120042_de53248b-3560-4e8e-b343-650a09ea30a1.sql for exactly this
-- "which invoice(s) came from which appointment(s)" purpose) in the SAME
-- transaction, when p_appointment_id is given. This is what lets the edge
-- function's duplicate-invoice guard work (the original code queried a
-- nonexistent invoices.appointment_id column, so it could never actually
-- detect an existing invoice for an appointment).
--
-- P1-1 (Correction Pass 5): that link is now also the idempotency key. It is
-- written with source='autoflow', which is covered by the partial unique
-- index added in
-- 20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql — so the
-- "at most one automatic invoice per appointment" rule is enforced by the
-- database, inside the same transaction as the invoice itself, instead of by
-- a check-then-create SELECT in the edge function. That migration must be
-- applied BEFORE this one (its timestamp is earlier).
--
-- PREPARED ONLY: this migration is not applied to any environment in this
-- pass (Correction Pass 4 constraint — PRODUCTION_BACKEND_CHANGED=NO). No
-- existing RLS policy, grant or function is modified; this only adds a new,
-- narrowly-granted function.

CREATE OR REPLACE FUNCTION public.create_invoice_with_items_for_provider(
  p_provider_id uuid,
  p_appointment_id uuid,
  p_invoice jsonb,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id uuid;
  v_client_id uuid;
  v_horse_id uuid;
  v_invoice public.invoices;
  v_item record;
  v_expected numeric;
  v_items_total numeric := 0;
  v_invoice_total numeric;
BEGIN
  IF p_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider is required';
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

  IF v_provider_id IS NULL OR v_provider_id <> p_provider_id THEN
    RAISE EXCEPTION 'Invoice provider must match the acting provider';
  END IF;

  -- Same entitlement gate as create_invoice_with_items (security review
  -- finding F1, 20260912051700), evaluated for the explicit provider param
  -- since there is no auth.uid() in a trigger/system context.
  IF NOT (
    public._hm_has_hufmanager_access_v1(p_provider_id)
    OR public.is_admin(p_provider_id)
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
        p.created_by_provider_id = p_provider_id
        OR EXISTS (
          SELECT 1 FROM public.access_grants ag
          WHERE ag.provider_id = p_provider_id
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

  IF p_appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id
      AND a.provider_id = p_provider_id
  ) THEN
    RAISE EXCEPTION 'Appointment does not belong to this provider';
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
      WHERE i.id = v_item.inventory_item_id AND i.user_id = p_provider_id
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

  -- P1-1 (Pass-5-Korrektur): der Link ist der Idempotenz-Schlüssel, nicht nur
  -- eine Nebenwirkung. source='autoflow' greift in
  -- idx_invoice_appointments_autoflow_unique (siehe
  -- 20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql):
  -- höchstens EINE automatisch erzeugte Verknüpfung pro Termin.
  --
  -- Bewusst KEIN "ON CONFLICT DO NOTHING": ein stillschweigend übersprungener
  -- Link würde genau das erzeugen, was hier verhindert werden soll — eine
  -- zweite Rechnung für denselben Termin, nur ohne Verknüpfung. Die
  -- unique_violation rollt stattdessen die komplette Transaktion inklusive
  -- Rechnungskopf und Positionen zurück. Bei zwei parallelen Läufen gewinnt
  -- genau einer, der andere erzeugt gar nichts.
  IF p_appointment_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.invoice_appointments (invoice_id, appointment_id, line_amount, source)
      VALUES (v_invoice.id, p_appointment_id, v_items_total, 'autoflow');
    EXCEPTION WHEN unique_violation THEN
      -- Stabiler, maschinenlesbarer Vertrag für den Aufrufer: HINT
      -- 'autoflow_duplicate' bedeutet "es gibt bereits eine automatische
      -- Rechnung für diesen Termin", nicht "etwas ist kaputt".
      RAISE EXCEPTION 'Autoflow invoice already exists for appointment %', p_appointment_id
        USING ERRCODE = 'unique_violation', HINT = 'autoflow_duplicate';
    END;
  END IF;

  RETURN to_jsonb(v_invoice);
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_with_items_for_provider(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items_for_provider(uuid, uuid, jsonb, jsonb) TO service_role;
