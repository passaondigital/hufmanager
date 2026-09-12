-- HufManager Slim — Access/Entitlement V1, Phase 9 (continued): legacy
-- compatibility backfill. One-shot, operator-invoked, NOT a trigger, NOT a
-- cron job (Phase 6 forbids new Production cron in this V1). See
-- docs/HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md for the full
-- classification derivation (verified against Production read-only this
-- session) and the reasoning behind each status mapping below.
--
-- Admins/employees are NOT backfilled here: public.is_admin()/
-- is_master_admin() are already checked directly inside every Phase 9 RLS
-- restrictive policy (20260912051500_...), so an admin needs no
-- product_entitlements row at all to keep working. Giving them one anyway
-- would be a second, redundant access path for the exact same accounts —
-- more surface to keep in sync, not less.
--
-- One-shot guarantee: the WHERE created_at < p_cutover_at clause is baked
-- into the function body, not left to the caller's discretion. Calling
-- this function again after Production has real HufManager Slim signups
-- cannot retroactively grant them anything via this path — a signup after
-- cutover has created_at >= p_cutover_at and is filtered out structurally,
-- not by convention.

CREATE OR REPLACE FUNCTION public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(
  p_cutover_at timestamptz,
  p_dry_run boolean DEFAULT true
)
RETURNS TABLE (
  provider_id uuid,
  class text,
  action text,
  entitlement_status public.product_entitlement_status,
  billing_status public.product_billing_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- The auth.users join below is load-bearing, not decorative: this
  -- session found a real orphaned public.profiles/user_roles row on
  -- XXL-Staging with no matching auth.users row (residue from earlier
  -- test iterations) while testing this function. Without the join, this
  -- function raises a foreign key violation on that row instead of simply
  -- skipping an account that structurally cannot be a real HufManager
  -- Slim customer. Same underlying data-integrity class FactEngine's own
  -- ROLE_WITHOUT_AUTH_USER integrity check already watches for.
  r record;
  v_class text;
  v_status public.product_entitlement_status;
  v_billing public.product_billing_status;
  v_metadata jsonb;
BEGIN
  FOR r IN
    SELECT p.id AS provider_id, p.subscription_status, p.subscription_plan, p.plan_override,
           p.copecart_subscription_id, p.trial_started_at, p.trial_ends_at,
           coalesce(p.is_suspended, false) AS is_suspended,
           EXISTS (
             SELECT 1 FROM public.provider_subscriptions ps
              WHERE ps.provider_id = p.id AND lower(ps.status) IN ('active','paid','verified')
           ) AS ps_verified,
           EXISTS (
             SELECT 1 FROM public.client_subscriptions cs
              WHERE cs.provider_id = p.id AND lower(cs.status) IN ('active','paid','verified')
           ) AS cs_verified,
           EXISTS (
             SELECT 1 FROM public.manual_payments mp WHERE mp.provider_id = p.id
           ) AS has_manual_payment
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'provider'
      JOIN auth.users u ON u.id = p.id
     WHERE p.created_at < p_cutover_at
       AND NOT EXISTS (
             SELECT 1 FROM public.product_entitlements pe
              WHERE pe.user_id = p.id AND pe.product = 'HUFMANAGER' AND pe.plan = 'HUFMANAGER_SLIM'
           )
  LOOP
    v_metadata := '{}'::jsonb;

    IF r.is_suspended THEN
      v_class := 'SUSPENDED';
      v_status := 'LOCKED';
      v_billing := 'NONE';

    ELSIF (r.copecart_subscription_id IS NOT NULL AND r.copecart_subscription_id <> '')
       OR r.ps_verified OR r.cs_verified OR r.has_manual_payment THEN
      v_class := 'PROVEN_PAID';
      v_status := 'ACTIVE';
      v_billing := 'VERIFIED_PAID';

    ELSIF r.plan_override IS NOT NULL AND r.plan_override ~* 'manual|grant|lifetime|cash|gift|comp' THEN
      v_class := 'PROVEN_MANUAL_GRANT';
      v_status := 'ACTIVE';
      v_billing := 'VERIFIED_PAID';
      v_metadata := jsonb_build_object('legacy_plan_override', r.plan_override);

    ELSIF lower(coalesce(r.subscription_status,'')) = 'trialing' AND r.trial_ends_at IS NOT NULL AND r.trial_ends_at >= p_cutover_at THEN
      v_class := 'PROVEN_TRIAL';
      -- Legacy trial windows are not the 14-day HufManager Slim trial
      -- (product_entitlements_hufmanager_slim_trial_14d would reject a
      -- 30-day legacy window under trial_status=ACTIVE) -- these two
      -- trial mechanics are not the same thing and must not be conflated.
      -- Grandfathered straight to ACTIVE, trial_status left NONE; the
      -- original legacy window is preserved in metadata for audit only.
      v_status := 'ACTIVE';
      v_billing := 'NONE';
      v_metadata := jsonb_build_object(
        'legacy_trial_started_at', r.trial_started_at,
        'legacy_trial_ends_at', r.trial_ends_at,
        'note', 'grandfathered from legacy (non-14-day) trial window, not a HufManager Slim in-app trial'
      );

    ELSIF lower(coalesce(r.subscription_status,'')) = 'active' THEN
      v_class := 'AMBIGUOUS_ACTIVE_ONLY';
      v_status := 'ACTIVE';
      -- Deliberately NOT VERIFIED_PAID -- reuses the existing, real
      -- UNKNOWN_BILLING_STATE vocabulary (see billingClassify.mjs's own
      -- classifyLegacyBillingState, same semantics) rather than inventing
      -- a parallel compatibility flag.
      v_billing := 'UNKNOWN_BILLING_STATE';
      v_metadata := jsonb_build_object('legacy_compatibility_review_required', true);

    ELSE
      v_class := 'NO_EVIDENCE';
      -- No row inserted for this class -- falls through to the same
      -- NO_ENTITLEMENT default as a brand-new signup. Nothing here proves
      -- this account should have access; the compatibility doc records
      -- why (docs/HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §4).
      RETURN QUERY SELECT r.provider_id, v_class, 'SKIPPED_NO_EVIDENCE'::text, NULL::public.product_entitlement_status, NULL::public.product_billing_status;
      CONTINUE;
    END IF;

    IF p_dry_run THEN
      RETURN QUERY SELECT r.provider_id, v_class, 'DRY_RUN_WOULD_INSERT'::text, v_status, v_billing;
    ELSE
      INSERT INTO public.product_entitlements (
        user_id, product, plan, status, billing_status, trial_status, source, migration_version, metadata
      ) VALUES (
        r.provider_id, 'HUFMANAGER', 'HUFMANAGER_SLIM', v_status, v_billing, 'NONE',
        'LEGACY_BACKFILL_' || v_class, 'hufmanager-slim-legacy-backfill-v1', v_metadata
      )
      ON CONFLICT (user_id, product, plan) DO NOTHING;

      RETURN QUERY SELECT r.provider_id, v_class, 'INSERTED'::text, v_status, v_billing;
    END IF;
  END LOOP;
END;
$$;

-- Operator-only. Never exposed to authenticated/anon clients -- this is a
-- one-shot cutover tool invoked directly (service_role / postgres), not a
-- feature endpoint.
REVOKE ALL ON FUNCTION public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(timestamptz, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(timestamptz, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(timestamptz, boolean) FROM authenticated;
