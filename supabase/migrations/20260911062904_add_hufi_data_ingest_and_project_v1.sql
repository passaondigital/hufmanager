-- V2.4.2: public.hufi_data_ingest_and_project_v1 -- atomic provider
-- ingest primitive. Closes RETRY_STATE_GAP structurally: event
-- persistence and state projection now share ONE transaction boundary
-- (this function call), and projection is driven by the canonical stored
-- event row, never by "was this call's INSERT the one that succeeded" --
-- so a retry, a historical repair, or a stale-state repair all reach the
-- same correct outcome without a debug flag or a second code path.
--
-- XXL-Staging only. Does NOT write hm_lifecycle_events, does NOT call
-- hm_apply_subscription_ended_outcome_v1, does NOT write
-- product_entitlements, does NOT invent subscription_paused/resumed/
-- frozen, does NOT interpret is_cancelled_for -- it only ensures the
-- provider event row and its current-state projection exist atomically
-- and correctly. Lifecycle projection is a deliberately separate future
-- step, once that contract is fully legitimized (per explicit instruction
-- not to improvise classification here).
--
-- SECURITY INVOKER, not DEFINER: the intended caller (a future
-- server-only ingest path, or this migration's own tests) already runs as
-- service_role, which already holds direct INSERT/SELECT on
-- hufi_data_events and EXECUTE on hufi_data_apply_state (both confirmed
-- live before writing this migration) -- no privilege elevation is
-- needed, matching this whole lineage's established principle of not
-- adding an unnecessary SECURITY DEFINER surface. hufi_data_apply_state
-- itself remains SECURITY DEFINER (unchanged, that choice belongs to its
-- own migration) and is called normally.

CREATE TYPE public.hufi_data_ingest_result AS (
  result_code text,        -- APPLIED_NEW_EVENT | APPLIED_EXISTING_EVENT_REPAIR | ALREADY_APPLIED | EVENT_ID_COLLISION_MISMATCH | OUT_OF_ORDER_STATE_UNCHANGED | INVALID_INPUT
  event_id uuid,
  event_inserted boolean,
  state_applied boolean,
  state_repaired boolean,
  detail text             -- human-readable reason, no PII, no row dump
);

CREATE OR REPLACE FUNCTION public.hufi_data_ingest_and_project_v1(
  _source text,
  _source_event_id text,
  _event_type text,
  _event_category text,
  _entity_type text,
  _entity_id text,
  _product_id text,
  _order_id text,
  _transaction_id text,
  _subscription_id text,
  _customer_email text,
  _customer_name text,
  _amount numeric,
  _currency text,
  _status text,
  _is_test boolean,
  _occurred_at timestamptz,
  _received_at timestamptz,
  _payload_sha256 text,
  _payload jsonb
)
RETURNS public.hufi_data_ingest_result
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result public.hufi_data_ingest_result;
  v_existing public.hufi_data_events;
  v_canonical public.hufi_data_events;
  v_event_inserted boolean := false;
  v_compatible boolean;
  v_state_before public.hufi_data_state;
  v_state_after public.hufi_data_state;
  v_state_reflects boolean;
BEGIN
  IF _source IS NULL OR btrim(_source) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source is required';
    RETURN v_result;
  END IF;

  IF _source_event_id IS NULL OR btrim(_source_event_id) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source_event_id is required';
    RETURN v_result;
  END IF;

  IF _event_type IS NULL OR btrim(_event_type) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'event_type is required';
    RETURN v_result;
  END IF;

  -- entity_type/entity_id ARE required for state projection: both columns
  -- are NOT NULL on hufi_data_state, so calling hufi_data_apply_state
  -- without them would abort with a raw constraint-violation exception
  -- rather than a graceful result. Validated here, fail-closed, instead.
  IF _entity_type IS NULL OR btrim(_entity_type) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'entity_type is required for state projection';
    RETURN v_result;
  END IF;

  IF _entity_id IS NULL OR btrim(_entity_id) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'entity_id is required for state projection';
    RETURN v_result;
  END IF;

  IF _occurred_at IS NULL THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'occurred_at is required';
    RETURN v_result;
  END IF;

  -- Ensure the canonical event row atomically: insert if genuinely new,
  -- otherwise fall through to the existing row. ON CONFLICT DO NOTHING +
  -- RETURNING INTO is race-free under concurrent identical inserts --
  -- exactly one concurrent caller observes FOUND=true here; any other
  -- concurrent caller observes FOUND=false and reads back the winner's
  -- row in the branch below (covers T9, no advisory lock needed: the
  -- UNIQUE(source, source_event_id) constraint plus this pattern already
  -- makes the decision atomic -- ADVISORY_LOCK_REQUIRED=NO).
  INSERT INTO public.hufi_data_events (
    source, source_event_id, event_type, event_category,
    entity_type, entity_id, product_id, order_id, transaction_id, subscription_id,
    customer_email, customer_name, amount, currency, status, is_test,
    occurred_at, received_at, payload_sha256, payload
  ) VALUES (
    _source, _source_event_id, _event_type, COALESCE(_event_category, 'event'),
    _entity_type, _entity_id, _product_id, _order_id, _transaction_id, _subscription_id,
    _customer_email, _customer_name, _amount, _currency, _status, COALESCE(_is_test, false),
    _occurred_at, COALESCE(_received_at, now()), _payload_sha256, COALESCE(_payload, '{}'::jsonb)
  )
  ON CONFLICT (source, source_event_id) DO NOTHING
  RETURNING * INTO v_canonical;

  IF FOUND THEN
    v_event_inserted := true;
  ELSE
    SELECT * INTO v_existing FROM public.hufi_data_events
      WHERE source = _source AND source_event_id = _source_event_id;

    -- No SELECT ... FOR UPDATE here: hufi_data_events rows are immutable
    -- (this function never UPDATEs an existing event row), so there is no
    -- write-write race on this row to protect against by locking it. The
    -- only real write contention is on hufi_data_state below, which
    -- Postgres's own ON CONFLICT DO UPDATE row lock inside
    -- hufi_data_apply_state already serializes correctly on its own.
    --
    -- Stable-identity, NULL-safe compatibility check (IS NOT DISTINCT
    -- FROM). Deliberately excludes: received_at (delivery timing
    -- metadata, not identity), payload_sha256 (a genuine provider retry
    -- can re-serialize the same logical event with different raw bytes --
    -- T11), and customer_email/customer_name (PII fields whose provider-
    -- side formatting can legitimately vary slightly across retries
    -- without the underlying event being a different fact -- explicitly
    -- not used as identity criteria per instruction).
    v_compatible := (
      v_existing.event_type IS NOT DISTINCT FROM _event_type
      AND v_existing.entity_type IS NOT DISTINCT FROM _entity_type
      AND v_existing.entity_id IS NOT DISTINCT FROM _entity_id
      AND v_existing.product_id IS NOT DISTINCT FROM _product_id
      AND v_existing.order_id IS NOT DISTINCT FROM _order_id
      AND v_existing.transaction_id IS NOT DISTINCT FROM _transaction_id
      AND v_existing.subscription_id IS NOT DISTINCT FROM _subscription_id
      AND v_existing.occurred_at IS NOT DISTINCT FROM _occurred_at
      AND v_existing.amount IS NOT DISTINCT FROM _amount
      AND v_existing.currency IS NOT DISTINCT FROM _currency
      AND v_existing.status IS NOT DISTINCT FROM _status
      AND v_existing.is_test IS NOT DISTINCT FROM _is_test
    );

    IF NOT v_compatible THEN
      v_result.result_code := 'EVENT_ID_COLLISION_MISMATCH';
      v_result.event_id := v_existing.id;
      v_result.event_inserted := false;
      v_result.state_applied := false;
      v_result.state_repaired := false;
      v_result.detail := 'existing hufi_data_events row does not match the incoming event''s stable identity fields';
      RETURN v_result;
    END IF;

    v_canonical := v_existing;
    v_event_inserted := false;
  END IF;

  -- State projection always comes from the canonical, already-persisted
  -- event row (v_canonical) -- never from the raw incoming parameters --
  -- so a retry carrying slightly different framing can never leak into
  -- the state projection ("stored evidence -> projection").
  SELECT * INTO v_state_before FROM public.hufi_data_state
    WHERE source = v_canonical.source AND entity_type = v_canonical.entity_type AND entity_id = v_canonical.entity_id;

  -- No IF event_inserted guard here -- this is the specific bug being
  -- closed. State projection is attempted unconditionally from the
  -- canonical event, whether it was just inserted or already existed.
  PERFORM public.hufi_data_apply_state(
    v_canonical.source, v_canonical.entity_type, v_canonical.entity_id,
    v_canonical.source_event_id, v_canonical.event_type,
    v_canonical.product_id, v_canonical.order_id, v_canonical.transaction_id, v_canonical.subscription_id,
    v_canonical.customer_email, v_canonical.customer_name,
    v_canonical.amount, v_canonical.currency, v_canonical.status, v_canonical.is_test,
    v_canonical.occurred_at, v_canonical.received_at, v_canonical.payload
  );
  -- No exception handler around the call above, deliberately: if
  -- hufi_data_apply_state raises, this whole function aborts and the
  -- caller's transaction (including the event INSERT above, in the same
  -- transaction) rolls back entirely (T5). A provider retry then sees a
  -- genuinely new event again (T6).

  SELECT * INTO v_state_after FROM public.hufi_data_state
    WHERE source = v_canonical.source AND entity_type = v_canonical.entity_type AND entity_id = v_canonical.entity_id;

  v_state_reflects := (
    v_state_after.last_source_event_id IS NOT DISTINCT FROM v_canonical.source_event_id
    AND v_state_after.last_occurred_at IS NOT DISTINCT FROM v_canonical.occurred_at
  );

  v_result.event_id := v_canonical.id;
  v_result.event_inserted := v_event_inserted;

  IF NOT v_state_reflects THEN
    -- hufi_data_apply_state's own out-of-order guard (last_occurred_at >=
    -- existing) silently skipped the write: state already reflects a
    -- newer event than this one. Not an error -- the state layer
    -- correctly protected itself (T7/T8 unchanged, production semantics
    -- preserved exactly).
    v_result.result_code := 'OUT_OF_ORDER_STATE_UNCHANGED';
    v_result.state_applied := false;
    v_result.state_repaired := false;
    v_result.detail := 'state reflects a newer event; this event''s occurred_at did not advance it';
    RETURN v_result;
  END IF;

  v_result.state_applied := true;

  IF v_event_inserted THEN
    v_result.result_code := 'APPLIED_NEW_EVENT';
    v_result.state_repaired := false;
  ELSIF v_state_before IS NULL THEN
    v_result.result_code := 'APPLIED_EXISTING_EVENT_REPAIR';
    v_result.state_repaired := true;
    v_result.detail := 'event already existed; state had never been projected and was created from stored evidence';
  ELSIF v_state_before.last_source_event_id IS NOT DISTINCT FROM v_canonical.source_event_id
        AND v_state_before.last_occurred_at IS NOT DISTINCT FROM v_canonical.occurred_at THEN
    v_result.result_code := 'ALREADY_APPLIED';
    v_result.state_repaired := false;
  ELSE
    v_result.result_code := 'APPLIED_EXISTING_EVENT_REPAIR';
    v_result.state_repaired := true;
    v_result.detail := 'event already existed; stale state was advanced from stored evidence';
  END IF;

  RETURN v_result;
END;
$$;

-- Same default-grant reality already documented and handled repeatedly in
-- this lineage: a bare REVOKE FROM PUBLIC is not sufficient on this
-- schema, explicit per-role revokes are required.

REVOKE ALL ON FUNCTION public.hufi_data_ingest_and_project_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, text, jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.hufi_data_ingest_and_project_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, text, jsonb
) FROM anon;

REVOKE ALL ON FUNCTION public.hufi_data_ingest_and_project_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, text, jsonb
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.hufi_data_ingest_and_project_v1(
  text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, text, jsonb
) TO service_role;

-- No RLS change, no policy added, on hufi_data_events or hufi_data_state:
-- this function relies entirely on the already-correct table grants
-- (postgres/service_role only) it inherits as SECURITY INVOKER, not on
-- RLS, and does not touch either table's RLS state.
