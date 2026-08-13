-- HufManager/HufiApp product-specific trial and SaaS entitlement model.
-- Prepared only. Do not apply to production without backup, HufiDB GREEN run
-- and explicit production approval.
--
-- Important:
-- - Does not mutate legacy profiles.subscription_* or profiles.trial_* fields.
-- - Product membership is separate from role/context/permission.
-- - Customer app relationship access remains free and relationship-scoped.

DO $$
BEGIN
  CREATE TYPE public.product_entitlement_plan AS ENUM (
    'HUFMANAGER_SLIM',
    'HUFIAPP_PREMIUM',
    'LEGACY_STARTER',
    'LEGACY_PRO',
    'LEGACY_DUO',
    'LEGACY_TEAM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.product_entitlement_status AS ENUM (
    'PENDING',
    'TRIAL_ACTIVE',
    'TRIAL_EXPIRED',
    'ACTIVE',
    'PAST_DUE',
    'CANCELLED',
    'LOCKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.product_trial_status AS ENUM (
    'NONE',
    'ACTIVE',
    'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.product_billing_status AS ENUM (
    'NONE',
    'PENDING_CHECKOUT',
    'VERIFIED_PAID',
    'PAST_DUE',
    'CANCELLED',
    'UNKNOWN_BILLING_STATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.product_entitlements (
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
  source text NOT NULL DEFAULT 'SYSTEM',
  migration_version text NOT NULL DEFAULT 'product-entitlements-v1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_entitlements_unique_user_product_plan UNIQUE (user_id, product, plan),
  CONSTRAINT product_entitlements_hufmanager_trial_14d CHECK (
    product <> 'HUFMANAGER'
    OR trial_status <> 'ACTIVE'
    OR (
      trial_started_at IS NOT NULL
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at = trial_started_at + interval '14 days'
    )
  ),
  CONSTRAINT product_entitlements_hufiapp_no_trial CHECK (
    product <> 'HUFIAPP'
    OR trial_status = 'NONE'
  )
);

CREATE TABLE IF NOT EXISTS public.saas_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  product public.product_membership_product,
  plan public.product_entitlement_plan,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  transition_status public.product_transition_status NOT NULL DEFAULT 'DECISION_REQUIRED',
  billing_status public.product_billing_status NOT NULL DEFAULT 'UNKNOWN_BILLING_STATE',
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_billing_events_provider_event_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS product_entitlements_user_product_idx
  ON public.product_entitlements (user_id, product, status);

CREATE INDEX IF NOT EXISTS product_entitlements_external_subscription_idx
  ON public.product_entitlements (billing_provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS saas_billing_events_user_created_idx
  ON public.saas_billing_events (user_id, created_at DESC);

ALTER TABLE public.product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own product entitlements" ON public.product_entitlements;
CREATE POLICY "Users can read own product entitlements"
  ON public.product_entitlements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read all product entitlements" ON public.product_entitlements;
CREATE POLICY "Admins can read all product entitlements"
  ON public.product_entitlements
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read SaaS billing events" ON public.saas_billing_events;
CREATE POLICY "Admins can read SaaS billing events"
  ON public.saas_billing_events
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_product_entitlements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_entitlements_updated_at ON public.product_entitlements;
CREATE TRIGGER trg_product_entitlements_updated_at
  BEFORE UPDATE ON public.product_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_product_entitlements_updated_at();

CREATE OR REPLACE FUNCTION public.get_product_entitlement_context()
RETURNS TABLE (
  product public.product_membership_product,
  plan public.product_entitlement_plan,
  status public.product_entitlement_status,
  trial_status public.product_trial_status,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  billing_status public.product_billing_status,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pe.product,
    pe.plan,
    CASE
      WHEN pe.product = 'HUFMANAGER'
        AND pe.trial_status = 'ACTIVE'
        AND pe.trial_ends_at <= now()
        AND pe.billing_status <> 'VERIFIED_PAID'
      THEN 'TRIAL_EXPIRED'::public.product_entitlement_status
      ELSE pe.status
    END AS status,
    CASE
      WHEN pe.product = 'HUFMANAGER'
        AND pe.trial_status = 'ACTIVE'
        AND pe.trial_ends_at <= now()
        AND pe.billing_status <> 'VERIFIED_PAID'
      THEN 'EXPIRED'::public.product_trial_status
      ELSE pe.trial_status
    END AS trial_status,
    pe.trial_started_at,
    pe.trial_ends_at,
    pe.billing_status,
    pe.current_period_end
  FROM public.product_entitlements pe
  WHERE pe.user_id = (SELECT auth.uid())
  ORDER BY pe.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_product_entitlement_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_entitlement_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_hufmanager_trial(
  _migration_version text DEFAULT 'hufmanager-slim-pricing-v1'
)
RETURNS TABLE (
  product public.product_membership_product,
  plan public.product_entitlement_plan,
  status public.product_entitlement_status,
  trial_status public.product_trial_status,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  billing_status public.product_billing_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  started_at timestamptz := now();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_entitlements pe
    WHERE pe.user_id = current_user_id
      AND pe.product = 'HUFMANAGER'
      AND pe.plan = 'HUFMANAGER_SLIM'
  ) THEN
    RETURN QUERY
    SELECT
      pe.product,
      pe.plan,
      CASE
        WHEN pe.trial_status = 'ACTIVE'
          AND pe.trial_ends_at <= now()
          AND pe.billing_status <> 'VERIFIED_PAID'
        THEN 'TRIAL_EXPIRED'::public.product_entitlement_status
        ELSE pe.status
      END,
      CASE
        WHEN pe.trial_status = 'ACTIVE'
          AND pe.trial_ends_at <= now()
          AND pe.billing_status <> 'VERIFIED_PAID'
        THEN 'EXPIRED'::public.product_trial_status
        ELSE pe.trial_status
      END,
      pe.trial_started_at,
      pe.trial_ends_at,
      pe.billing_status
    FROM public.product_entitlements pe
    WHERE pe.user_id = current_user_id
      AND pe.product = 'HUFMANAGER'
      AND pe.plan = 'HUFMANAGER_SLIM';
    RETURN;
  END IF;

  INSERT INTO public.product_entitlements (
    user_id,
    product,
    plan,
    status,
    trial_status,
    trial_started_at,
    trial_ends_at,
    billing_status,
    source,
    migration_version
  )
  VALUES (
    current_user_id,
    'HUFMANAGER',
    'HUFMANAGER_SLIM',
    'TRIAL_ACTIVE',
    'ACTIVE',
    started_at,
    started_at + interval '14 days',
    'NONE',
    'IN_APP_TRIAL',
    _migration_version
  );

  RETURN QUERY
  SELECT
    pe.product,
    pe.plan,
    pe.status,
    pe.trial_status,
    pe.trial_started_at,
    pe.trial_ends_at,
    pe.billing_status
  FROM public.product_entitlements pe
  WHERE pe.user_id = current_user_id
    AND pe.product = 'HUFMANAGER'
    AND pe.plan = 'HUFMANAGER_SLIM';
END;
$$;

REVOKE ALL ON FUNCTION public.start_hufmanager_trial(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_hufmanager_trial(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_hufmanager_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.product_entitlements
  SET
    status = 'TRIAL_EXPIRED',
    trial_status = 'EXPIRED',
    updated_at = now()
  WHERE product = 'HUFMANAGER'
    AND plan = 'HUFMANAGER_SLIM'
    AND trial_status = 'ACTIVE'
    AND trial_ends_at <= now()
    AND billing_status <> 'VERIFIED_PAID';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_hufmanager_trials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_hufmanager_trials() TO service_role;

COMMENT ON TABLE public.product_entitlements IS
  'Per-product SaaS entitlement and trial state. Replaces global profiles trial defaults for new product-specific access decisions.';

COMMENT ON TABLE public.saas_billing_events IS
  'Sanitized, idempotent SaaS billing event ledger. Does not store raw CopeCart payloads or secrets.';
