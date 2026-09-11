-- HufManager Slim — Access/Entitlement V1, Phase 3: product_entitlements schema.
--
-- product_entitlement_plan and product_membership_product already exist and
-- are live on Production (added by 20260910150139_add_lifecycle_step1_enum_prerequisites.sql
-- and its predecessor) -- reused as-is, not recreated here.
--
-- product_entitlement_status / product_trial_status / product_billing_status
-- do NOT exist on Production. An earlier PREPARED-ONLY reference migration
-- (20260813102303_product_entitlements_trial_billing_prepared.sql) defined a
-- product_entitlement_status without FROZEN or PAUSED and with a CANCELLED
-- value that conflates billing state with access state. That file was never
-- applied to Production and stays untouched as a reference. Since the type
-- doesn't exist there yet, this migration is free to define the vocabulary
-- fresh, matching the canonical business rule set for this task: access
-- state (status) is driven only by payment_succeeded / subscription_ended /
-- subscription_frozen / subscription_paused / subscription_resumed and trial
-- transitions -- never directly by "the provider says cancelled", which is
-- billing-only information (see billing_status) and does not revoke access
-- until the period actually ends.

CREATE TYPE public.product_entitlement_status AS ENUM (
  'PENDING',
  'TRIAL_ACTIVE',
  'TRIAL_EXPIRED',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'FROZEN',
  'LOCKED'
);

CREATE TYPE public.product_trial_status AS ENUM (
  'NONE',
  'ACTIVE',
  'EXPIRED'
);

CREATE TYPE public.product_billing_status AS ENUM (
  'NONE',
  'PENDING_CHECKOUT',
  'VERIFIED_PAID',
  'PAST_DUE',
  'CANCELLED',
  'UNKNOWN_BILLING_STATE'
);

CREATE TABLE public.product_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  product public.product_membership_product NOT NULL,
  plan public.product_entitlement_plan NOT NULL,
  status public.product_entitlement_status NOT NULL DEFAULT 'PENDING',

  trial_status public.product_trial_status NOT NULL DEFAULT 'NONE',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,

  billing_status public.product_billing_status NOT NULL DEFAULT 'NONE',
  billing_provider text,
  external_customer_id text,
  external_subscription_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,

  -- Out-of-order / idempotency guard for the entitlement writer: the
  -- occurred_at (and id, as a deterministic tiebreaker for same-instant
  -- events) of the last hm_lifecycle_events row that was actually applied
  -- to this row. The writer compares incoming events against this before
  -- ever overwriting `status` -- an event that is not strictly newer never
  -- wins, which is what keeps an older, late-arriving payment_succeeded
  -- from undoing a more recent subscription_ended (T9 in the test matrix).
  last_applied_event_occurred_at timestamptz,
  last_applied_event_id uuid,

  -- Provenance of the row's current state, for audit/debugging only --
  -- never fed back into access decisions.
  source text NOT NULL DEFAULT 'SYSTEM',
  migration_version text NOT NULL DEFAULT 'hufmanager-slim-entitlement-v1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_entitlements_unique_user_product_plan UNIQUE (user_id, product, plan),

  -- HufManager Slim's trial is a fixed 14-day in-app trial (product fact,
  -- not a guess -- see copecart-webhook's own product comment). Any other
  -- product/plan combination is free to set its own trial window.
  CONSTRAINT product_entitlements_hufmanager_slim_trial_14d CHECK (
    NOT (product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM' AND trial_status = 'ACTIVE')
    OR (
      trial_started_at IS NOT NULL
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at = trial_started_at + INTERVAL '14 days'
    )
  ),

  -- No raw provider payloads, no customer PII belong in metadata. This
  -- mirrors the identical guard already proven on hm_lifecycle_events.
  CONSTRAINT product_entitlements_metadata_no_email CHECK (
    metadata::text !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  )
);

CREATE INDEX product_entitlements_user_product_status_idx
  ON public.product_entitlements (user_id, product, status);

CREATE UNIQUE INDEX product_entitlements_external_subscription_idx
  ON public.product_entitlements (billing_provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_product_entitlements_updated_at_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_entitlements_updated_at
  BEFORE UPDATE ON public.product_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_product_entitlements_updated_at_v1();

ALTER TABLE public.product_entitlements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_entitlements FROM anon;
REVOKE ALL ON public.product_entitlements FROM authenticated;
GRANT SELECT ON public.product_entitlements TO authenticated;

-- Read-only for clients by design (Phase 3 requirement: "Client darf NICHT
-- selbst ACTIVE / VERIFIED_PAID schreiben"). No INSERT/UPDATE/DELETE policy
-- exists for `authenticated` at all -- not even for their own row -- so RLS
-- has nothing to permit regardless of USING/WITH CHECK clauses. Writes are
-- performed exclusively by the canonical entitlement writer (Phase 5
-- migration), which runs as service_role and bypasses RLS entirely.

CREATE POLICY "Users can read own product entitlements"
  ON public.product_entitlements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can read all product entitlements"
  ON public.product_entitlements
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::app_role));
