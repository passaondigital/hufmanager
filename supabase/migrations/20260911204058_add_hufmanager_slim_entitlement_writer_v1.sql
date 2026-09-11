-- HufManager Slim — Access/Entitlement V1, Phase 2/5: the ONE canonical
-- entitlement writer, wired to the ALREADY-STABILIZED lifecycle core via an
-- AFTER INSERT trigger on hm_lifecycle_events.
--
-- WHY A TRIGGER, NOT explicit calls added into hm_project_copecart_lifecycle_v1
-- / hm_reconcile_period_end_subscriptions_v1 / hm_apply_subscription_ended_outcome_v1
-- (the task's stated default preference):
--
-- 1. Zero edits to any already-live, just-stabilized lifecycle writer.
--    Those functions keep inserting into hm_lifecycle_events exactly as
--    before -- this migration adds a trigger, nothing else changes.
-- 2. There are already three separate lifecycle-event-producing call sites
--    today (copecart projection, period-end reconciler,
--    subscription_ended outcome writer) and the task's own business rules
--    name a fourth still-unbuilt one (an in-app trial starter). An explicit
--    call embedded in each one is a call site that can be forgotten the
--    next time a producer is added; a trigger on the table makes "every
--    lifecycle event gets projected" a structural guarantee instead of a
--    per-call-site convention.
-- 3. Atomicity/repairability is provable without a trigger's usual danger
--    (an entitlement failure rolling back the lifecycle write that caused
--    it, per Phase 5 requirement G): the trigger function below wraps the
--    actual projection call in its own BEGIN/EXCEPTION block. Postgres
--    gives a PL/pgSQL exception block implicit subtransaction semantics --
--    an error inside it unwinds only that inner block, not the outer
--    transaction that is in the middle of inserting the NEW
--    hm_lifecycle_events row. The lifecycle event commits either way;
--    only entitlement projection can fail, and it fails into an observable
--    HIGH-severity reconciliation issue instead of an opaque 500. This is
--    proven by T25 in the staging test matrix, not just asserted here.

-- ============================================================================
-- Canonical writer. SECURITY INVOKER (default) and postgres/service_role-only
-- EXECUTE, matching every other function in this lineage
-- (hm_project_copecart_lifecycle_v1, hufi_data_ingest_and_project_v1) --
-- it runs under whatever role performed the INSERT into hm_lifecycle_events,
-- which today is always service_role (ingestion Edge Function or the
-- pg_cron-scheduled reconciler), so it never needs elevated privileges of
-- its own.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hm_project_hufmanager_entitlement_v1(_event public.hm_lifecycle_events)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_product public.product_membership_product;
  v_plan public.product_entitlement_plan;
  v_is_test boolean := false;
  v_raw_product_id text;
  v_row public.product_entitlements%ROWTYPE;
  v_found boolean;
BEGIN
  -- ---- Resolve target product/plan, and is_test where it applies. ----
  -- This writer's scope is HufManager Slim ONLY (CopeCart product_id
  -- 3a97bd25) -- any other product/plan is silently not-applicable, not
  -- an error. hm_lifecycle_events.product/.plan are currently always NULL
  -- for CopeCart-sourced rows (the copecart projector does not populate
  -- them -- confirmed by reading its source before writing this), so the
  -- real classification comes from joining back to the raw hufi_data_events
  -- row via the (source, source_event_id) pair both tables share. A future
  -- non-CopeCart producer (e.g. an admin grant) that already sets
  -- product/plan on the hm_lifecycle_events row directly is trusted as-is.
  IF _event.product IS NOT NULL AND _event.plan IS NOT NULL THEN
    v_product := _event.product;
    v_plan := _event.plan;
    v_is_test := false;
  ELSIF _event.source = 'copecart' THEN
    SELECT d.product_id, d.is_test
      INTO v_raw_product_id, v_is_test
      FROM public.hufi_data_events d
     WHERE d.source = _event.source::text AND d.source_event_id = _event.source_event_id
     ORDER BY d.received_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      -- The lifecycle event exists but its raw source event doesn't --
      -- an integrity anomaly, not a normal "wrong product" case. Deny by
      -- default (no grant) and make it observable rather than guessing.
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_MISSING_RAW_EVENT', 'HIGH', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;

    IF v_raw_product_id = '3a97bd25' THEN
      v_product := 'HUFMANAGER';
      v_plan := 'HUFMANAGER_SLIM';
    ELSE
      RETURN; -- a real event, just not for a product this writer handles.
    END IF;
  ELSE
    RETURN; -- unknown source, no product classification available.
  END IF;

  -- This writer's authorized scope is HufManager Slim only (see task
  -- scope: "Produkt: HUFMANAGER Plan: HUFMANAGER_SLIM"). Even an
  -- already-classified event (product/plan set directly on the row) is
  -- bounded here -- other plans have their own trial/billing rules
  -- (e.g. HUFIAPP_PREMIUM never has a trial) that this writer does not
  -- implement and must not guess at.
  IF v_product <> 'HUFMANAGER' OR v_plan <> 'HUFMANAGER_SLIM' THEN
    RETURN;
  END IF;

  -- ---- Load existing row (if any) and lock it against concurrent writers. ----
  SELECT * INTO v_row
    FROM public.product_entitlements
   WHERE user_id = _event.subject_id AND product = v_product AND plan = v_plan
   FOR UPDATE;
  v_found := FOUND;

  -- ---- Out-of-order guard: never let an older event move a newer row. ----
  -- This is what keeps a late-arriving payment_succeeded from undoing a
  -- more recent subscription_ended (T9 in the staging test matrix).
  IF v_found AND v_row.last_applied_event_occurred_at IS NOT NULL
     AND _event.occurred_at < v_row.last_applied_event_occurred_at THEN
    PERFORM public._hm_reconciliation_issue_upsert_v1(
      'ENTITLEMENT_PROJECTION_SKIPPED_OUT_OF_ORDER', 'LOW', _event.id,
      _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
      jsonb_build_object(
        'event_name', _event.event_name,
        'event_occurred_at', _event.occurred_at,
        'row_last_applied_at', v_row.last_applied_event_occurred_at
      )
    );
    RETURN;
  END IF;

  CASE _event.event_name
  WHEN 'payment_succeeded' THEN
    -- Rule 2: a test payment NEVER grants real access and NEVER touches
    -- an existing real entitlement. Complete no-op, not even an issue --
    -- this is expected, routine traffic (our own staging/prod test
    -- payments), not an anomaly.
    IF v_is_test THEN
      RETURN;
    END IF;

    IF v_found THEN
      UPDATE public.product_entitlements SET
        status = 'ACTIVE',
        billing_status = 'VERIFIED_PAID',
        billing_provider = 'copecart',
        external_subscription_id = COALESCE(_event.provider_subscription_id, external_subscription_id),
        current_period_start = _event.occurred_at,
        -- A real payment converts an active trial; it does not touch a
        -- trial that was never active for this row.
        trial_status = CASE WHEN trial_status = 'ACTIVE' THEN 'NONE'::product_trial_status ELSE trial_status END,
        last_applied_event_occurred_at = _event.occurred_at,
        last_applied_event_id = _event.id
      WHERE id = v_row.id;
    ELSE
      INSERT INTO public.product_entitlements (
        user_id, product, plan, status, billing_status, billing_provider,
        external_subscription_id, current_period_start,
        last_applied_event_occurred_at, last_applied_event_id
      ) VALUES (
        _event.subject_id, v_product, v_plan, 'ACTIVE', 'VERIFIED_PAID', 'copecart',
        _event.provider_subscription_id, _event.occurred_at,
        _event.occurred_at, _event.id
      );
    END IF;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_cancelled' THEN
    -- Rule 3: billing reflects the cancellation; ACCESS stays granted
    -- until the period actually ends (subscription_ended, below).
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, _event.effective_end_date,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      billing_status = 'CANCELLED',
      current_period_end = _event.effective_end_date::timestamptz,
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_ended' THEN
    -- Rule 4: access ends. FROZEN, never deleted, history preserved,
    -- reactivatable later by a genuinely new payment_succeeded.
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      status = 'FROZEN',
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'payment_failed' THEN
    -- Rule 5: billing marker only. No automatic lock, no invented grace
    -- period.
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      billing_status = 'PAST_DUE',
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_paused' THEN
    -- Rule 7: structural mapping only. No CopeCart producer exists for
    -- this yet, and whether PAUSED should itself grant or deny access is
    -- explicitly NOT decided by this task's business rules ("NICHT
    -- raten... als OPEN BUSINESS RULE berichten") -- status is set so the
    -- state is at least recorded; the access API (Phase 4 migration)
    -- treats PAUSED as non-access-granting by conservative default until
    -- that is confirmed, and this is called out in the final report.
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      status = 'PAUSED',
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_resumed' THEN
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      status = 'ACTIVE',
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_frozen' THEN
    -- Same terminal state as subscription_ended, different trigger.
    IF NOT v_found THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_PROJECTION_BLOCKED_NO_EXISTING_ENTITLEMENT', 'MEDIUM', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name)
      );
      RETURN;
    END IF;
    UPDATE public.product_entitlements SET
      status = 'FROZEN',
      last_applied_event_occurred_at = _event.occurred_at,
      last_applied_event_id = _event.id
    WHERE id = v_row.id;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'trial_started' THEN
    -- HufManager Slim's trial is a fixed 14-day in-app trial (product
    -- fact -- see the schema migration's own comment and the CHECK
    -- constraint it enforces). No real producer of this event exists yet
    -- (confirmed: no in-app trial-start call site found in this repo) --
    -- this branch exists so that whenever that flow is built, it only
    -- needs to insert one hm_lifecycle_events row and everything else
    -- (entitlement + access) already works, tested with a synthetic event
    -- in the staging matrix (T14-T17).
    IF v_found THEN
      UPDATE public.product_entitlements SET
        status = 'TRIAL_ACTIVE',
        trial_status = 'ACTIVE',
        trial_started_at = _event.occurred_at,
        trial_ends_at = _event.occurred_at + INTERVAL '14 days',
        last_applied_event_occurred_at = _event.occurred_at,
        last_applied_event_id = _event.id
      WHERE id = v_row.id;
    ELSE
      INSERT INTO public.product_entitlements (
        user_id, product, plan, status, trial_status, trial_started_at, trial_ends_at,
        last_applied_event_occurred_at, last_applied_event_id
      ) VALUES (
        _event.subject_id, v_product, v_plan, 'TRIAL_ACTIVE', 'ACTIVE', _event.occurred_at,
        _event.occurred_at + INTERVAL '14 days',
        _event.occurred_at, _event.id
      );
    END IF;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'trial_converted' THEN
    -- Informational only: the actual activation happens via
    -- payment_succeeded. This just clears a still-ACTIVE trial marker if
    -- one exists, so trial_status does not linger as ACTIVE next to a
    -- paid, converted row.
    IF v_found AND v_row.trial_status = 'ACTIVE' THEN
      UPDATE public.product_entitlements SET
        trial_status = 'NONE',
        last_applied_event_occurred_at = _event.occurred_at,
        last_applied_event_id = _event.id
      WHERE id = v_row.id;
    END IF;
    PERFORM public._hm_reconciliation_issue_resolve_all_v1(_event.id, 'ENTITLEMENT_PROJECTED');

  WHEN 'subscription_activated' THEN
    -- No confirmed producer or semantics for this event name were found
    -- for HufManager Slim (see this task's own inventory phase). Rather
    -- than silently granting access from an event whose exact meaning is
    -- unconfirmed, this is surfaced for human review instead of acted on.
    PERFORM public._hm_reconciliation_issue_upsert_v1(
      'ENTITLEMENT_PROJECTION_REVIEW_REQUIRED_UNMAPPED_EVENT', 'LOW', _event.id,
      _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
      jsonb_build_object('event_name', _event.event_name)
    );

  ELSE
    -- Exhaustive against the current hm_lifecycle_event_name enum.
    -- Defensive no-op only, in case a future enum value is added upstream
    -- before this writer is updated to understand it.
    NULL;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.hm_project_hufmanager_entitlement_v1(public.hm_lifecycle_events) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_project_hufmanager_entitlement_v1(public.hm_lifecycle_events) FROM anon;
REVOKE ALL ON FUNCTION public.hm_project_hufmanager_entitlement_v1(public.hm_lifecycle_events) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_project_hufmanager_entitlement_v1(public.hm_lifecycle_events) TO service_role;

-- ============================================================================
-- Exception-safe trigger wrapper (see header comment for why this, and why
-- it is safe: the nested BEGIN/EXCEPTION block is its own subtransaction,
-- so an entitlement-projection failure cannot roll back the lifecycle
-- event row that is already being inserted in the same statement).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.hm_project_hufmanager_entitlement_v1(NEW);
  EXCEPTION WHEN OTHERS THEN
    PERFORM public._hm_reconciliation_issue_upsert_v1(
      'ENTITLEMENT_PROJECTION_UNEXPECTED_ERROR', 'HIGH', NEW.id,
      NEW.source::text, NEW.subject_id, NEW.provider_subscription_id, NEW.source_event_id, NULL,
      jsonb_build_object('event_name', NEW.event_name, 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM)
    );
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1() FROM anon;
REVOKE ALL ON FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1() TO service_role;

DROP TRIGGER IF EXISTS trg_hm_lifecycle_events_project_entitlement ON public.hm_lifecycle_events;
CREATE TRIGGER trg_hm_lifecycle_events_project_entitlement
  AFTER INSERT ON public.hm_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.hm_lifecycle_events_project_entitlement_trigger_v1();
