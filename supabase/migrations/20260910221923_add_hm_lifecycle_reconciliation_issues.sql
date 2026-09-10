-- Group 1B (V2.0 foundation implementation): hm_lifecycle_reconciliation_issues.
--
-- Implements the finalized V1.6 design contract: a persisted, dedicated,
-- operational source of truth for a fachlich-technical exception case that
-- prevents lifecycle derivation from completing safely (e.g.
-- RECONCILIATION_BLOCKED_INSUFFICIENT_IDENTITY). Not a replacement for
-- logs (SUPPLEMENTAL_ONLY) and not backed by system_alerts (OPTIONAL
-- NOTIFICATION PROJECTION LATER, never source of truth).
--
-- Issue identity != domain event identity: origin_event_id only ever
-- identifies "which persisted record caused this problem" (e.g. an
-- hm_lifecycle_events.id), never a business/contract identity. No FK is
-- placed on origin_event_id since origin_event_kind is deliberately
-- generic (may point at different origin tables depending on kind, not
-- constrained to one).
--
-- Dedup key: UNIQUE(issue_type, origin_event_kind, origin_event_id) — a
-- stable identity for "this same problem on this same record", not for
-- the underlying subscription. Repeated detection updates last_seen_at/
-- occurrence_count on the SAME row (REOPEN, not a new row) rather than
-- creating a duplicate — structurally forced by this key, not just
-- preferred. No UPSERT/trigger function is built in this migration (per
-- explicit instruction) — only the foundation the future writer will use.
--
-- Two statuses only (OPEN, RESOLVED) — no extra workflow states, matching
-- the explicit "not unnecessary many stati" instruction.
--
-- No writer, no reconciler, no trigger, no automatic issue creation.
-- Table-only foundation.

CREATE TABLE public.hm_lifecycle_reconciliation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  issue_type text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  severity text NOT NULL,

  origin_event_kind text NOT NULL,
  origin_event_id uuid NOT NULL,

  source text,
  subject_id uuid,
  provider_subscription_id text,
  cancellation_source_event_id text,
  effective_end_date date,

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,

  resolved_at timestamptz,
  resolution_reason text,

  details jsonb,

  CONSTRAINT hm_lifecycle_reconciliation_issues_unique_case
    UNIQUE (issue_type, origin_event_kind, origin_event_id),

  CONSTRAINT hm_lifecycle_reconciliation_issues_status_valid
    CHECK (status IN ('OPEN', 'RESOLVED')),

  CONSTRAINT hm_lifecycle_reconciliation_issues_occurrence_count_positive
    CHECK (occurrence_count >= 1),

  -- Mirrors hm_lifecycle_events_derivation_note_required: never allow a
  -- closed case with no recorded reason why.
  CONSTRAINT hm_lifecycle_reconciliation_issues_resolution_reason_required
    CHECK (status <> 'RESOLVED' OR resolution_reason IS NOT NULL),

  -- Mirrors hm_lifecycle_events_metadata_no_email exactly: details is
  -- minimal technical/fachlich provenance only, never PII.
  CONSTRAINT hm_lifecycle_reconciliation_issues_details_no_email
    CHECK (details IS NULL OR details::text !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}')
);

-- Supports "count/list OPEN issues" (FactEngine OPEN_RECONCILIATION_ISSUES,
-- oldest-open-age) without scanning resolved history.
CREATE INDEX hm_lifecycle_reconciliation_issues_open_idx
  ON public.hm_lifecycle_reconciliation_issues (first_seen_at)
  WHERE status = 'OPEN';

-- Supports OPEN_RECONCILIATION_ISSUES_BY_TYPE.
CREATE INDEX hm_lifecycle_reconciliation_issues_type_status_idx
  ON public.hm_lifecycle_reconciliation_issues (issue_type, status);

-- Same default-grant reality already confirmed live on this schema
-- (ALTER DEFAULT PRIVILEGES grants ALL on every new public table to
-- anon/authenticated automatically) — explicitly revoked here rather than
-- relying on RLS alone, same defense-in-depth already applied to
-- hm_lifecycle_events. Unlike hm_lifecycle_events, no SELECT grant to
-- authenticated is added here at all: the admin-read mechanism for this
-- table is explicitly deferred (not decided: direct RLS policy vs. a
-- SECURITY DEFINER RPC) — until that decision is made, no client role can
-- read this table either. service_role/postgres are unaffected
-- (service_role carries rolbypassrls=true, confirmed live on this
-- database) and need no explicit grant to write.

REVOKE ALL ON public.hm_lifecycle_reconciliation_issues FROM anon;
REVOKE ALL ON public.hm_lifecycle_reconciliation_issues FROM authenticated;

ALTER TABLE public.hm_lifecycle_reconciliation_issues ENABLE ROW LEVEL SECURITY;

-- No policies added — RLS enabled with zero policies means even a
-- non-bypassing role would see zero rows; service_role/postgres bypass
-- RLS entirely and are unaffected. A read/write policy is added only once
-- a real writer (Group 2/3) and an admin-read mechanism are actually
-- designed, not in this foundation-only migration.
