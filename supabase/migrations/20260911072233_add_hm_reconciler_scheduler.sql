-- V2.7: period-end reconciler scheduler. Two parts, deliberately separate:
--
-- 1. Reusable, additive DB objects (table + wrapper function) -- same
--    class of object as every other migration in this stack, could in
--    principle also exist on Production later.
-- 2. The actual `cron.schedule(...)` call at the very bottom -- this is
--    XXL-STAGING ONLY, per explicit instruction ("KEIN Production
--    Scheduler Create" in this session). Recreating the schedule on
--    Production is its own separate go-live step (see the deploy-order
--    runbook), never implied by re-running this file.
--
-- SCHEDULING CONVENTION: read-only inventoried before writing this file.
-- XXL-Staging already runs pg_cron 1.6.4 with 9 jobs (8 inactive mirrors
-- of Edge Function URLs via net.http_post, 1 active:
-- "downgrade-expired-trials", a direct SQL UPDATE with no HTTP hop at
-- all). Production runs the same pg_cron version with 15 ACTIVE jobs,
-- including an active "downgrade-expired-trials" using the identical
-- direct-SQL pattern. That is the real, already-live precedent for "a
-- scheduled DB-side lifecycle transition, no Edge Function involved" --
-- this migration follows it exactly (SELECT a plpgsql wrapper function),
-- not the net.http_post-to-Edge-Function pattern used by the other,
-- currently-inactive jobs.
--
-- SCHEDULE: every 15 minutes, per explicit instruction ("kein Sekunden-
-- genauigkeit erforderlich"). effective_end_date reaches its boundary at
-- a fixed calendar-day instant (start of the following Europe/Berlin day)
-- -- a 15-minute worst-case delay is negligible against day-granularity
-- billing data, and matches this session's own earlier-documented
-- reasoning against tighter cadences.
--
-- OBSERVABILITY: hm_reconcile_period_end_subscriptions_v1 already returns
-- a rich jsonb summary, but pg_cron's own cron.job_run_details does not
-- durably capture a SELECT's result value (only start/end time and a
-- generic status/return_message) -- confirmed by reading
-- cron.job_run_details' own column list before writing this file, not
-- assumed. No existing table fits this purpose: hm_activity_log is
-- staff/admin activity audit (staff_id, admin_user_id, ip_address columns
-- -- a different domain entirely), and reusing it would misuse an
-- unrelated audit trail for system scheduler telemetry. A small, new,
-- purpose-built run-log table is therefore genuinely warranted here, not
-- built from convenience -- it holds only counts, no PII, no payload.

CREATE TABLE public.hm_reconciler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  run_started_at timestamptz NOT NULL,
  run_finished_at timestamptz,

  batch_size_used integer,
  scanned integer,
  applied integer,
  already_applied integer,
  superseded integer,
  blocked_insufficient_identity integer,
  blocked_ambiguous_supersession integer,
  collision_mismatch integer,
  deterministic_failure integer,
  errors integer,
  duration_ms integer,

  fatal_error text  -- set only if the wrapper itself caught an unexpected
                     -- exception escaping the reconciler (should not
                     -- normally happen -- the reconciler isolates
                     -- per-candidate failures internally); NULL on every
                     -- normal run
);

CREATE INDEX hm_reconciler_runs_started_idx ON public.hm_reconciler_runs (run_started_at DESC);

REVOKE ALL ON public.hm_reconciler_runs FROM anon;
REVOKE ALL ON public.hm_reconciler_runs FROM authenticated;
ALTER TABLE public.hm_reconciler_runs ENABLE ROW LEVEL SECURITY;
-- No policies: matches the established pattern for every other internal
-- table in this lineage (service_role/postgres bypass RLS; no client role
-- can read or write this even with a future policy oversight elsewhere).

-- Thin scheduling wrapper. The reconciler itself stays scheduler-agnostic
-- (per this whole lineage's SCHEDULER INDEPENDENCE principle) -- it takes
-- no scheduler-specific input and its business semantics do not change
-- based on who/what calls it. This wrapper owns exactly one concern:
-- recording that a run happened and what it did, nothing fachlich.
CREATE OR REPLACE FUNCTION public.hm_reconcile_period_end_subscriptions_scheduled_v1()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_summary jsonb;
  v_fatal_error text;
BEGIN
  BEGIN
    v_summary := public.hm_reconcile_period_end_subscriptions_v1(100);
  EXCEPTION WHEN OTHERS THEN
    v_fatal_error := SQLERRM;
    v_summary := NULL;
  END;

  INSERT INTO public.hm_reconciler_runs (
    run_started_at, run_finished_at, batch_size_used, scanned, applied, already_applied,
    superseded, blocked_insufficient_identity, blocked_ambiguous_supersession,
    collision_mismatch, deterministic_failure, errors, duration_ms, fatal_error
  ) VALUES (
    v_started, clock_timestamp(),
    (v_summary->>'batch_size_used')::integer,
    (v_summary->>'scanned')::integer,
    (v_summary->>'applied')::integer,
    (v_summary->>'already_applied')::integer,
    (v_summary->>'superseded')::integer,
    (v_summary->>'blocked_insufficient_identity')::integer,
    (v_summary->>'blocked_ambiguous_supersession')::integer,
    (v_summary->>'collision_mismatch')::integer,
    (v_summary->>'deterministic_failure')::integer,
    (v_summary->>'errors')::integer,
    (v_summary->>'duration_ms')::integer,
    v_fatal_error
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_scheduled_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_scheduled_v1() FROM anon;
REVOKE ALL ON FUNCTION public.hm_reconcile_period_end_subscriptions_scheduled_v1() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_reconcile_period_end_subscriptions_scheduled_v1() TO service_role;

-- ============================================================================
-- XXL-STAGING ONLY FROM HERE. Production scheduler creation is an explicit
-- separate go-live step (see the deploy-order runbook), never implied by
-- this migration file. cron.schedule is idempotent on jobname -- re-running
-- this file updates the existing job rather than duplicating it.
-- ============================================================================

SELECT cron.schedule(
  'reconcile-period-end-subscriptions',
  '*/15 * * * *',
  $$SELECT public.hm_reconcile_period_end_subscriptions_scheduled_v1();$$
);
