-- HufManager Slim — Access/Entitlement V1, Phase 4: the ONE canonical
-- access decision, for the currently authenticated user only.
--
-- reason_code semantics that are NOT obvious from the business rules text
-- and are decided here, not guessed at silently:
--
-- * TRIAL_EXPIRED is computed dynamically (trial_ends_at < now()) rather
--   than requiring a scheduled job to flip stored status from
--   TRIAL_ACTIVE to TRIAL_EXPIRED first. No trial-expiry cron exists in
--   this V1 (Phase 6 explicitly says not to activate a new Production
--   cron in this task) -- computing it at read time means T15 (trial
--   expired -> Access NO) is correct immediately, with zero scheduled
--   job dependency. The stored `status` column is left as the writer set
--   it (event-sourced, "what the last event said"); this function is the
--   point-in-time decision layer on top of that, and the two are allowed
--   to diverge exactly here, by design.
-- * status = 'PAUSED' maps to has_access = false (reason_code LOCKED) as a
--   conservative default. The task's own business rules explicitly leave
--   PAUSED's access semantics undecided ("NICHT raten... als OPEN
--   BUSINESS RULE berichten") -- deny-by-default for an unproven state is
--   the safe choice, not a guess at the real answer, and is called out
--   again in this task's final report.
-- * status = 'PAST_DUE' is unreachable in this V1 (payment_failed only
--   ever sets billing_status = PAST_DUE, never the entitlement `status`
--   itself -- see the writer migration). It is handled here defensively
--   (REVIEW_REQUIRED) in case a future grace-period mechanism starts
--   setting it, rather than silently falling through.

CREATE OR REPLACE FUNCTION public.get_hufmanager_access_context_v1()
RETURNS TABLE (
  has_access boolean,
  product public.product_membership_product,
  plan public.product_entitlement_plan,
  entitlement_status public.product_entitlement_status,
  billing_status public.product_billing_status,
  trial_status public.product_trial_status,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  reason_code text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.product_entitlements%ROWTYPE;
  v_trial_expired boolean;
  v_has_access boolean;
  v_reason_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.product_entitlements pe
   WHERE pe.user_id = v_uid AND pe.product = 'HUFMANAGER' AND pe.plan = 'HUFMANAGER_SLIM';

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, 'HUFMANAGER'::public.product_membership_product, 'HUFMANAGER_SLIM'::public.product_entitlement_plan,
      NULL::public.product_entitlement_status, NULL::public.product_billing_status, NULL::public.product_trial_status,
      NULL::timestamptz, NULL::timestamptz, 'NO_ENTITLEMENT'::text;
    RETURN;
  END IF;

  v_trial_expired := v_row.status = 'TRIAL_ACTIVE'
    AND v_row.trial_ends_at IS NOT NULL
    AND v_row.trial_ends_at < now();

  IF v_trial_expired THEN
    v_has_access := false;
    v_reason_code := 'TRIAL_EXPIRED';
  ELSE
    CASE v_row.status
      WHEN 'ACTIVE' THEN
        v_has_access := true;
        v_reason_code := CASE
          WHEN v_row.billing_status = 'CANCELLED' THEN 'CANCELLED_PERIOD_END_ACCESS'
          WHEN v_row.billing_status = 'PAST_DUE' THEN 'PAST_DUE_ACCESS_PRESERVED'
          ELSE 'ACTIVE_PAID'
        END;
      WHEN 'TRIAL_ACTIVE' THEN
        v_has_access := true;
        v_reason_code := 'ACTIVE_TRIAL';
      WHEN 'TRIAL_EXPIRED' THEN
        v_has_access := false;
        v_reason_code := 'TRIAL_EXPIRED';
      WHEN 'FROZEN' THEN
        v_has_access := false;
        v_reason_code := 'FROZEN';
      WHEN 'PAUSED' THEN
        v_has_access := false;
        v_reason_code := 'LOCKED';
      WHEN 'LOCKED' THEN
        v_has_access := false;
        v_reason_code := 'LOCKED';
      WHEN 'PENDING' THEN
        v_has_access := false;
        v_reason_code := 'NO_ENTITLEMENT';
      ELSE
        v_has_access := false;
        v_reason_code := 'REVIEW_REQUIRED';
    END CASE;
  END IF;

  RETURN QUERY SELECT
    v_has_access, v_row.product, v_row.plan, v_row.status, v_row.billing_status, v_row.trial_status,
    v_row.trial_ends_at, v_row.current_period_end, v_reason_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hufmanager_access_context_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hufmanager_access_context_v1() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hufmanager_access_context_v1() TO authenticated;

-- Reusable RLS-oriented helper, mirroring has_role(_user_id, _role)'s
-- exact security posture (STABLE SECURITY DEFINER, fixed search_path,
-- takes the user id as a plain argument -- same pattern already reviewed
-- and live for has_role, not a new privilege model). Built now because
-- Phase 3/4 need it to exist; NOT yet wired into any provider-table RLS
-- policy in this migration -- that is Phase 9's own, separate, explicitly
-- scoped patch (see this task's final report for why it is deferred).
CREATE OR REPLACE FUNCTION public.has_hufmanager_access_v1(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.product_entitlements
     WHERE user_id = _user_id
       AND product = 'HUFMANAGER'
       AND plan = 'HUFMANAGER_SLIM'
       AND (
             status = 'ACTIVE'
          OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now()))
           )
  )
$$;

REVOKE ALL ON FUNCTION public.has_hufmanager_access_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_hufmanager_access_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_hufmanager_access_v1(uuid) TO authenticated;
