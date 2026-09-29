-- APPLY 20260929130000_copecart_subject_and_cancel_end_v1 auf PROD vnschgjxkzzwzefqlrji — erzeugt aus den Repo-Bytes (md5 4cd5d0a655fdcd80e8ecbaa2ec0f2e25).
-- Eine Transaktion: md5-Guard → Vorzustand-Guards → Ausführung genau dieses Textes (ohne inneres BEGIN/COMMIT) → Ledger-Eintrag.
-- Vorzustand (PROD 29.09.2026 gelesen): hm_project_copecart_lifecycle_v1 88c3c9729ecd88f90669f3347445f725,
--   hm_project_hufmanager_entitlement_v1 fa96c3f18b3bf48d98294e25f120b9e9, _hm_has_hufmanager_access_v1 c34d6869ee5dbeed62f0902f05493cc8,
--   get_hufmanager_access_context_v1 d567e1b5e52a56e31592e1ff1a0a604f; 0 Zeilen billing_status=CANCELLED.
-- Rollback: docs/backups/mig20260929130000_rollback_PROD.sql
BEGIN;
CREATE TEMP TABLE _mig (t text) ON COMMIT DROP;
INSERT INTO _mig (t) VALUES ($MIGTEXT$-- CopeCart-Lifecycle: Käuferzuordnung + Kündigungsende (Release-Closeout 29.09.2026).
--
-- 1. Käuferzuordnung: bisher profiles.email = customer_email LIMIT 1 (case-sensitiv, bei Dubletten
--    zufällig – eine Zahlung konnte einem Geister-Kundenprofil statt dem Provider zugeordnet werden).
--    Neu: _hm_resolve_copecart_subject_v1 (case-insensitiv, Provider-Rolle zuerst, deterministisch).
-- 2. Kündigung: subscription_cancelled setzte current_period_end = Datum 00:00 UTC, und das Gate
--    ignorierte current_period_end für Nicht-manual-Zeilen → gekündigte Abos behielten Zugang für immer
--    (kein subscription_ended-Produzent). Neu: Grenze = hm_billing_effective_end_at_v1 (Folgetag 00:00
--    Europe/Berlin); Gate + Access-Context sperren CANCELLED-Zeilen nach dieser Grenze.
--    Eine neue echte Zahlung (payment_succeeded) setzt billing_status wieder VERIFIED_PAID → Zugang.
--
-- Bestand PROD 29.09.: 0 Zeilen billing_status=CANCELLED, 0 billing_provider=copecart → keine
-- Zugangsänderung für Bestandskonten. Test-Zahlungen gewähren weiterhin nie Zugang.
-- Rollback: docs/backups/mig20260929130000_rollback_PROD.sql (Vorzustand der 4 Funktionen).

BEGIN;

CREATE OR REPLACE FUNCTION public._hm_resolve_copecart_subject_v1(_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- Käufer-E-Mail → Konto. Groß-/Kleinschreibung egal; bei Dubletten (z. B. Geister-Kundenprofil mit
  -- gleicher Adresse) gewinnt deterministisch das Konto mit Provider-Rolle, dann eines mit irgendeiner
  -- Rolle (= echtes Login), dann das älteste Profil.
  SELECT p.id
    FROM public.profiles p
   WHERE _email IS NOT NULL AND btrim(_email) <> ''
     AND lower(btrim(p.email)) = lower(btrim(_email))
   ORDER BY EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'provider') DESC,
            EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id) DESC,
            p.created_at ASC, p.id ASC
   LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public._hm_resolve_copecart_subject_v1(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._hm_resolve_copecart_subject_v1(text) TO service_role;

CREATE OR REPLACE FUNCTION public.hm_project_copecart_lifecycle_v1(_event hufi_data_events)
 RETURNS hm_lifecycle_projection_result
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

    v_subject_id := public._hm_resolve_copecart_subject_v1(_event.customer_email);
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
    v_subject_id := public._hm_resolve_copecart_subject_v1(_event.customer_email);
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
    v_subject_id := public._hm_resolve_copecart_subject_v1(_event.customer_email);
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
$function$;

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
      -- is_cancelled_for = letzter bezahlter Tag → exklusive Grenze Folgetag 00:00 Europe/Berlin.
      current_period_end = public.hm_billing_effective_end_at_v1(_event.effective_end_date),
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

CREATE OR REPLACE FUNCTION public._hm_has_hufmanager_access_v1(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.product_entitlements
     WHERE user_id = _user_id
       AND product = 'HUFMANAGER'
       AND plan = 'HUFMANAGER_SLIM'
       AND (
             (status = 'ACTIVE'
              AND (current_period_end IS NULL OR current_period_end > now()
                   OR (billing_provider IS DISTINCT FROM 'manual' AND billing_status IS DISTINCT FROM 'CANCELLED')))
          OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now()))
           )
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_hufmanager_access_context_v1()
 RETURNS TABLE(has_access boolean, product product_membership_product, plan product_entitlement_plan, entitlement_status product_entitlement_status, billing_status product_billing_status, trial_status product_trial_status, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone, reason_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.product_entitlements%ROWTYPE;
  v_trial_expired boolean;
  v_has_access boolean;
  v_reason_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.product_entitlements pe
   WHERE pe.user_id = v_uid AND pe.product = 'HUFMANAGER' AND pe.plan = 'HUFMANAGER_SLIM';

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, 'HUFMANAGER'::public.product_membership_product, 'HUFMANAGER_SLIM'::public.product_entitlement_plan,
      NULL::public.product_entitlement_status, NULL::public.product_billing_status, NULL::public.product_trial_status,
      NULL::timestamptz, NULL::timestamptz, 'NO_ENTITLEMENT'::text;
    RETURN;
  END IF;

  v_trial_expired := v_row.status = 'TRIAL_ACTIVE'
    AND v_row.trial_ends_at IS NOT NULL
    AND v_row.trial_ends_at < now();

  IF v_trial_expired THEN
    v_has_access := false;
    v_reason_code := 'TRIAL_EXPIRED';
  ELSE
    CASE v_row.status
      WHEN 'ACTIVE' THEN
        IF v_row.billing_provider = 'manual' THEN
          IF v_row.current_period_end IS NOT NULL AND v_row.current_period_end <= now() THEN
            v_has_access := false;
            v_reason_code := 'LOCKED';
          ELSE
            v_has_access := true;
            v_reason_code := 'ACTIVE_MANUAL';
          END IF;
        ELSIF v_row.billing_status = 'CANCELLED'
              AND v_row.current_period_end IS NOT NULL AND v_row.current_period_end <= now() THEN
          -- Gekündigtes Abo nach Periodenende: kein Zugang (gleiche Regel wie _hm_has_hufmanager_access_v1).
          v_has_access := false;
          v_reason_code := 'LOCKED';
        ELSE
          v_has_access := true;
          v_reason_code := CASE
            WHEN v_row.billing_status = 'CANCELLED' THEN 'CANCELLED_PERIOD_END_ACCESS'
            WHEN v_row.billing_status = 'PAST_DUE' THEN 'PAST_DUE_ACCESS_PRESERVED'
            ELSE 'ACTIVE_PAID'
          END;
        END IF;
      WHEN 'TRIAL_ACTIVE' THEN
        v_has_access := true;
        v_reason_code := 'ACTIVE_TRIAL';
      WHEN 'TRIAL_EXPIRED' THEN
        v_has_access := false;
        v_reason_code := 'TRIAL_EXPIRED';
      WHEN 'FROZEN' THEN
        v_has_access := false;
        v_reason_code := 'FROZEN';
      WHEN 'PAUSED' THEN
        v_has_access := false;
        v_reason_code := 'LOCKED';
      WHEN 'LOCKED' THEN
        v_has_access := false;
        v_reason_code := 'LOCKED';
      WHEN 'PENDING' THEN
        v_has_access := false;
        v_reason_code := 'NO_ENTITLEMENT';
      ELSE
        v_has_access := false;
        v_reason_code := 'REVIEW_REQUIRED';
    END CASE;
  END IF;

  RETURN QUERY SELECT
    v_has_access, v_row.product, v_row.plan, v_row.status, v_row.billing_status, v_row.trial_status,
    v_row.trial_ends_at, v_row.current_period_end, v_reason_code;
END;
$function$;

COMMIT;
$MIGTEXT$);
DO $apply$
DECLARE s text;
BEGIN
  SELECT t INTO s FROM _mig;
  IF md5(s) <> '4cd5d0a655fdcd80e8ecbaa2ec0f2e25' THEN
    RAISE EXCEPTION 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', md5(s);
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260929130000') THEN
    RAISE EXCEPTION 'ABORT: Ledger enthält 20260929130000 bereits';
  END IF;
  IF (SELECT max(version) FROM supabase_migrations.schema_migrations) <> '20260929120000' THEN
    RAISE EXCEPTION 'ABORT: Ledger-Head ist nicht 20260929120000';
  END IF;
  IF md5(pg_get_functiondef('public.hm_project_copecart_lifecycle_v1'::regproc)) <> '88c3c9729ecd88f90669f3347445f725'
     OR md5(pg_get_functiondef('public.hm_project_hufmanager_entitlement_v1'::regproc)) <> 'fa96c3f18b3bf48d98294e25f120b9e9'
     OR md5(pg_get_functiondef('public._hm_has_hufmanager_access_v1'::regproc)) <> 'c34d6869ee5dbeed62f0902f05493cc8'
     OR md5(pg_get_functiondef('public.get_hufmanager_access_context_v1'::regproc)) <> 'd567e1b5e52a56e31592e1ff1a0a604f' THEN
    RAISE EXCEPTION 'ABORT: Funktions-Vorzustand weicht ab';
  END IF;
  IF EXISTS (SELECT 1 FROM public.product_entitlements WHERE billing_status = 'CANCELLED') THEN
    RAISE EXCEPTION 'ABORT: CANCELLED-Bestand vorhanden – Zugangswirkung erst prüfen';
  END IF;
  EXECUTE replace(replace(s, E'\nBEGIN;\n', E'\n'), E'\nCOMMIT;\n', E'\n');
END
$apply$;
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
SELECT '20260929130000', 'copecart_subject_and_cancel_end_v1', ARRAY[t]::text[], 'passaondigital@gmail.com' FROM _mig;
COMMIT;
