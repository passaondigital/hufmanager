-- V2.6: canonical CopeCart -> hm_lifecycle_events writer, called from
-- INSIDE public.hufi_data_ingest_and_project_v1 -- same transaction as
-- provider event persistence and state projection. No second Edge hop, no
-- second transaction boundary. XXL-Staging only.
--
-- PHASE 1 INVENTORY (read-only, before writing any of this):
-- - hm_lifecycle_events: 10 real event_name values (confirmed via
--   pg_enum), cancellation_mode (period_end|immediate), effective_end_date
--   date, provider_subscription_id text nullable, source_event_id NOT
--   NULL, domain_event_key, verification_status
--   (OBSERVED_EVENT|DERIVED_LEGACY_STATE|derived_from_observed),
--   derivation_note. UNIQUE(source, source_event_id, event_name) is the
--   real fan-out-safe idempotency key (unchanged, reused as-is).
-- - hufi-data-core's real normalizedStatus(): payment.made->paid,
--   payment.trial->trial, payment.recurring.upcoming->upcoming,
--   payment.failed->failed, payment.recurring.cancelled->cancelled,
--   payment.refunded->refunded, payment.charged_back->charged_back.
-- - hm-factengine/docs/HUFMANAGER_LIFECYCLE_EVENT_CONTRACT.md and
--   .../HUFMANAGER_LIFECYCLE_IMPLEMENTATION_PLAN.md: a real, prior design
--   proposal with a CopeCart->lifecycle mapping table. It is NOT blindly
--   adopted here -- see PROVIDER_MAPPING_MATRIX reasoning below for where
--   this migration deliberately diverges from it (refund/chargeback) and
--   where it deliberately implements LESS than it proposes (payment.made's
--   contextual trial_converted/subscription_activated fan-out, payment.trial).
-- - No hm-factengine test or HufManager contract test exercises any
--   CopeCart-event-type-to-lifecycle-event-name mapping directly --
--   lifecycle-design.test.mjs only tests the general schema/idempotency
--   mechanics (fan-out key shape), not which real CopeCart event produces
--   which outcome. Nothing here is "eindeutig belegt durch bestehende
--   Tests" beyond that general mechanism.
--
-- LOAD-BEARING GAP FOUND AND RESOLVED (not glossed over): hm_lifecycle_events
-- .subject_id is NOT NULL, FK to auth.users -- but hufi_data_events/
-- hufi_data_state capture no subject_id/user_id at all, only
-- customer_email/customer_name/subscription_id. product_entitlements.user_id
-- exists but is EMPTY on this staging DB and its own write path is
-- explicitly deferred elsewhere ("Access/Entitlement-Hardening kommt erst,
-- wenn Lifecycle Truth vollständig steht") -- using it for identity
-- resolution would be circular. The one REAL, already-live precedent
-- found in this repo: the local (undeployed) copecart-webhook/index.ts
-- resolves identity via `SELECT id FROM profiles WHERE email = customerEmail`
-- (profiles.id verified live to equal auth.users.id). This migration
-- reuses that exact, already-precedented pattern -- it does not invent a
-- new identity mechanism. When no profile matches, the event is NOT
-- dropped silently: the provider event/state have already committed
-- (unaffected), and a LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT
-- issue is recorded on the EXISTING hm_lifecycle_reconciliation_issues
-- table (issue_type is free text, not an enum -- no new architecture
-- needed) so a later retry/reprocess of the same stored event can repair
-- it once identity is resolvable (e.g. the profile is created afterward).
--
-- PROVIDER_MAPPING_MATRIX (only what is genuinely unambiguous is
-- implemented; everything else is an explicit, observable zero-outcome,
-- never a guess):
--   payment.recurring.cancelled + valid is_cancelled_for
--     -> subscription_cancelled, cancellation_mode=period_end,
--        effective_end_date=is_cancelled_for verbatim. MANDATORY, given
--        explicitly in this session's own brief.
--   payment.recurring.cancelled, no valid is_cancelled_for
--     -> ZERO lifecycle outcomes, LIFECYCLE_PROJECTION_BLOCKED_MISSING_
--        CANCELLATION_DATE issue. Fail-safe, per explicit instruction: no
--        invented end date, no dropped event, no subscription_ended.
--   payment.failed -> payment_failed. Direct 1:1 precedent
--     (FAILURE_EVENTS = ["payment.failed"] in the real shared contract),
--     no ambiguity, no fan-out question.
--   payment.made -> payment_succeeded ONLY. The design doc's proposed
--     three-way split (subscription_activated for a brand-new customer /
--     trial_converted+subscription_activated fan-out if the subject was
--     TRIAL_ACTIVE / payment_succeeded alone for a renewal) requires
--     comparing against a state vocabulary (TRIAL_ACTIVE/PAID_ACTIVE from
--     product_entitlements) that does not match what is actually available
--     here (hufi_data_state.status: paid/trial/upcoming/failed/cancelled/
--     refunded/charged_back/unknown) and is not exercised by any test --
--     implementing it would mean inventing a translation between two
--     different state vocabularies, exactly the kind of guess this brief
--     forbids. Deferred, not implemented. FANOUT_REAL_MAPPING=NOT_PROVEN.
--   payment.trial -> ZERO outcomes. The contract doc itself flags a real
--     terminology risk (CopeCart's payment.trial != HufManager's own
--     trial_started) and proposes mapping it to subscription_activated
--     instead, but that specific proposal is untested design, not an
--     eindeutig belegte rule -- and hufi-data-core's own real
--     normalization already treats it as a distinct, lesser status
--     ("trial", not "paid"). Not implemented; explicitly UNMAPPED.
--   payment.recurring.upcoming -> ZERO outcomes. Explicitly mandated,
--     matches both the design doc and this session's own brief -- never
--     subscription_activated, never payment_succeeded, never "active".
--   payment.refunded / payment.charged_back -> ZERO outcomes. The design
--     doc proposed subscription_ended here; this session's own explicit,
--     more recent instruction directly overrides that: "Subscription
--     Access Semantik ist noch nicht abschließend entschieden... UNRESOLVED
--     / NO ACCESS-AFFECTING MAPPING." The current instruction is followed,
--     not the older undecided doc.
--   subscription_paused/resumed/frozen -> never invented from CopeCart at
--     all; CopeCart has no such event type today.
--   anything else / unrecognized event_type -> ZERO outcomes.
--
-- ATOMICITY: hm_project_copecart_lifecycle_v1 is called with no exception
-- handler around it inside hufi_data_ingest_and_project_v1 -- a genuinely
-- unexpected error inside it aborts the whole call, rolling back the
-- provider event insert too (T12). The graceful "blocked" cases above
-- (missing date, unresolved subject) are normal RETURN paths, not
-- exceptions -- they commit the provider event/state and record an issue,
-- exactly like "Intentional Zero-Outcome" for an unmapped event type.

-- Small internal date validator (defense-in-depth mirror of
-- period-end-capture.mjs's isValidIsoDateOnly): by the time a payload
-- reaches hufi_data_events.payload, is_cancelled_for has already been
-- validated at capture time by the Edge Function, so a value present here
-- should already be a real YYYY-MM-DD date -- this re-validates anyway
-- rather than trusting that invariant blindly, consistent with this
-- whole schema's established defense-in-depth style.
CREATE OR REPLACE FUNCTION public._hm_valid_iso_date_only_v1(_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_date date;
BEGIN
  IF _value IS NULL OR _value !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN NULL;
  END IF;
  BEGIN
    v_date := _value::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF to_char(v_date, 'YYYY-MM-DD') <> _value THEN
    RETURN NULL;
  END IF;
  RETURN v_date;
END;
$$;

CREATE TYPE public.hm_lifecycle_projection_result AS (
  lifecycle_outcomes_created integer,
  lifecycle_outcomes_existing integer,
  lifecycle_outcomes_blocked integer,
  lifecycle_mapping_unresolved boolean  -- true = this event_type has zero mapped outcomes by design (not a problem)
);

CREATE OR REPLACE FUNCTION public.hm_project_copecart_lifecycle_v1(
  _event public.hufi_data_events
)
RETURNS public.hm_lifecycle_projection_result
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result public.hm_lifecycle_projection_result := (0, 0, 0, false);
  v_subject_id uuid;
  v_cancelled_for date;
  v_new_id uuid;
BEGIN
  IF _event.source <> 'copecart' THEN
    v_result.lifecycle_mapping_unresolved := true;
    RETURN v_result;
  END IF;

  IF _event.event_type = 'payment.recurring.cancelled' THEN
    v_cancelled_for := public._hm_valid_iso_date_only_v1(_event.payload->>'is_cancelled_for');

    IF v_cancelled_for IS NULL THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'LIFECYCLE_PROJECTION_BLOCKED_MISSING_CANCELLATION_DATE', 'HIGH', _event.id,
        'copecart', NULL, _event.subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_type', _event.event_type, 'has_is_cancelled_for_key', (_event.payload ? 'is_cancelled_for'))
      );
      v_result.lifecycle_outcomes_blocked := 1;
      RETURN v_result;
    END IF;

    v_subject_id := (SELECT id FROM public.profiles WHERE email = _event.customer_email LIMIT 1);
    IF v_subject_id IS NULL THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT', 'HIGH', _event.id,
        'copecart', NULL, _event.subscription_id, _event.source_event_id, v_cancelled_for,
        jsonb_build_object('event_type', _event.event_type)
      );
      v_result.lifecycle_outcomes_blocked := 1;
      RETURN v_result;
    END IF;

    INSERT INTO public.hm_lifecycle_events (
      event_name, subject_id, occurred_at, source, source_event_id,
      verification_status, provider_subscription_id, cancellation_mode, effective_end_date
    ) VALUES (
      'subscription_cancelled', v_subject_id, _event.occurred_at, 'copecart', _event.source_event_id,
      'OBSERVED_EVENT', _event.subscription_id, 'period_end', v_cancelled_for
    )
    ON CONFLICT (source, source_event_id, event_name) DO NOTHING
    RETURNING id INTO v_new_id;

    IF FOUND THEN
      v_result.lifecycle_outcomes_created := 1;
      PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'LIFECYCLE_OUTCOME_CREATED');
    ELSE
      v_result.lifecycle_outcomes_existing := 1;
    END IF;

  ELSIF _event.event_type = 'payment.failed' THEN
    v_subject_id := (SELECT id FROM public.profiles WHERE email = _event.customer_email LIMIT 1);
    IF v_subject_id IS NULL THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT', 'HIGH', _event.id,
        'copecart', NULL, _event.subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_type', _event.event_type)
      );
      v_result.lifecycle_outcomes_blocked := 1;
      RETURN v_result;
    END IF;

    INSERT INTO public.hm_lifecycle_events (
      event_name, subject_id, occurred_at, source, source_event_id,
      verification_status, provider_subscription_id
    ) VALUES (
      'payment_failed', v_subject_id, _event.occurred_at, 'copecart', _event.source_event_id,
      'OBSERVED_EVENT', _event.subscription_id
    )
    ON CONFLICT (source, source_event_id, event_name) DO NOTHING
    RETURNING id INTO v_new_id;

    IF FOUND THEN
      v_result.lifecycle_outcomes_created := 1;
      PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'LIFECYCLE_OUTCOME_CREATED');
    ELSE
      v_result.lifecycle_outcomes_existing := 1;
    END IF;

  ELSIF _event.event_type = 'payment.made' THEN
    v_subject_id := (SELECT id FROM public.profiles WHERE email = _event.customer_email LIMIT 1);
    IF v_subject_id IS NULL THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT', 'HIGH', _event.id,
        'copecart', NULL, _event.subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_type', _event.event_type)
      );
      v_result.lifecycle_outcomes_blocked := 1;
      RETURN v_result;
    END IF;

    INSERT INTO public.hm_lifecycle_events (
      event_name, subject_id, occurred_at, source, source_event_id,
      verification_status, provider_subscription_id
    ) VALUES (
      'payment_succeeded', v_subject_id, _event.occurred_at, 'copecart', _event.source_event_id,
      'OBSERVED_EVENT', _event.subscription_id
    )
    ON CONFLICT (source, source_event_id, event_name) DO NOTHING
    RETURNING id INTO v_new_id;

    IF FOUND THEN
      v_result.lifecycle_outcomes_created := 1;
      PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'LIFECYCLE_OUTCOME_CREATED');
    ELSE
      v_result.lifecycle_outcomes_existing := 1;
    END IF;

  ELSE
    -- payment.trial, payment.recurring.upcoming, payment.refunded,
    -- payment.charged_back, and anything else: zero lifecycle outcomes by
    -- design -- see this migration's own header for why each is
    -- deliberately unmapped, not an oversight.
    v_result.lifecycle_mapping_unresolved := true;
  END IF;

  RETURN v_result;
END;
$$;

-- Extend the existing atomic ingest result shape additively (composite
-- types support ADD ATTRIBUTE the same way tables support ADD COLUMN) --
-- no historical migration rewritten, hufi_data_ingest_and_project_v1's
-- own result contract grows, it does not change shape for existing fields.
ALTER TYPE public.hufi_data_ingest_result ADD ATTRIBUTE lifecycle_outcomes_created integer;
ALTER TYPE public.hufi_data_ingest_result ADD ATTRIBUTE lifecycle_outcomes_existing integer;
ALTER TYPE public.hufi_data_ingest_result ADD ATTRIBUTE lifecycle_outcomes_blocked integer;
ALTER TYPE public.hufi_data_ingest_result ADD ATTRIBUTE lifecycle_mapping_unresolved boolean;

-- hufi_data_ingest_and_project_v1, CREATE OR REPLACE: identical to the
-- V2.4.2 body except for one addition -- after state projection
-- (regardless of whether it was out-of-order-skipped: a lifecycle fact is
-- historical evidence about the EVENT, independent of current aggregated
-- state), call the lifecycle projector above on the canonical event and
-- surface its counts on the result. No other line changed.
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
  v_lifecycle public.hm_lifecycle_projection_result;
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

  SELECT * INTO v_state_before FROM public.hufi_data_state
    WHERE source = v_canonical.source AND entity_type = v_canonical.entity_type AND entity_id = v_canonical.entity_id;

  PERFORM public.hufi_data_apply_state(
    v_canonical.source, v_canonical.entity_type, v_canonical.entity_id,
    v_canonical.source_event_id, v_canonical.event_type,
    v_canonical.product_id, v_canonical.order_id, v_canonical.transaction_id, v_canonical.subscription_id,
    v_canonical.customer_email, v_canonical.customer_name,
    v_canonical.amount, v_canonical.currency, v_canonical.status, v_canonical.is_test,
    v_canonical.occurred_at, v_canonical.received_at, v_canonical.payload
  );

  SELECT * INTO v_state_after FROM public.hufi_data_state
    WHERE source = v_canonical.source AND entity_type = v_canonical.entity_type AND entity_id = v_canonical.entity_id;

  v_state_reflects := (
    v_state_after.last_source_event_id IS NOT DISTINCT FROM v_canonical.source_event_id
    AND v_state_after.last_occurred_at IS NOT DISTINCT FROM v_canonical.occurred_at
  );

  v_result.event_id := v_canonical.id;
  v_result.event_inserted := v_event_inserted;

  -- Lifecycle projection: unconditional on the canonical event, regardless
  -- of whether state application above was out-of-order-skipped -- a
  -- lifecycle fact about what this event asserts is independent of the
  -- current aggregated hufi_data_state row. No exception handler here,
  -- deliberately: an unexpected failure aborts the whole transaction,
  -- rolling back the event insert too (T12); the graceful blocked/
  -- unmapped cases inside the projector are normal returns, not
  -- exceptions.
  v_lifecycle := public.hm_project_copecart_lifecycle_v1(v_canonical);
  v_result.lifecycle_outcomes_created := v_lifecycle.lifecycle_outcomes_created;
  v_result.lifecycle_outcomes_existing := v_lifecycle.lifecycle_outcomes_existing;
  v_result.lifecycle_outcomes_blocked := v_lifecycle.lifecycle_outcomes_blocked;
  v_result.lifecycle_mapping_unresolved := v_lifecycle.lifecycle_mapping_unresolved;

  IF NOT v_state_reflects THEN
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

-- New-function grants only -- hufi_data_ingest_and_project_v1's own grants
-- are unchanged by CREATE OR REPLACE (Postgres preserves existing ACL
-- across a function replace) and are not repeated here.

REVOKE ALL ON FUNCTION public._hm_valid_iso_date_only_v1(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._hm_valid_iso_date_only_v1(text) FROM anon;
REVOKE ALL ON FUNCTION public._hm_valid_iso_date_only_v1(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._hm_valid_iso_date_only_v1(text) TO service_role;

REVOKE ALL ON FUNCTION public.hm_project_copecart_lifecycle_v1(public.hufi_data_events) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_project_copecart_lifecycle_v1(public.hufi_data_events) FROM anon;
REVOKE ALL ON FUNCTION public.hm_project_copecart_lifecycle_v1(public.hufi_data_events) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_project_copecart_lifecycle_v1(public.hufi_data_events) TO service_role;

-- No RLS change anywhere. No product_entitlements write. No
-- Tour/Appointment/horses/customers/documents/invoices table referenced.
