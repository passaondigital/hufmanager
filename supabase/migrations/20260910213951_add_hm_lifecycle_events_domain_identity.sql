-- Domain Event Identity Foundation for hm_lifecycle_events.
--
-- Design context (independent adversarial audit, V1.4, sign-off granted
-- 2026-09-10): the existing UNIQUE(source, source_event_id, event_name)
-- constraint (20260910210509_fix_hm_lifecycle_event_domain_idempotency.sql)
-- correctly protects provider-event fan-out (one CopeCart event emitting
-- multiple domain rows, e.g. trial_converted + subscription_activated) and
-- is NOT changed here.
--
-- It does NOT protect against two different writers/paths independently
-- producing the SAME fachliche domain event — e.g. a future reconciler
-- deriving subscription_ended from a period-end cancellation's
-- is_cancelled_for date, and (later, or concurrently) a genuine live
-- CopeCart end-event doing the same thing for the same underlying
-- subscription. Those two rows would have different source_event_id
-- values and therefore would NOT collide under the existing key.
--
-- domain_event_key closes that gap: a deterministic, writer-independent
-- string (e.g. "copecart:<provider_subscription_id>:<effective_end_date>:
-- subscription_ended") that any writer computes identically for the same
-- real-world outcome, backed by its own partial UNIQUE index. Nullable —
-- only populated for event types where cross-writer duplication risk is
-- real (not required for all 7 existing event types).
--
-- provider_subscription_id is a plain nullable reference column, added so
-- lifecycle events can be queried per stable provider subscription rather
-- than only per subject_id — subject_id alone cannot distinguish two
-- sequential subscriptions for the same product/plan (a real ambiguity
-- already present today in product_entitlements' own UPSERT ON CONFLICT
-- (user_id, product, plan), independently confirmed during this design
-- review).
--
-- derived_from_observed is a new verification_status value for a row that
-- is internally derived but deterministic from real, previously-observed
-- provider evidence — distinct from OBSERVED_EVENT (a live, directly
-- delivered event) and from DERIVED_LEGACY_STATE (pre-lifecycle-log
-- historical backfill of old accounts, a different concept with its own
-- existing derivation_note contract). Reuses that same existing
-- derivation_note-required CHECK mechanism rather than inventing a new one.
--
-- No writer, reconciler, cron, or Edge Function change. No production.
-- XXL-Staging only. Table-only additive change: two nullable columns, one
-- partial unique index, one enum value, one CHECK constraint replacement.

ALTER TABLE public.hm_lifecycle_events
  ADD COLUMN provider_subscription_id text;

CREATE INDEX hm_lifecycle_events_provider_subscription_idx
  ON public.hm_lifecycle_events (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

ALTER TABLE public.hm_lifecycle_events
  ADD COLUMN domain_event_key text;

CREATE UNIQUE INDEX hm_lifecycle_events_domain_event_key_unique
  ON public.hm_lifecycle_events (domain_event_key)
  WHERE domain_event_key IS NOT NULL;

ALTER TYPE public.hm_lifecycle_verification_status
  ADD VALUE IF NOT EXISTS 'derived_from_observed';

-- The CHECK constraint below is added in a separate statement (not inside
-- the same implicit transaction block as the ALTER TYPE ADD VALUE above)
-- because Postgres does not allow a newly-added enum value to be used in
-- the same transaction that added it. Running this file via `psql -f`
-- auto-commits between top-level statements outside an explicit
-- BEGIN/COMMIT, so this ordering is safe.

ALTER TABLE public.hm_lifecycle_events
  DROP CONSTRAINT hm_lifecycle_events_derivation_note_required;

ALTER TABLE public.hm_lifecycle_events
  ADD CONSTRAINT hm_lifecycle_events_derivation_note_required CHECK (
    verification_status NOT IN ('DERIVED_LEGACY_STATE', 'derived_from_observed')
    OR derivation_note IS NOT NULL
  );
