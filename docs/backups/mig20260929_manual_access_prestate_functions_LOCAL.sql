CREATE OR REPLACE FUNCTION public.get_hufmanager_access_context_v1()
 RETURNS TABLE(has_access boolean, product product_membership_product, plan product_entitlement_plan, entitlement_status product_entitlement_status, billing_status product_billing_status, trial_status product_trial_status, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone, reason_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.has_hufmanager_access_v1()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.product_entitlements
     WHERE user_id = auth.uid()
       AND product = 'HUFMANAGER'
       AND plan = 'HUFMANAGER_SLIM'
       AND (
             status = 'ACTIVE'
          OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now()))
           )
  )
$function$
;
CREATE OR REPLACE FUNCTION public._hm_has_hufmanager_access_v1(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
