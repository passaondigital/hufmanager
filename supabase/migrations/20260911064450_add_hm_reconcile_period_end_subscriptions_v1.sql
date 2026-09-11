-- V2.5: public.hm_reconcile_period_end_subscriptions_v1 -- the period-end
-- subscription reconciler entry point. XXL-Staging only.
--
-- Real event taxonomy inventoried read-only before writing this file:
-- hm_lifecycle_event_name currently has exactly 10 values (trial_started,
-- trial_converted, subscription_activated, payment_succeeded,
-- payment_failed, subscription_cancelled, subscription_ended,
-- subscription_paused, subscription_resumed, subscription_frozen) --
-- confirmed via pg_enum, not assumed. There is currently NO event_name
-- value representing refund/chargeback at this layer, so that branch of
-- the brief is structurally unreachable today; handled defensively below
-- (falls into the generic UNKNOWN case) rather than left unhandled.
--
-- SUPERSESSION MATRIX (built from the real taxonomy above, not invented):
--   subscription_activated                              -> SUPERSEDED
--   payment_failed                                       -> SAFE_TO_CONTINUE
--   payment_succeeded, occurred_at < candidate's due time -> SAFE_TO_CONTINUE
--   payment_succeeded, occurred_at >= candidate's due time -> UNKNOWN
--   trial_started, trial_converted                       -> UNKNOWN
--   a second subscription_cancelled on the same anchor    -> UNKNOWN
--   subscription_paused / subscription_resumed /
--     subscription_frozen                                -> UNKNOWN (per
--     explicit instruction: this semantics is not fachlich decided yet --
--     never guess that pause preserves or cancels an ending)
--   subscription_ended                                   -> handled by the
--     dedicated ALREADY_ENDED exclusion below, not by this matrix
--   anything else / not yet enumerable (incl. a future refund/chargeback
--     event_name)                                        -> UNKNOWN
-- UNKNOWN always wins over SUPERSEDED when both appear among later events
-- for the same candidate: mixed evidence is not a basis for guessing.
--
-- IDENTITY: primary anchor is provider_subscription_id (supersession
-- scoped strictly to that same subscription). Secondary anchor is the
-- candidate's own source_event_id (NOT NULL on every hm_lifecycle_events
-- row by table constraint, so the true "no identity at all" case is
-- structurally near-unreachable today -- still validated defensively,
-- never assumed). On the secondary path, a later same-subject event whose
-- classification would matter (SUPERSEDED or UNKNOWN) is treated as
-- UNKNOWN unless it carries its OWN provider_subscription_id (which
-- proves it belongs to a different, identifiable subscription than this
-- identity-less candidate). SAFE-classified events (payment_failed,
-- early payment_succeeded) are attribution-independent and stay
-- ignorable regardless of anchor -- their classification does not depend
-- on which subscription they really belong to. subject_id is NEVER used
-- as subscription identity, only as the secondary-path scan scope.
--
-- ALREADY_ENDED: candidates are excluded from the batch at the QUERY
-- level (not just handled via the primitive's own idempotent
-- ALREADY_APPLIED result) if a subscription_ended row with the matching
-- domain_event_key already exists -- computed via
-- hm_subscription_ended_domain_event_key_v1, never a bespoke key. Without
-- this, a permanently-immutable subscription_cancelled candidate would
-- keep re-sorting to the front of every future batch forever after being
-- successfully reconciled once (oldest-due-first ordering), crowding out
-- genuinely new candidates over time. The primitive's own idempotency
-- remains a second line of defense for the case where two overlapping
-- batches raced on the same candidate.
--
-- POISON SKIP: an OPEN issue of type RECONCILIATION_BLOCKED_INSUFFICIENT_
-- IDENTITY, RECONCILIATION_DETERMINISTIC_FAILURE, or RECONCILIATION_
-- DOMAIN_KEY_COLLISION_MISMATCH with last_seen_at within 24h excludes its
-- candidate from the batch query. These three are deterministic given
-- hm_lifecycle_events' immutability (the same input will fail the same
-- way every time), so repeatedly re-attempting them wastes a batch slot
-- and would starve genuinely new candidates under a busy queue.
-- RECONCILIATION_AMBIGUOUS_SUPERSESSION_SCOPE is deliberately NOT poison-
-- skipped: unlike the other three, new evidence (a later event arriving
-- after this run) can genuinely change that outcome, so it is re-checked
-- every batch.
--
-- CONCURRENCY: FOR UPDATE SKIP LOCKED on the candidate row is the only
-- locking used. No advisory lock: two workers can never process the same
-- row concurrently (SKIP LOCKED), and the shared primitive's own
-- domain_event_key UNIQUE index remains the last defense against any
-- other race. No evidence an advisory lock is needed, so none is added.
--
-- ONE CANDIDATE = per-candidate isolation via a nested BEGIN/EXCEPTION
-- block (a PL/pgSQL implicit savepoint) around each candidate's
-- processing -- one candidate's unexpected error is caught, recorded, and
-- does not abort the rest of the batch. The whole function call is still
-- one Postgres transaction/commit boundary; see the function's own
-- header comment for the caller-side implication (small batch_size +
-- frequent invocation bounds blast radius per commit).
--
-- Does NOT write hufi_data_state, hufi_data_events, or
-- product_entitlements. Does NOT call hm_apply_subscription_ended_outcome_v1
-- for anything other than SUBSCRIPTION_ENDED_ONLY period-end candidates.
-- Does NOT touch Tour/Appointment tables. Not yet connected to any real
-- provider ingest path -- see RECONCILER_CONNECTED_TO_REAL_INGEST in this
-- session's own report, not this migration.

-- Small internal helper: issue upsert with REOPEN semantics (same unique
-- row, occurrence_count incremented, first_seen_at preserved by the
-- table's own DEFAULT, previous resolution context preserved into
-- details when transitioning from RESOLVED back to OPEN). Factored out
-- because the main function needs this exact upsert shape five times;
-- inlining it five times would be a real correctness risk (copy-paste
-- drift), not a meaningful reduction in "one entry point" -- callers only
-- ever invoke the public reconciler function below.
CREATE OR REPLACE FUNCTION public._hm_reconciliation_issue_upsert_v1(
  _issue_type text,
  _severity text,
  _origin_event_id uuid,
  _source text,
  _subject_id uuid,
  _provider_subscription_id text,
  _cancellation_source_event_id text,
  _effective_end_date date,
  _details jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.hm_lifecycle_reconciliation_issues (
    issue_type, status, severity, origin_event_kind, origin_event_id,
    source, subject_id, provider_subscription_id, cancellation_source_event_id, effective_end_date, details
  ) VALUES (
    _issue_type, 'OPEN', _severity, 'hm_lifecycle_events', _origin_event_id,
    _source, _subject_id, _provider_subscription_id, _cancellation_source_event_id, _effective_end_date, _details
  )
  ON CONFLICT (issue_type, origin_event_kind, origin_event_id) DO UPDATE SET
    last_seen_at = now(),
    occurrence_count = public.hm_lifecycle_reconciliation_issues.occurrence_count + 1,
    status = 'OPEN',
    resolved_at = NULL,
    resolution_reason = NULL,
    details = CASE
      WHEN public.hm_lifecycle_reconciliation_issues.status = 'RESOLVED' THEN
        COALESCE(public.hm_lifecycle_reconciliation_issues.details, '{}'::jsonb)
        || jsonb_build_object('previous_resolution', jsonb_build_object(
             'resolution_reason', public.hm_lifecycle_reconciliation_issues.resolution_reason,
             'resolved_at', public.hm_lifecycle_reconciliation_issues.resolved_at
           ))
      ELSE EXCLUDED.details
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public._hm_reconciliation_issue_resolve_all_v1(
  _origin_event_id uuid,
  _resolution_reason text
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.hm_lifecycle_reconciliation_issues
  SET status = 'RESOLVED', resolved_at = now(), resolution_reason = _resolution_reason
  WHERE origin_event_kind = 'hm_lifecycle_events' AND origin_event_id = _origin_event_id AND status = 'OPEN';
$$;

CREATE OR REPLACE FUNCTION public.hm_reconcile_period_end_subscriptions_v1(
  _batch_size integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_batch_size integer;
  v_candidate public.hm_lifecycle_events%ROWTYPE;
  v_later public.hm_lifecycle_events%ROWTYPE;
  v_primitive_result public.hm_apply_subscription_ended_outcome_result;
  v_due_at timestamptz;
  v_has_primary boolean;
  v_has_secondary boolean;
  v_unknown_found boolean;
  v_superseded_found boolean;
  v_event_class text;
  v_scanned integer := 0;
  v_applied integer := 0;
  v_already_applied integer := 0;
  v_superseded integer := 0;
  v_blocked_identity integer := 0;
  v_blocked_ambiguous integer := 0;
  v_collision integer := 0;
  v_deterministic_failure integer := 0;
  v_errors integer := 0;
  v_start_time timestamptz := clock_timestamp();
BEGIN
  -- default 100, clamped to [1, 500] -- never trust caller input blindly,
  -- even though PUBLIC/anon/authenticated can never reach this function.
  v_batch_size := LEAST(GREATEST(COALESCE(_batch_size, 100), 1), 500);

  FOR v_candidate IN
    SELECT e.* FROM public.hm_lifecycle_events e
    WHERE e.event_name = 'subscription_cancelled'
      AND e.cancellation_mode = 'period_end'
      AND e.effective_end_date IS NOT NULL
      AND now() >= public.hm_billing_effective_end_at_v1(e.effective_end_date)
      AND NOT EXISTS (
        -- Deliberately NOT domain_event_key alone: that key is derived
        -- only from (source, anchor, effective_end_date), never from
        -- subject_id, so two genuinely conflicting candidates could share
        -- one. Excluding on key-alone would silently swallow a real
        -- COLLISION_MISMATCH into "already handled" before it ever
        -- reaches the primitive. Mirrors the primitive's own match check
        -- (subject_id + effective_end_date + provider_subscription_id)
        -- exactly, so only a row that is PROVABLY this candidate's own
        -- prior successful outcome is excluded here.
        SELECT 1 FROM public.hm_lifecycle_events se
        WHERE se.event_name = 'subscription_ended'
          AND se.domain_event_key = (public.hm_subscription_ended_domain_event_key_v1(
                e.source::text, e.provider_subscription_id, e.source_event_id, e.effective_end_date
              )).domain_event_key
          AND se.subject_id = e.subject_id
          AND se.effective_end_date = e.effective_end_date
          AND se.provider_subscription_id IS NOT DISTINCT FROM e.provider_subscription_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.hm_lifecycle_reconciliation_issues i
        WHERE i.issue_type IN (
            'RECONCILIATION_BLOCKED_INSUFFICIENT_IDENTITY',
            'RECONCILIATION_DETERMINISTIC_FAILURE',
            'RECONCILIATION_DOMAIN_KEY_COLLISION_MISMATCH'
          )
          AND i.origin_event_kind = 'hm_lifecycle_events'
          AND i.origin_event_id = e.id
          AND i.status = 'OPEN'
          AND i.last_seen_at > now() - interval '24 hours'
      )
    ORDER BY public.hm_billing_effective_end_at_v1(e.effective_end_date) ASC, e.id ASC
    LIMIT v_batch_size
    FOR UPDATE OF e SKIP LOCKED
  LOOP
    v_scanned := v_scanned + 1;

    BEGIN
      v_due_at := public.hm_billing_effective_end_at_v1(v_candidate.effective_end_date);
      v_has_primary := (v_candidate.provider_subscription_id IS NOT NULL AND btrim(v_candidate.provider_subscription_id) <> '');
      v_has_secondary := (v_candidate.source_event_id IS NOT NULL AND btrim(v_candidate.source_event_id) <> '');

      IF NOT v_has_primary AND NOT v_has_secondary THEN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'RECONCILIATION_BLOCKED_INSUFFICIENT_IDENTITY', 'HIGH', v_candidate.id,
          v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
          jsonb_build_object('event_name', v_candidate.event_name::text, 'cancellation_mode', v_candidate.cancellation_mode::text)
        );
        v_blocked_identity := v_blocked_identity + 1;
        CONTINUE;
      END IF;

      v_unknown_found := false;
      v_superseded_found := false;

      IF v_has_primary THEN
        FOR v_later IN
          SELECT * FROM public.hm_lifecycle_events
          WHERE provider_subscription_id = v_candidate.provider_subscription_id
            AND occurred_at > v_candidate.occurred_at
            AND id <> v_candidate.id
            -- subscription_ended is deliberately excluded from this scan:
            -- a MATCHING later subscription_ended already short-circuited
            -- this candidate out of the batch entirely (ALREADY_ENDED
            -- exclusion above); a MISMATCHING one must reach the shared
            -- primitive and surface as COLLISION_MISMATCH there, not be
            -- pre-empted into a generic ambiguous-supersession verdict.
            AND event_name <> 'subscription_ended'
        LOOP
          v_event_class := CASE
            WHEN v_later.event_name = 'subscription_activated' THEN 'SUPERSEDED'
            WHEN v_later.event_name = 'payment_failed' THEN 'SAFE'
            WHEN v_later.event_name = 'payment_succeeded' AND v_later.occurred_at < v_due_at THEN 'SAFE'
            ELSE 'UNKNOWN'
          END;
          IF v_event_class = 'UNKNOWN' THEN v_unknown_found := true; END IF;
          IF v_event_class = 'SUPERSEDED' THEN v_superseded_found := true; END IF;
        END LOOP;
      ELSE
        FOR v_later IN
          SELECT * FROM public.hm_lifecycle_events
          WHERE subject_id = v_candidate.subject_id
            AND occurred_at > v_candidate.occurred_at
            AND id <> v_candidate.id
            AND event_name <> 'subscription_ended'
        LOOP
          v_event_class := CASE
            WHEN v_later.event_name = 'subscription_activated' THEN 'SUPERSEDED'
            WHEN v_later.event_name = 'payment_failed' THEN 'SAFE'
            WHEN v_later.event_name = 'payment_succeeded' AND v_later.occurred_at < v_due_at THEN 'SAFE'
            ELSE 'UNKNOWN'
          END;
          IF v_event_class IN ('SUPERSEDED', 'UNKNOWN') AND v_later.provider_subscription_id IS NULL THEN
            v_unknown_found := true;
          END IF;
        END LOOP;
      END IF;

      IF v_unknown_found THEN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'RECONCILIATION_AMBIGUOUS_SUPERSESSION_SCOPE', 'HIGH', v_candidate.id,
          v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
          jsonb_build_object('anchor', CASE WHEN v_has_primary THEN 'primary' ELSE 'secondary' END)
        );
        v_blocked_ambiguous := v_blocked_ambiguous + 1;
        CONTINUE;
      END IF;

      IF v_superseded_found THEN
        PERFORM public._hm_reconciliation_issue_resolve_all_v1(v_candidate.id, 'SUPERSEDED_BY_SUBSCRIPTION_ACTIVATED');
        v_superseded := v_superseded + 1;
        CONTINUE;
      END IF;

      v_primitive_result := public.hm_apply_subscription_ended_outcome_v1(
        v_candidate.source::text,
        v_candidate.source_event_id,
        v_candidate.subject_id,
        v_candidate.provider_subscription_id,
        v_candidate.source_event_id,
        v_candidate.effective_end_date,
        'derived_from_observed',
        NULL
      );

      CASE v_primitive_result.result_code
        WHEN 'APPLIED' THEN
          v_applied := v_applied + 1;
          PERFORM public._hm_reconciliation_issue_resolve_all_v1(v_candidate.id, 'RECONCILED_SUCCESSFULLY');
        WHEN 'ALREADY_APPLIED' THEN
          v_already_applied := v_already_applied + 1;
          PERFORM public._hm_reconciliation_issue_resolve_all_v1(v_candidate.id, 'RECONCILED_SUCCESSFULLY');
        WHEN 'BLOCKED_INSUFFICIENT_IDENTITY' THEN
          v_blocked_identity := v_blocked_identity + 1;
          PERFORM public._hm_reconciliation_issue_upsert_v1(
            'RECONCILIATION_BLOCKED_INSUFFICIENT_IDENTITY', 'HIGH', v_candidate.id,
            v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
            jsonb_build_object('primitive_result_code', v_primitive_result.result_code, 'primitive_detail', v_primitive_result.detail)
          );
        WHEN 'INVALID_EFFECTIVE_END_DATE' THEN
          v_deterministic_failure := v_deterministic_failure + 1;
          PERFORM public._hm_reconciliation_issue_upsert_v1(
            'RECONCILIATION_DETERMINISTIC_FAILURE', 'MEDIUM', v_candidate.id,
            v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
            jsonb_build_object('primitive_result_code', v_primitive_result.result_code, 'primitive_detail', v_primitive_result.detail)
          );
        WHEN 'INVALID_INPUT' THEN
          v_deterministic_failure := v_deterministic_failure + 1;
          PERFORM public._hm_reconciliation_issue_upsert_v1(
            'RECONCILIATION_DETERMINISTIC_FAILURE', 'MEDIUM', v_candidate.id,
            v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
            jsonb_build_object('primitive_result_code', v_primitive_result.result_code, 'primitive_detail', v_primitive_result.detail)
          );
        WHEN 'COLLISION_MISMATCH' THEN
          v_collision := v_collision + 1;
          PERFORM public._hm_reconciliation_issue_upsert_v1(
            'RECONCILIATION_DOMAIN_KEY_COLLISION_MISMATCH', 'CRITICAL', v_candidate.id,
            v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
            jsonb_build_object('primitive_result_code', v_primitive_result.result_code, 'primitive_detail', v_primitive_result.detail)
          );
        ELSE
          v_errors := v_errors + 1;
          PERFORM public._hm_reconciliation_issue_upsert_v1(
            'RECONCILIATION_DETERMINISTIC_FAILURE', 'MEDIUM', v_candidate.id,
            v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
            jsonb_build_object('primitive_result_code', COALESCE(v_primitive_result.result_code, 'NULL'), 'note', 'unexpected result code from shared primitive')
          );
      END CASE;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Best-effort issue recording for a genuinely unexpected error.
      -- Wrapped again so a failure in the issue write itself (should
      -- never happen, but this loop must never let a secondary problem
      -- abort candidates still waiting in the batch) cannot escape.
      BEGIN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'RECONCILIATION_DETERMINISTIC_FAILURE', 'MEDIUM', v_candidate.id,
          v_candidate.source::text, v_candidate.subject_id, v_candidate.provider_subscription_id, v_candidate.source_event_id, v_candidate.effective_end_date,
          jsonb_build_object('unexpected_error', SQLERRM)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'batch_size_requested', _batch_size,
    'batch_size_used', v_batch_size,
    'scanned', v_scanned,
    'applied', v_applied,
    'already_applied', v_already_applied,
    'superseded', v_superseded,
    'blocked_insufficient_identity', v_blocked_identity,
    'blocked_ambiguous_supersession', v_blocked_ambiguous,
    'collision_mismatch', v_collision,
    'deterministic_failure', v_deterministic_failure,
    'errors', v_errors,
    'duration_ms', round(extract(epoch from (clock_timestamp() - v_start_time)) * 1000)
  );
END;
$$;

-- Same default-grant reality already documented and handled repeatedly in
-- this lineage: a bare REVOKE FROM PUBLIC is not sufficient on this
-- schema, explicit per-role revokes are required. All three new
-- functions are internal-only -- PUBLIC/anon/authenticated get nothing,
-- service_role gets EXECUTE.

REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_upsert_v1(
  text, text, uuid, text, uuid, text, text, date, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_upsert_v1(
  text, text, uuid, text, uuid, text, text, date, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_upsert_v1(
  text, text, uuid, text, uuid, text, text, date, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._hm_reconciliation_issue_upsert_v1(
  text, text, uuid, text, uuid, text, text, date, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_resolve_all_v1(
  uuid, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_resolve_all_v1(
  uuid, text
) FROM anon;
REVOKE ALL ON FUNCTION public._hm_reconciliation_issue_resolve_all_v1(
  uuid, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._hm_reconciliation_issue_resolve_all_v1(
  uuid, text
) TO service_role;

REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_v1(
  integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_v1(
  integer
) FROM anon;
REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_v1(
  integer
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_reconcile_period_end_subscriptions_v1(
  integer
) TO service_role;

-- No RLS change on hm_lifecycle_events, hm_lifecycle_reconciliation_issues,
-- hufi_data_events, or hufi_data_state. No Tour/Appointment table
-- referenced anywhere above.
