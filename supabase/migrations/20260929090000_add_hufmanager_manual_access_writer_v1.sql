-- HufManager Slim — kanonischer Manual-Access-Writer (Owner-Grants) v1
--
-- STATUS: VORBEREITET, NICHT AUF PROD. Business-Matrix vom Owner freigegeben (28.09.2026);
-- wartet auf ausdrückliche PROD-Freigabe. Bericht: docs/billing/OVERRIDE_ENTITLEMENTS_AUDIT_2026-09-28.md
--
-- Zweck: Lifetime / Barzahlung (befristet) / Beta bewusst und auditierbar vergeben bzw. entziehen.
--   Admin-Aktion → hm_lifecycle_events (Audit, source=admin) → dieser Writer → product_entitlements
--   → _hm_has_hufmanager_access_v1 / has_hufmanager_access_v1 / get_hufmanager_access_context_v1.
--
-- Regeln:
--   * Grant-Arten fest verdrahtet: MANUAL_LIFETIME (ohne Ende), MANUAL_FIXED_TERM + BETA_ACCESS (Ende Pflicht,
--     > jetzt, ≤ 5 Jahre), REVOKE_MANUAL_ACCESS.
--     Produkt/Plan sind Konstanten (HUFMANAGER / HUFMANAGER_SLIM), keine Strings vom Aufrufer.
--   * billing_status bleibt NONE, billing_provider = 'manual' — ein Manual Grant ist NIE VERIFIED_PAID.
--   * Bezahlte Entitlements (CopeCart / PROVEN_PAID) werden weder überschrieben noch entzogen.
--   * Nur Admins (is_admin des Akteurs), kein Self-Grant, Ziel muss existierender, nicht gelöschter Provider sein.
--   * Idempotent: identischer Grant auf identischem Zustand → 'unchanged', kein Event, keine Dublette
--     (product_entitlements UNIQUE(user_id, product, plan)).
--   * Revoke → status LOCKED, Historie (Events + Metadaten) bleibt.
--   * Befristung wird im Gate exakt durchgesetzt (current_period_end bei billing_provider='manual').
--
-- Der bestehende Projektor hm_project_hufmanager_entitlement_v1 bleibt UNVERÄNDERT: die zwei neuen
-- Event-Namen landen dort im ELSE-Zweig (No-Op), der Reconciler listet sie nicht. Einziger Writer für
-- diese Events ist hm_set_hufmanager_manual_access_v1 (Event + Entitlement in derselben Transaktion).

BEGIN;

ALTER TYPE public.hm_lifecycle_event_name ADD VALUE IF NOT EXISTS 'manual_access_granted';
ALTER TYPE public.hm_lifecycle_event_name ADD VALUE IF NOT EXISTS 'manual_access_revoked';

-- ---------------------------------------------------------------------------
-- Kern-Writer (nur service_role / Admin-Wrapper)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hm_set_hufmanager_manual_access_v1(
  p_user_id uuid,
  p_grant_type text,
  p_valid_until timestamptz,
  p_reason text,
  p_actor_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_now timestamptz := now();
  v_reason text := left(btrim(coalesce(p_reason, '')), 200);
  v_row public.product_entitlements%ROWTYPE;
  v_found boolean;
  v_is_paid boolean;
  v_is_manual boolean;
  v_event_id uuid;
  v_source_event_id text := 'hm-manual-access:' || gen_random_uuid()::text;
BEGIN
  IF p_grant_type IS NULL OR p_grant_type NOT IN
     ('MANUAL_LIFETIME', 'MANUAL_FIXED_TERM', 'BETA_ACCESS', 'REVOKE_MANUAL_ACCESS') THEN
    RAISE EXCEPTION 'invalid_grant_type' USING ERRCODE = '22023';
  END IF;

  IF p_actor_id IS NULL OR NOT public.is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'actor_not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'target_missing' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = p_actor_id THEN
    RAISE EXCEPTION 'self_grant_forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'target_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'provider') THEN
    RAISE EXCEPTION 'target_not_provider' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'target_deleted' USING ERRCODE = '22023';
  END IF;

  IF length(v_reason) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  IF v_reason ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'reason_contains_email' USING ERRCODE = '22023';
  END IF;

  CASE p_grant_type
    WHEN 'MANUAL_LIFETIME', 'REVOKE_MANUAL_ACCESS' THEN
      IF p_valid_until IS NOT NULL THEN
        RAISE EXCEPTION 'valid_until_not_allowed' USING ERRCODE = '22023';
      END IF;
    WHEN 'MANUAL_FIXED_TERM', 'BETA_ACCESS' THEN
      -- Owner-Entscheidung 28.09.: Barzahlung UND Beta nur mit explizitem Enddatum (Beta = Variante B).
      IF p_valid_until IS NULL OR p_valid_until <= v_now OR p_valid_until > v_now + interval '5 years' THEN
        RAISE EXCEPTION 'valid_until_invalid' USING ERRCODE = '22023';
      END IF;
  END CASE;

  SELECT * INTO v_row
    FROM public.product_entitlements
   WHERE user_id = p_user_id AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM'
   FOR UPDATE;
  v_found := FOUND;

  -- Bezahlt = echte Billing-Evidenz. Legacy-Manual-Grants (Backfill) tragen fälschlich VERIFIED_PAID
  -- und gelten hier ausdrücklich als manuell.
  -- coalesce: billing_provider ist bei Trial-/Legacy-Zeilen NULL → NULL darf nie als „wahr/unklar“ durchrutschen.
  v_is_paid := coalesce(v_found AND (
       v_row.billing_provider IS NOT DISTINCT FROM 'copecart'
    OR (v_row.billing_status IN ('VERIFIED_PAID', 'PAST_DUE', 'CANCELLED')
        AND v_row.source IS DISTINCT FROM 'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT')
  ), false);
  v_is_manual := coalesce(v_found AND (
       v_row.billing_provider IS NOT DISTINCT FROM 'manual'
    OR v_row.source IS NOT DISTINCT FROM 'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT'
  ), false);

  IF p_grant_type = 'REVOKE_MANUAL_ACCESS' THEN
    IF NOT v_is_manual OR v_is_paid THEN
      RETURN 'skipped_not_manual';
    END IF;
    IF v_row.status = 'LOCKED' AND v_row.billing_provider IS NOT DISTINCT FROM 'manual' THEN
      RETURN 'unchanged';
    END IF;

    INSERT INTO public.hm_lifecycle_events (
      event_name, subject_id, occurred_at, source, source_event_id,
      product, plan, metadata, verification_status, domain_event_key
    ) VALUES (
      'manual_access_revoked', p_user_id, v_now, 'admin', v_source_event_id,
      'HUFMANAGER', 'HUFMANAGER_SLIM',
      jsonb_build_object('producer', 'hm_set_hufmanager_manual_access_v1', 'grant_type', p_grant_type,
                         'reason', v_reason, 'actor_id', p_actor_id,
                         'previous_status', v_row.status, 'previous_source', v_row.source),
      'OBSERVED_EVENT', v_source_event_id
    )
    RETURNING id INTO v_event_id;

    UPDATE public.product_entitlements
       SET status = 'LOCKED',
           billing_status = 'NONE',
           billing_provider = 'manual',
           current_period_end = LEAST(coalesce(current_period_end, v_now), v_now),
           last_applied_event_occurred_at = v_now,
           last_applied_event_id = v_event_id,
           metadata = metadata || jsonb_build_object('manual_grant_type', 'REVOKED', 'manual_revoked_at', v_now)
     WHERE id = v_row.id;

    RETURN 'manual_access_revoked';
  END IF;

  -- ---- Grant ----
  IF v_is_paid THEN
    RETURN 'skipped_paid_entitlement';
  END IF;

  IF v_found AND v_row.billing_provider IS NOT DISTINCT FROM 'manual' AND v_row.status = 'ACTIVE'
     AND v_row.metadata->>'manual_grant_type' = p_grant_type
     AND v_row.current_period_end IS NOT DISTINCT FROM p_valid_until THEN
    RETURN 'unchanged';
  END IF;

  INSERT INTO public.hm_lifecycle_events (
    event_name, subject_id, occurred_at, source, source_event_id,
    product, plan, metadata, verification_status, domain_event_key
  ) VALUES (
    'manual_access_granted', p_user_id, v_now, 'admin', v_source_event_id,
    'HUFMANAGER', 'HUFMANAGER_SLIM',
    jsonb_build_object('producer', 'hm_set_hufmanager_manual_access_v1', 'grant_type', p_grant_type,
                       'valid_from', v_now, 'valid_until', p_valid_until,
                       'reason', v_reason, 'actor_id', p_actor_id,
                       'previous_status', CASE WHEN v_found THEN v_row.status::text END,
                       'previous_source', CASE WHEN v_found THEN v_row.source END),
    'OBSERVED_EVENT', v_source_event_id
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.product_entitlements AS pe (
    user_id, product, plan, status, trial_status, billing_status, billing_provider,
    current_period_start, current_period_end,
    last_applied_event_occurred_at, last_applied_event_id,
    source, migration_version, metadata
  ) VALUES (
    p_user_id, 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'NONE', 'NONE', 'manual',
    v_now, p_valid_until,
    v_now, v_event_id,
    'MANUAL_GRANT', 'hufmanager-manual-access-v1',
    jsonb_build_object('manual_grant_type', p_grant_type, 'manual_granted_at', v_now)
  )
  ON CONFLICT (user_id, product, plan) DO UPDATE
     SET status = 'ACTIVE',
         trial_status = CASE WHEN pe.trial_status = 'ACTIVE' THEN 'NONE'::public.product_trial_status ELSE pe.trial_status END,
         billing_status = 'NONE',
         billing_provider = 'manual',
         current_period_start = v_now,
         current_period_end = p_valid_until,
         last_applied_event_occurred_at = v_now,
         last_applied_event_id = v_event_id,
         source = 'MANUAL_GRANT',
         migration_version = 'hufmanager-manual-access-v1',
         metadata = pe.metadata || jsonb_build_object('manual_grant_type', p_grant_type, 'manual_granted_at', v_now);

  RETURN 'manual_access_granted';
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Admin-Wrapper für Mission Control (Akteur = auth.uid(), nie vom Client)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(
  p_user_id uuid,
  p_grant_type text,
  p_valid_until timestamptz,
  p_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN public.hm_set_hufmanager_manual_access_v1(p_user_id, p_grant_type, p_valid_until, p_reason, auth.uid());
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(uuid, text, timestamptz, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Gates: befristete Manual Grants enden exakt an current_period_end.
-- Einzige Änderung ggü. PROD: zusätzliche Bedingung nur für billing_provider='manual'
-- (heute 0 Zeilen mit billing_provider gesetzt → kein Effekt auf Bestand).
-- ---------------------------------------------------------------------------
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
             (status = 'ACTIVE'
              AND (billing_provider IS DISTINCT FROM 'manual' OR current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now()))
           )
  )
$function$;

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
             (status = 'ACTIVE'
              AND (billing_provider IS DISTINCT FROM 'manual' OR current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now()))
           )
  )
$function$;

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
        IF v_row.billing_provider = 'manual' THEN
          IF v_row.current_period_end IS NOT NULL AND v_row.current_period_end <= now() THEN
            v_has_access := false;
            v_reason_code := 'LOCKED';
          ELSE
            v_has_access := true;
            v_reason_code := 'ACTIVE_MANUAL';
          END IF;
        ELSE
          v_has_access := true;
          v_reason_code := CASE
            WHEN v_row.billing_status = 'CANCELLED' THEN 'CANCELLED_PERIOD_END_ACCESS'
            WHEN v_row.billing_status = 'PAST_DUE' THEN 'PAST_DUE_ACCESS_PRESERVED'
            ELSE 'ACTIVE_PAID'
          END;
        END IF;
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
$function$;

COMMIT;
