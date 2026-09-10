-- ============================================================================
-- DRAFT ONLY — NOT APPLIED. NOT part of any migration history.
-- Deliberately kept outside hufmanager/supabase/migrations/ per the brief:
-- HufManager repo receives zero changes in this session.
--
-- REVISED 2026-09-10 (V1.1.1 migration-readiness review) after a
-- line-by-line check against the ACTUAL current staging schema — not
-- assumed from docs. See docs/HUFMANAGER_LIFECYCLE_STAGING_ACCEPTANCE.md
-- section "Draft review findings" for exactly what changed and why.
--
-- If Pascal approves this direction, whoever implements it should copy the
-- relevant parts into a real, timestamped file under
-- hufmanager/supabase/migrations/, review it AGAIN against the schema at
-- that time (schema drift between now and then is possible), and follow
-- the same "Prepared only. Do not apply to production without ...
-- explicit approval." convention the two existing prepared-migrations
-- already use (20260812231000_product_membership_splitter.sql,
-- 20260813102303_product_entitlements_trial_billing_prepared.sql).
--
-- See docs/HUFMANAGER_LIFECYCLE_EVENT_CONTRACT.md for the full rationale
-- and docs/HUFMANAGER_LIFECYCLE_IMPLEMENTATION_PLAN.md for what else needs
-- to change (the webhook, a mapping helper, an optional backfill script).
-- ============================================================================

-- Idempotent type creation, matching the exact pattern used by
-- 20260813102303_product_entitlements_trial_billing_prepared.sql (so this
-- migration is safely re-runnable, same as its sibling).

DO $$
BEGIN
  CREATE TYPE public.hm_lifecycle_event_name AS ENUM (
    'trial_started',
    'trial_converted',
    'subscription_activated',
    'payment_succeeded',
    'payment_failed',
    'subscription_cancelled',
    'subscription_ended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.hm_lifecycle_event_source AS ENUM ('copecart', 'pg_cron', 'admin', 'legacy_derived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.hm_lifecycle_verification_status AS ENUM ('OBSERVED_EVENT', 'DERIVED_LEGACY_STATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- `product`/`plan` deliberately reuse the EXISTING enums from
-- 20260813102303_product_entitlements_trial_billing_prepared.sql
-- (public.product_membership_product, public.product_entitlement_plan)
-- rather than inventing near-duplicate types. Both are nullable here —
-- NULL means "not determined for this event" (e.g. an unmapped CopeCart
-- product id, or payment.recurring.upcoming, which the implementation
-- plan notes has no clear mapping yet) rather than a synthetic 'UNKNOWN'
-- enum value that would duplicate what SQL NULL already means.

CREATE TABLE public.hm_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_name public.hm_lifecycle_event_name NOT NULL,
  event_version text NOT NULL DEFAULT 'hm-lifecycle-v1',

  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,

  source public.hm_lifecycle_event_source NOT NULL,
  source_event_id text NOT NULL,

  product public.product_membership_product,
  plan public.product_entitlement_plan,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  verification_status public.hm_lifecycle_verification_status NOT NULL,
  derivation_note text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- The idempotency key (brief section 9/11), matching the real,
  -- already-live pattern on public.saas_billing_events:
  -- UNIQUE(provider, event_id). This is the last line of defense against
  -- a concurrent duplicate delivery — no "check then insert" race is
  -- possible because Postgres enforces this at the constraint level on
  -- the INSERT itself, not in application code beforehand.
  CONSTRAINT hm_lifecycle_events_unique_source_event UNIQUE (source, source_event_id),

  -- Never allow a DERIVED_LEGACY_STATE row with no explanation of what it
  -- was derived from — enforced at the database level, not just
  -- convention, so a fabricated-looking "observed" legacy event is
  -- structurally impossible to insert even by a future careless caller.
  CONSTRAINT hm_lifecycle_events_derivation_note_required CHECK (
    verification_status <> 'DERIVED_LEGACY_STATE' OR derivation_note IS NOT NULL
  ),

  -- No metadata dump of PII: a minimal, structural guard against the
  -- obvious mistake (an email address landing in metadata). Not a
  -- complete PII scanner — a defense-in-depth backstop, not the primary
  -- control (the primary control is: don't put PII in metadata, per
  -- docs/HUFMANAGER_LIFECYCLE_EVENT_CONTRACT.md). standard_conforming_strings
  -- is on by default in this Postgres version, so `\.` here is passed to
  -- the regex engine as a literal escaped dot, not a string-literal escape
  -- — reasoned from documented Postgres semantics; NOT live-tested against
  -- staging in this review, per this task's explicit "no SQL against
  -- staging" instruction. Verify with a real negative-test insert during
  -- the staging acceptance pass (see
  -- docs/HUFMANAGER_LIFECYCLE_STAGING_ACCEPTANCE.md) before this is ever
  -- applied for real.
  CONSTRAINT hm_lifecycle_events_metadata_no_email CHECK (
    metadata::text !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  )
);

CREATE INDEX hm_lifecycle_events_subject_idx ON public.hm_lifecycle_events (subject_id, occurred_at);
CREATE INDEX hm_lifecycle_events_event_name_idx ON public.hm_lifecycle_events (event_name, occurred_at);

-- REVISED: this schema's own ALTER DEFAULT PRIVILEGES (confirmed live on
-- staging via pg_default_acl) grants ALL privileges on every new public
-- table to anon AND authenticated automatically — this is NOT something a
-- bare CREATE TABLE can opt out of, and product_entitlements itself
-- carries exactly this same broad default grant with RLS as the real
-- gate. The original draft's comment ("No direct table grants to
-- authenticated or anon") was WRONG — corrected here by explicitly
-- revoking the default grant and re-granting only what's intended,
-- rather than silently relying on RLS alone for a hochsensibel
-- (highly sensitive) billing/lifecycle table (brief section 10).

REVOKE ALL ON public.hm_lifecycle_events FROM anon;
REVOKE ALL ON public.hm_lifecycle_events FROM authenticated;
GRANT SELECT ON public.hm_lifecycle_events TO authenticated;
-- No INSERT/UPDATE/DELETE grant to authenticated or anon at all — this
-- table is server-write-only (webhook/cron/admin, all service_role, which
-- carries rolbypassrls=true on this database — confirmed live — so it
-- needs no explicit grant or policy to write). A provider cannot write or
-- fake their own lifecycle events even with a client-side bug, because
-- the SQL-level GRANT itself refuses it, before RLS is even evaluated.

ALTER TABLE public.hm_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- REVISED: matches product_entitlements' ACTUAL pattern (confirmed live
-- via pg_policy) — direct RLS policies on the table using has_role(),
-- not a bespoke SECURITY DEFINER wrapper function. The original draft's
-- get_own_lifecycle_events() function is dropped: it duplicated a pattern
-- this table family doesn't actually use, and removing an unnecessary
-- SECURITY DEFINER surface is itself a small security improvement
-- (smaller reviewable surface, brief section 9's "kleinste sichere
-- Migration" preference).

CREATE POLICY "Users can read own lifecycle events"
  ON public.hm_lifecycle_events FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = subject_id);

CREATE POLICY "Admins can read all lifecycle events"
  ON public.hm_lifecycle_events FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- No INSERT/UPDATE/DELETE policy for `authenticated` at all — combined
-- with the REVOKE above, a provider cannot create, edit, or delete their
-- own (or anyone else's) lifecycle events through any client path. Only
-- service_role (bypasses RLS) can write, exactly matching this table
-- family's established trust model
-- (public.prevent_billing_self_update's own documented writer list:
-- service-role/pg_cron, admins, and the CopeCart webhook).

-- ============================================================================
-- Rollback: see docs/drafts/hm_lifecycle_events_ROLLBACK_DRAFT.sql for the
-- full SAFE-AUTOMATIC vs. MANUAL/DATA-PRESERVING distinction. Do not use
-- a bare DROP TABLE once this has received any real production data.
-- ============================================================================
