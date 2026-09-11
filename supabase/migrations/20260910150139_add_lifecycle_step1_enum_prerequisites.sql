-- Forward-fix prerequisite for 20260910150140_add_hm_lifecycle_events.sql.
--
-- That migration references public.product_membership_product and
-- public.product_entitlement_plan, assuming they already exist (they were
-- meant to come from 20260813102303_product_entitlements_trial_billing_prepared.sql,
-- which is itself explicitly "Prepared only. Do not apply to production
-- without ... explicit production approval." and has never been applied to
-- Production). Deploying the full product-membership/entitlement stack to
-- unblock Step 1 was explicitly rejected — this migration supplies ONLY the
-- two enum types Step 1 actually needs, nothing else from that stack.
--
-- Scope is deliberately minimal: two enum types, no tables, no triggers,
-- no functions, no policies, no data. Does not touch profiles,
-- product_memberships, product_entitlements, or saas_billing_events.
--
-- Idempotent: if a type already exists (e.g. a future run after the full
-- product-membership/entitlement migration lands), its exact label set is
-- checked rather than assumed — a pre-existing type with different values
-- fails loudly instead of silently passing.

DO $$
DECLARE
  existing_labels text[];
  expected_labels text[] := ARRAY['HUFIAPP', 'HUFMANAGER']; -- sorted for set comparison
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'product_membership_product' AND typnamespace = 'public'::regnamespace
  ) THEN
    SELECT array_agg(enumlabel ORDER BY enumlabel) INTO existing_labels
    FROM pg_enum
    WHERE enumtypid = 'public.product_membership_product'::regtype;

    IF existing_labels IS DISTINCT FROM expected_labels THEN
      RAISE EXCEPTION 'public.product_membership_product already exists with unexpected values: got %, expected %', existing_labels, expected_labels;
    END IF;
  ELSE
    CREATE TYPE public.product_membership_product AS ENUM ('HUFMANAGER', 'HUFIAPP');
  END IF;
END $$;

DO $$
DECLARE
  existing_labels text[];
  expected_labels text[] := ARRAY['HUFIAPP_PREMIUM', 'HUFMANAGER_SLIM', 'LEGACY_DUO', 'LEGACY_PRO', 'LEGACY_STARTER', 'LEGACY_TEAM']; -- sorted for set comparison
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'product_entitlement_plan' AND typnamespace = 'public'::regnamespace
  ) THEN
    SELECT array_agg(enumlabel ORDER BY enumlabel) INTO existing_labels
    FROM pg_enum
    WHERE enumtypid = 'public.product_entitlement_plan'::regtype;

    IF existing_labels IS DISTINCT FROM expected_labels THEN
      RAISE EXCEPTION 'public.product_entitlement_plan already exists with unexpected values: got %, expected %', existing_labels, expected_labels;
    END IF;
  ELSE
    CREATE TYPE public.product_entitlement_plan AS ENUM (
      'HUFMANAGER_SLIM',
      'HUFIAPP_PREMIUM',
      'LEGACY_STARTER',
      'LEGACY_PRO',
      'LEGACY_DUO',
      'LEGACY_TEAM'
    );
  END IF;
END $$;
