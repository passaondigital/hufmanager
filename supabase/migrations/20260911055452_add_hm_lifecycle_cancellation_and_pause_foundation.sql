-- Group 4 (V2.2.1): cancellation classification + pause/frozen event
-- foundation. Closes the CANCELLATION_CLASS foundation gap that currently
-- blocks the (not-yet-built) period-end reconciler, and adds the minimal
-- event vocabulary for the new PAUSED/FROZEN product rule, without
-- inventing a new god-enum and without touching Tour/Appointment data.
--
-- XXL-Staging only (127.0.0.1:54322). Applied via psql -f, matching every
-- prior migration in this Group. No production, no writer, no reconciler,
-- no cron, no notification, no Tour/Appointment change.
--
-- Design decision (unchanged from the session that specified this):
-- event_name stays the ONE general lifecycle-event axis (extended here
-- with three values); cancellation_mode is a second, narrow column that
-- exists ONLY to disambiguate the single case event_name cannot express
-- alone — period_end vs. immediate WITHIN a subscription_cancelled row.
-- Pause/Frozen are represented as their own event_name values, not
-- crammed into cancellation_mode.
--
-- event_name is a real Postgres ENUM (hm_lifecycle_event_name), confirmed
-- live via information_schema before writing this file — not a text+CHECK
-- column. Extended via ALTER TYPE ... ADD VALUE, the existing model, no
-- parallel validation mechanism introduced.
--
-- Adversarial check performed before writing the pause_until CHECK below,
-- as explicitly required: does subscription_frozen or subscription_resumed
-- need its own pause_until? No real business reason found — both events'
-- only meaningful fact (the pause ended, by expiry or by choice) is fully
-- recoverable by joining back to the causally-prior, immutable
-- subscription_paused row for the same anchor; duplicating pause_until
-- onto the later row would be pure denormalization, not new information.
-- pause_until therefore stays exclusive to subscription_paused.
--
-- paused_at is deliberately NOT a new column: occurred_at of the
-- subscription_paused row already IS paused_at for that event, reusing an
-- existing column instead of adding a redundant one.
--
-- Both new CHECK constraints below are written as a single boolean
-- equivalence (column IS NOT NULL) = (event_name = '<value>') rather than
-- an OR-of-two-implications, because the product spec requires a true
-- two-way binding (required for exactly one event_name, forbidden for all
-- others) rather than a one-directional "required when X" rule.

DO $$
BEGIN
  CREATE TYPE public.hm_cancellation_mode AS ENUM ('period_end', 'immediate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.hm_lifecycle_events
  ADD COLUMN IF NOT EXISTS cancellation_mode public.hm_cancellation_mode;

ALTER TABLE public.hm_lifecycle_events
  ADD COLUMN IF NOT EXISTS pause_until date;

-- Each ADD VALUE below is its own top-level statement; running this file
-- via `psql -f` auto-commits between top-level statements outside an
-- explicit BEGIN/COMMIT, so the CHECK constraints further down (which
-- reference these new labels) are safe to add in the same file, same
-- reasoning already used in 20260910213951_add_hm_lifecycle_events_domain_identity.sql.

ALTER TYPE public.hm_lifecycle_event_name ADD VALUE IF NOT EXISTS 'subscription_paused';
ALTER TYPE public.hm_lifecycle_event_name ADD VALUE IF NOT EXISTS 'subscription_resumed';
ALTER TYPE public.hm_lifecycle_event_name ADD VALUE IF NOT EXISTS 'subscription_frozen';

ALTER TABLE public.hm_lifecycle_events
  ADD CONSTRAINT hm_lifecycle_events_cancellation_mode_binding CHECK (
    (cancellation_mode IS NOT NULL) = (event_name = 'subscription_cancelled')
  );

ALTER TABLE public.hm_lifecycle_events
  ADD CONSTRAINT hm_lifecycle_events_pause_until_binding CHECK (
    (pause_until IS NOT NULL) = (event_name = 'subscription_paused')
  );

-- No grant/RLS/policy change: this migration only adds nullable columns,
-- one new type, and two CHECK constraints on an already-locked-down table.
-- No writer, no reconciler, no notification function, no Tour/Appointment
-- table touched.
