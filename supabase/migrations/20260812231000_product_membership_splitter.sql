-- P0 Legacy User Product Splitter
-- Prepared only. Do not apply to production without backup, dry-run review and explicit approval.

CREATE TYPE public.product_membership_product AS ENUM ('HUFMANAGER', 'HUFIAPP');
CREATE TYPE public.product_membership_status AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
CREATE TYPE public.product_membership_source AS ENUM ('USER_SELECTION', 'ADMIN_MIGRATION', 'SYSTEM_MIGRATION', 'IMPORT');
CREATE TYPE public.billing_transition_class AS ENUM ('FREE', 'TRIAL', 'VERIFIED_PAID', 'UNKNOWN_BILLING_STATE');
CREATE TYPE public.product_transition_status AS ENUM ('DECISION_REQUIRED', 'READY', 'BLOCKED', 'COMPLETED');

CREATE TABLE public.product_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product public.product_membership_product NOT NULL,
  status public.product_membership_status NOT NULL DEFAULT 'PENDING',
  selected_at timestamptz,
  source public.product_membership_source NOT NULL DEFAULT 'USER_SELECTION',
  migration_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_memberships_unique_user_product UNIQUE (user_id, product),
  CONSTRAINT product_memberships_active_requires_selected_at CHECK (
    status <> 'ACTIVE' OR selected_at IS NOT NULL
  )
);

CREATE TABLE public.product_membership_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_product public.product_membership_product NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  migration_version text NOT NULL,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_transition_state public.billing_transition_class NOT NULL DEFAULT 'UNKNOWN_BILLING_STATE',
  transition_status public.product_transition_status NOT NULL DEFAULT 'DECISION_REQUIRED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_memberships_user_status_idx
  ON public.product_memberships (user_id, status);

CREATE INDEX product_memberships_product_status_idx
  ON public.product_memberships (product, status);

CREATE INDEX product_membership_decisions_user_created_idx
  ON public.product_membership_decisions (user_id, created_at DESC);

ALTER TABLE public.product_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_membership_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own product memberships"
  ON public.product_memberships
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can read own product membership decisions"
  ON public.product_membership_decisions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can read all product memberships"
  ON public.product_memberships
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can read all product membership decisions"
  ON public.product_membership_decisions
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_product_memberships_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_memberships_updated_at
  BEFORE UPDATE ON public.product_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_product_memberships_updated_at();

CREATE OR REPLACE FUNCTION public.classify_legacy_billing_state(_user_id uuid)
RETURNS public.billing_transition_class
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  has_verified_external boolean := false;
  has_manual_payment boolean := false;
  has_provider_subscription boolean := false;
  has_client_subscription boolean := false;
BEGIN
  SELECT
    subscription_status,
    subscription_plan,
    plan_override,
    access_valid_until,
    copecart_subscription_id
  INTO p
  FROM public.profiles
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN 'UNKNOWN_BILLING_STATE';
  END IF;

  has_verified_external := p.copecart_subscription_id IS NOT NULL AND length(trim(p.copecart_subscription_id)) > 0;

  SELECT EXISTS (
    SELECT 1
    FROM public.provider_subscriptions ps
    WHERE ps.provider_id = _user_id
      AND ps.status IN ('active', 'paid', 'verified')
  ) INTO has_provider_subscription;

  SELECT EXISTS (
    SELECT 1
    FROM public.client_subscriptions cs
    WHERE cs.client_id = _user_id
      AND cs.status IN ('active', 'paid', 'verified')
  ) INTO has_client_subscription;

  SELECT EXISTS (
    SELECT 1
    FROM public.manual_payments mp
    WHERE mp.provider_id = _user_id
      AND mp.status IN ('paid', 'verified')
  ) INTO has_manual_payment;

  IF has_verified_external OR has_provider_subscription OR has_client_subscription OR has_manual_payment THEN
    RETURN 'VERIFIED_PAID';
  END IF;

  IF p.subscription_status = 'trialing' THEN
    RETURN 'TRIAL';
  END IF;

  IF p.subscription_status = 'active' THEN
    RETURN 'UNKNOWN_BILLING_STATE';
  END IF;

  IF p.plan_override IN ('lifetime_grant', 'manual_cash_1y', 'employee') THEN
    RETURN 'UNKNOWN_BILLING_STATE';
  END IF;

  RETURN 'FREE';
END;
$$;

REVOKE ALL ON FUNCTION public.classify_legacy_billing_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classify_legacy_billing_state(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_product_membership_context()
RETURNS TABLE (
  product public.product_membership_product,
  status public.product_membership_status,
  selected_at timestamptz,
  source public.product_membership_source,
  migration_version text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.product, pm.status, pm.selected_at, pm.source, pm.migration_version
  FROM public.product_memberships pm
  WHERE pm.user_id = (SELECT auth.uid())
  ORDER BY pm.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_product_membership_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_membership_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.select_product_membership(
  _product public.product_membership_product,
  _migration_version text DEFAULT 'legacy-product-splitter-v1'
)
RETURNS TABLE (
  product public.product_membership_product,
  status public.product_membership_status,
  billing_transition_state public.billing_transition_class,
  transition_status public.product_transition_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  billing_state public.billing_transition_class;
  prior_state jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  billing_state := public.classify_legacy_billing_state(current_user_id);

  SELECT jsonb_build_object(
    'role', p.role,
    'signup_app', p.signup_app,
    'subscription_status', p.subscription_status,
    'subscription_plan', p.subscription_plan,
    'plan_override_present', p.plan_override IS NOT NULL,
    'access_valid_until_present', p.access_valid_until IS NOT NULL,
    'copecart_subscription_id_present', p.copecart_subscription_id IS NOT NULL,
    'has_horses', EXISTS (SELECT 1 FROM public.horses h WHERE h.owner_id = current_user_id),
    'existing_memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product', pm.product, 'status', pm.status))
      FROM public.product_memberships pm
      WHERE pm.user_id = current_user_id
    ), '[]'::jsonb)
  )
  INTO prior_state
  FROM public.profiles p
  WHERE p.id = current_user_id;

  INSERT INTO public.product_memberships (
    user_id, product, status, selected_at, source, migration_version
  )
  VALUES (
    current_user_id, _product, 'ACTIVE', now(), 'USER_SELECTION', _migration_version
  )
  ON CONFLICT (user_id, product) DO UPDATE SET
    status = 'ACTIVE',
    selected_at = COALESCE(public.product_memberships.selected_at, now()),
    source = 'USER_SELECTION',
    migration_version = EXCLUDED.migration_version,
    updated_at = now();

  INSERT INTO public.product_membership_decisions (
    user_id,
    selected_product,
    migration_version,
    previous_state,
    billing_transition_state,
    transition_status
  )
  VALUES (
    current_user_id,
    _product,
    _migration_version,
    COALESCE(prior_state, '{}'::jsonb),
    billing_state,
    'DECISION_REQUIRED'
  );

  RETURN QUERY
  SELECT _product, 'ACTIVE'::public.product_membership_status, billing_state, 'DECISION_REQUIRED'::public.product_transition_status;
END;
$$;

REVOKE ALL ON FUNCTION public.select_product_membership(public.product_membership_product, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_product_membership(public.product_membership_product, text) TO authenticated;

COMMENT ON TABLE public.product_memberships IS
  'Product membership truth layer. Product is separate from role, context, permission and pricing.';

COMMENT ON TABLE public.product_membership_decisions IS
  'Minimal audit trail for legacy product splitter decisions. No names, emails or free-text PII.';
