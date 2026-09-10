-- Group 2 (V2.1): hm_apply_subscription_ended_outcome_v1.
--
-- The single internal shared write primitive for the subscription_ended
-- domain event. It answers exactly one question: "an upstream,
-- fachlich-legitimized path has already decided this specific subscription
-- ending should be applied — write the canonical lifecycle outcome safely
-- and idempotently." It does NOT decide whether a refund/chargeback/
-- cancellation legitimizes an ending, whether a reconciler candidate is
-- eligible, or whether later evidence supersedes a cancellation — all of
-- that belongs to the caller (a future reconciler or live-ingest entry
-- point), never to this primitive.
--
-- Identity and timing are computed authoritatively inside this function,
-- never accepted from the caller: it calls
-- hm_subscription_ended_domain_event_key_v1 for domain_event_key and
-- hm_billing_effective_end_at_v1 for occurred_at — there is no
-- p_domain_event_key or p_effective_end_at parameter at all, by
-- construction, so no caller can ever inject a divergent key or timezone
-- computation.
--
-- source_event_id semantics (per the finalized contract): for a
-- reconciler-derived row, the caller passes the ORIGINAL cancellation's
-- own source_event_id here — legitimate because
-- UNIQUE(source, source_event_id, event_name) already supports fan-out
-- (a subscription_cancelled row and a subscription_ended row may share the
-- same source_event_id, distinguished by event_name). A future live
-- provider end-event would instead pass its own fresh source_event_id;
-- cross-writer dedup for that case is guaranteed by domain_event_key, not
-- by this column.
--
-- Result is a small tagged composite, not a bare status string — exactly
-- six possible result_code values, each set as a fixed literal at its own
-- return site (no dynamic/concatenated result_code is ever constructed),
-- structurally preventing free-form status strings:
--   APPLIED, ALREADY_APPLIED, BLOCKED_INSUFFICIENT_IDENTITY,
--   INVALID_EFFECTIVE_END_DATE, INVALID_INPUT, COLLISION_MISMATCH.
-- No NOT_ELIGIBLE — eligibility is the caller's job, not this primitive's.
-- A dedicated ENUM type for just this return shape would be schema
-- ballast for one call site; a documented text field is sufficient.
--
-- Explicitly out of scope for this primitive (all confirmed here, not
-- just asserted): it never touches hufi_data_state (a provider current-
-- state projection — a derived HufManager conclusion does not belong
-- there), never touches product_entitlements (the known HIGH finding
-- about period-end/refund/chargeback collapsing into one undifferentiated
-- CANCELLED status stays open and unfixed — this primitive must not
-- inherit it), and never writes hm_lifecycle_reconciliation_issues itself
-- (it has no candidate-batch context; on BLOCKED_INSUFFICIENT_IDENTITY it
-- returns that result code and stops — the caller's own outer transaction
-- is responsible for the issue UPSERT, keeping this primitive usable from
-- multiple entry points with different orchestration needs).
--
-- Runs entirely inside the caller's own transaction — TRANSACTION_OWNER=
-- CALLER. It opens no transaction of its own; the internal EXCEPTION block
-- used for collision handling establishes only a PL/pgSQL implicit
-- savepoint (standard Postgres behavior), which does not commit anything
-- and does not affect the caller's ability to roll back the entire outer
-- transaction (verified empirically in this migration's acceptance tests,
-- not merely assumed).
--
-- SECURITY INVOKER, not DEFINER: the intended callers (a future
-- reconciler, a future provider-ingest RPC) already run as service_role,
-- which already holds direct INSERT rights on hm_lifecycle_events — no
-- privilege elevation is needed, and adding SECURITY DEFINER here would
-- be an unnecessary surface, matching this session's established
-- principle (V1.2.1) of not adding SECURITY DEFINER without a real need.
-- EXECUTE is revoked from PUBLIC and granted only to service_role below —
-- anon/authenticated get none at all, not browser-callable.
--
-- p_source and p_verification_status are accepted as plain text and
-- validated/cast internally (rather than typed directly as the enum
-- columns) specifically so an invalid caller value produces this
-- function's own graceful INVALID_INPUT result instead of a raw Postgres
-- "invalid input value for enum" exception at the call boundary.
--
-- No general metadata pipe: this primitive does not accept an arbitrary
-- caller-supplied JSON blob for the metadata column at all. Nothing in
-- the established input contract needs it — effective_end_date,
-- provider_subscription_id, and derivation_note each already have their
-- own dedicated column — so metadata is left at the table's own default
-- ('{}'::jsonb) rather than inventing a use for it. derivation_note for a
-- reconciler-derived row is always built internally from typed inputs
-- using the established convention (never trusting caller-supplied free
-- text for that path); for a genuine live-observed event, a caller-
-- supplied derivation_note is used as-is but still runs through the same
-- PII guard already enforced on metadata elsewhere in this table.

CREATE TYPE public.hm_apply_subscription_ended_outcome_result AS (
  result_code text,           -- APPLIED | ALREADY_APPLIED | BLOCKED_INSUFFICIENT_IDENTITY | INVALID_EFFECTIVE_END_DATE | INVALID_INPUT | COLLISION_MISMATCH
  lifecycle_event_id uuid,    -- set for APPLIED / ALREADY_APPLIED / COLLISION_MISMATCH (the resulting or conflicting row's id)
  domain_event_key text,      -- set once a key was generated (APPLIED / ALREADY_APPLIED / COLLISION_MISMATCH)
  detail text                 -- human-readable reason, no PII
);

CREATE OR REPLACE FUNCTION public.hm_apply_subscription_ended_outcome_v1(
  p_source text,
  p_source_event_id text,
  p_subject_id uuid,
  p_provider_subscription_id text,
  p_cancellation_source_event_id text,
  p_effective_end_date date,
  p_verification_status text,
  p_derivation_note text DEFAULT NULL
)
RETURNS public.hm_apply_subscription_ended_outcome_result
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result public.hm_apply_subscription_ended_outcome_result;
  v_source_enum public.hm_lifecycle_event_source;
  v_verification_enum public.hm_lifecycle_verification_status;
  v_key_result public.hm_subscription_ended_domain_key_result;
  v_effective_end_at timestamptz;
  v_derivation_note text;
  v_new_id uuid;
  v_constraint_name text;
  v_existing record;
  v_matches boolean;
BEGIN
  IF p_subject_id IS NULL THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'subject_id is required';
    RETURN v_result;
  END IF;

  IF p_source IS NULL OR btrim(p_source) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source is required';
    RETURN v_result;
  END IF;

  IF p_source_event_id IS NULL OR btrim(p_source_event_id) = '' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source_event_id is required';
    RETURN v_result;
  END IF;

  IF p_verification_status IS NULL OR p_verification_status NOT IN ('OBSERVED_EVENT', 'derived_from_observed') THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'verification_status must be OBSERVED_EVENT or derived_from_observed for this primitive (DERIVED_LEGACY_STATE is reserved for historical backfill, not a real-time apply path)';
    RETURN v_result;
  END IF;

  BEGIN
    v_source_enum := p_source::public.hm_lifecycle_event_source;
  EXCEPTION WHEN invalid_text_representation THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source is not a recognized value';
    RETURN v_result;
  END;

  IF v_source_enum = 'pg_cron' THEN
    v_result.result_code := 'INVALID_INPUT';
    v_result.detail := 'source=pg_cron is reserved for autonomous transitions with no provider evidence, not valid here';
    RETURN v_result;
  END IF;

  v_verification_enum := p_verification_status::public.hm_lifecycle_verification_status;

  IF p_effective_end_date IS NULL THEN
    v_result.result_code := 'INVALID_EFFECTIVE_END_DATE';
    v_result.detail := 'effective_end_date is required';
    RETURN v_result;
  END IF;

  v_key_result := public.hm_subscription_ended_domain_event_key_v1(
    p_source, p_provider_subscription_id, p_cancellation_source_event_id, p_effective_end_date
  );

  IF v_key_result.status = 'INSUFFICIENT_IDENTITY' THEN
    v_result.result_code := 'BLOCKED_INSUFFICIENT_IDENTITY';
    v_result.detail := v_key_result.reason;
    RETURN v_result;
  END IF;

  v_effective_end_at := public.hm_billing_effective_end_at_v1(p_effective_end_date);

  IF v_verification_enum = 'derived_from_observed' THEN
    v_derivation_note :=
      'rule=HM_BILLING_EFFECTIVE_END_V1; cause=' ||
      COALESCE(p_cancellation_source_event_id, p_source_event_id) ||
      '; evidence=is_cancelled_for:' || to_char(p_effective_end_date, 'YYYY-MM-DD');
  ELSE
    IF p_derivation_note IS NOT NULL AND p_derivation_note ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
      v_result.result_code := 'INVALID_INPUT';
      v_result.detail := 'derivation_note must not contain PII (email-shaped text detected)';
      RETURN v_result;
    END IF;
    v_derivation_note := p_derivation_note;
  END IF;

  BEGIN
    INSERT INTO public.hm_lifecycle_events (
      event_name, subject_id, occurred_at, source, source_event_id,
      verification_status, derivation_note, provider_subscription_id,
      domain_event_key, effective_end_date
    ) VALUES (
      'subscription_ended', p_subject_id, v_effective_end_at, v_source_enum, p_source_event_id,
      v_verification_enum, v_derivation_note, p_provider_subscription_id,
      v_key_result.domain_event_key, p_effective_end_date
    )
    RETURNING id INTO v_new_id;

    v_result.result_code := 'APPLIED';
    v_result.lifecycle_event_id := v_new_id;
    v_result.domain_event_key := v_key_result.domain_event_key;
    RETURN v_result;

  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

    IF v_constraint_name = 'hm_lifecycle_events_domain_event_key_unique' THEN
      SELECT * INTO v_existing FROM public.hm_lifecycle_events
      WHERE domain_event_key = v_key_result.domain_event_key;
    ELSIF v_constraint_name = 'hm_lifecycle_events_unique_source_event' THEN
      SELECT * INTO v_existing FROM public.hm_lifecycle_events
      WHERE source = v_source_enum AND source_event_id = p_source_event_id AND event_name = 'subscription_ended';
    ELSE
      RAISE;
    END IF;

    v_matches := (
      v_existing.event_name = 'subscription_ended'
      AND v_existing.source = v_source_enum
      AND v_existing.effective_end_date = p_effective_end_date
      AND v_existing.subject_id = p_subject_id
      AND v_existing.provider_subscription_id IS NOT DISTINCT FROM p_provider_subscription_id
    );

    IF v_matches THEN
      v_result.result_code := 'ALREADY_APPLIED';
      v_result.lifecycle_event_id := v_existing.id;
      v_result.domain_event_key := v_existing.domain_event_key;
    ELSE
      v_result.result_code := 'COLLISION_MISMATCH';
      v_result.lifecycle_event_id := v_existing.id;
      v_result.domain_event_key := v_existing.domain_event_key;
      v_result.detail := 'existing hm_lifecycle_events row does not match the expected fachliche identity for this domain/composite key';
    END IF;
    RETURN v_result;
  END;
END;
$$;

-- REVOKE ... FROM PUBLIC alone is NOT sufficient on this schema: confirmed
-- during acceptance testing that pg_default_acl carries a defaclobjtype='f'
-- (functions) rule granting EXECUTE directly to anon AND authenticated
-- (not merely via PUBLIC) on every newly created function, for both the
-- postgres and supabase_admin creating roles — the exact same class of
-- default-privileges surprise already found and handled for TABLES in the
-- Group 1 migrations, now confirmed to apply to FUNCTIONS too. A bare
-- REVOKE FROM PUBLIC left anon/authenticated with live EXECUTE (verified,
-- not assumed) until these explicit per-role revokes were added.

REVOKE ALL ON FUNCTION public.hm_apply_subscription_ended_outcome_v1(
  text, text, uuid, text, text, date, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.hm_apply_subscription_ended_outcome_v1(
  text, text, uuid, text, text, date, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.hm_apply_subscription_ended_outcome_v1(
  text, text, uuid, text, text, date, text, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.hm_apply_subscription_ended_outcome_v1(
  text, text, uuid, text, text, date, text, text
) TO service_role;
