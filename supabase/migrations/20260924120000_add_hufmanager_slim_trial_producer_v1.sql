-- HufManager Slim: 14-Tage-Testphase bei Provider-Registrierung (Trial-P0, 2026-09-24)
--
-- Befund: Neue Provider erhielten kein product_entitlements-Eintrag und landeten
-- im Access-Gate auf "Kein aktiver Zugang". Der kanonische Writer
-- hm_project_hufmanager_entitlement_v1 hatte bereits einen trial_started-Zweig
-- (fest 14 Tage), aber keinen Producer.
--
-- Diese Migration ergaenzt NUR den Producer. Einzige Zugangswahrheit bleibt:
--   hm_lifecycle_events --(Trigger)--> hm_project_hufmanager_entitlement_v1 --> product_entitlements
-- Kein Schreibpfad ueber das Frontend; copecart-webhook ist fuer Slim per
-- Schalter hart gesperrt (saas_hufmanager nicht freischaltbar, 536b5f8b).
--
--   1. Writer-Guard: trial_started ueberschreibt nie einen bestehenden Eintrag
--      (nur status=PENDING ohne frueheren Trial darf starten).
--   2. hm_start_hufmanager_slim_trial_v1(user, reason): service_role-only,
--      idempotent (ein Trial pro User, UNIQUE source/source_event_id/event_name),
--      nur fuer Rolle provider, nie bei vorhandenem Entitlement.
--   3. Trigger AFTER INSERT ON user_roles (role=provider): startet den Trial,
--      Fehler brechen die Registrierung NIE ab, sondern werden als
--      Reconciliation-Issue sichtbar.
--
-- Trial-Dauer und Ablauf sind serverseitig: trial_ends_at = occurred_at + 14 days
-- (Writer), Zugang endet per get_hufmanager_access_context_v1 /
-- has_hufmanager_access_v1 automatisch nach trial_ends_at.

BEGIN;

CREATE OR REPLACE FUNCTION public.hm_project_hufmanager_entitlement_v1(_event hm_lifecycle_events)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    -- Guard (2026-09-24): a trial may only ever START on a row that has
    -- never been active. An existing paid / manual / active / frozen /
    -- previously-trialled entitlement is NEVER overwritten by trial_started.
    IF v_found AND (v_row.status <> 'PENDING' OR v_row.trial_started_at IS NOT NULL) THEN
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_TRIAL_START_SKIPPED_EXISTING_ENTITLEMENT', 'LOW', _event.id,
        _event.source::text, _event.subject_id, _event.provider_subscription_id, _event.source_event_id, NULL,
        jsonb_build_object('event_name', _event.event_name, 'existing_status', v_row.status)
      );
      RETURN;
    END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.hm_start_hufmanager_slim_trial_v1(p_user_id uuid, p_reason text DEFAULT 'provider_signup')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'skipped_no_user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'provider') THEN
    RETURN 'skipped_not_provider';
  END IF;

  -- Nie einen bestehenden Zugang anfassen (bezahlt, manuell, Legacy, QA, gesperrt ...).
  IF EXISTS (
    SELECT 1 FROM public.product_entitlements
     WHERE user_id = p_user_id AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM'
  ) THEN
    RETURN 'skipped_existing_entitlement';
  END IF;

  -- Ein Trial pro Identitaet — auch wenn ein Entitlement spaeter entfernt wurde.
  IF EXISTS (
    SELECT 1 FROM public.hm_lifecycle_events
     WHERE subject_id = p_user_id AND event_name = 'trial_started'
  ) THEN
    RETURN 'skipped_trial_already_used';
  END IF;

  INSERT INTO public.hm_lifecycle_events (
    event_name, subject_id, occurred_at, source, source_event_id,
    product, plan, metadata, verification_status, domain_event_key
  ) VALUES (
    'trial_started', p_user_id, v_now, 'admin', 'hm-slim-trial:' || p_user_id::text,
    'HUFMANAGER', 'HUFMANAGER_SLIM',
    jsonb_build_object('producer', 'hm_start_hufmanager_slim_trial_v1', 'reason', left(coalesce(p_reason, ''), 64)),
    'OBSERVED_EVENT', 'hm-slim-trial-started:' || p_user_id::text
  )
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'skipped_concurrent_duplicate';
  END IF;
  RETURN 'trial_started';
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_start_hufmanager_slim_trial_v1(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_start_hufmanager_slim_trial_v1(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.hm_start_hufmanager_slim_trial_v1(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_start_hufmanager_slim_trial_v1(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.role = 'provider' THEN
    BEGIN
      PERFORM public.hm_start_hufmanager_slim_trial_v1(NEW.user_id, 'provider_role_assigned');
    EXCEPTION WHEN OTHERS THEN
      -- Sichtbar machen, aber NIE die Registrierung abbrechen: das Logging
      -- selbst ist nochmals abgesichert. origin_event_id ist NOT NULL, daher
      -- eine deterministische ID pro User (Wiederholungen fallen zusammen).
      BEGIN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'TRIAL_START_UNEXPECTED_ERROR', 'HIGH', md5('hm-slim-trial:' || NEW.user_id::text)::uuid,
          'admin', NEW.user_id, NULL, 'hm-slim-trial:' || NEW.user_id::text, NULL,
          jsonb_build_object('sqlstate', SQLSTATE, 'sqlerrm', SQLERRM)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM anon;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM authenticated;

DROP TRIGGER IF EXISTS trg_user_roles_start_slim_trial ON public.user_roles;
CREATE TRIGGER trg_user_roles_start_slim_trial
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'provider')
  EXECUTE FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1();

COMMIT;
