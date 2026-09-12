-- Phase 9 — legacy backfill function tests. Staging/local only.
-- Verifies: correct per-class mapping, one-shot cutover boundary,
-- idempotency (safe to call twice), and that NO_EVIDENCE never gets a row.
-- All fixtures synthetic, rolled back at the end.

BEGIN;

DO $$
DECLARE
  v_cutover timestamptz := now();
  v_paid uuid := '30000000-0000-4000-8000-000000000001';
  v_manual uuid := '30000000-0000-4000-8000-000000000002';
  v_trial uuid := '30000000-0000-4000-8000-000000000003';
  v_ambiguous uuid := '30000000-0000-4000-8000-000000000004';
  v_no_evidence uuid := '30000000-0000-4000-8000-000000000005';
  v_suspended uuid := '30000000-0000-4000-8000-000000000006';
  v_post_cutover uuid := '30000000-0000-4000-8000-000000000007';
  v_row record;
  v_count int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9-backfill-' || id || '@hufi-test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()
  FROM (VALUES (v_paid),(v_manual),(v_trial),(v_ambiguous),(v_no_evidence),(v_suspended),(v_post_cutover)) AS t(id);

  -- ON CONFLICT: some environments' handle_new_user() trigger already
  -- auto-inserts a stub public.profiles row on the auth.users insert above
  -- (confirmed live on a real Production restore) -- an upsert works
  -- either way, a plain INSERT does not.
  INSERT INTO public.profiles (id, full_name, email, created_at, subscription_status, subscription_plan, plan_override, copecart_subscription_id, trial_started_at, trial_ends_at, is_suspended)
  VALUES
    (v_paid,       'Backfill Paid',       'p@hufi-test.local', v_cutover - interval '30 days', 'active',   'starter', NULL, 'sub_real_123', NULL, NULL, false),
    (v_manual,     'Backfill Manual',     'm@hufi-test.local', v_cutover - interval '30 days', 'active',   'pro',     'manual_cash_1y', NULL, NULL, NULL, false),
    (v_trial,      'Backfill Trial',      't@hufi-test.local', v_cutover - interval '30 days', 'trialing', 'starter', NULL, NULL, v_cutover - interval '5 days', v_cutover + interval '25 days', false),
    (v_ambiguous,  'Backfill Ambiguous',  'a@hufi-test.local', v_cutover - interval '30 days', 'active',   'starter', NULL, NULL, NULL, NULL, false),
    (v_no_evidence,'Backfill NoEvidence', 'n@hufi-test.local', v_cutover - interval '30 days', 'trialing', 'starter', 'copecart_starter', NULL, v_cutover - interval '200 days', v_cutover - interval '170 days', false),
    (v_suspended,  'Backfill Suspended',  's@hufi-test.local', v_cutover - interval '30 days', 'active',   'starter', NULL, NULL, NULL, NULL, true),
    (v_post_cutover,'Backfill PostCutover','pc@hufi-test.local', v_cutover + interval '1 day', 'active',  'starter', NULL, NULL, NULL, NULL, false)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, email = EXCLUDED.email, created_at = EXCLUDED.created_at,
    subscription_status = EXCLUDED.subscription_status, subscription_plan = EXCLUDED.subscription_plan,
    plan_override = EXCLUDED.plan_override, copecart_subscription_id = EXCLUDED.copecart_subscription_id,
    trial_started_at = EXCLUDED.trial_started_at, trial_ends_at = EXCLUDED.trial_ends_at,
    is_suspended = EXCLUDED.is_suspended;

  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'provider' FROM (VALUES (v_paid),(v_manual),(v_trial),(v_ambiguous),(v_no_evidence),(v_suspended),(v_post_cutover)) AS t(id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ---- Dry run must not write anything -----------------------------------
  PERFORM * FROM public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(v_cutover, true);
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id IN (v_paid,v_manual,v_trial,v_ambiguous,v_no_evidence,v_suspended,v_post_cutover);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: dry_run=true wrote % rows (must write zero)', v_count; END IF;
  RAISE NOTICE 'PASS: dry_run writes nothing';

  -- ---- Real run: verify per-class mapping --------------------------------
  FOR v_row IN SELECT * FROM public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(v_cutover, false)
             WHERE provider_id IN (v_paid,v_manual,v_trial,v_ambiguous,v_no_evidence,v_suspended,v_post_cutover)
  LOOP
    IF v_row.provider_id = v_paid AND (v_row.class <> 'PROVEN_PAID' OR v_row.entitlement_status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID') THEN
      RAISE EXCEPTION 'FAIL: PROVEN_PAID mapping wrong: %', v_row;
    END IF;
    IF v_row.provider_id = v_manual AND (v_row.class <> 'PROVEN_MANUAL_GRANT' OR v_row.entitlement_status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID') THEN
      RAISE EXCEPTION 'FAIL: PROVEN_MANUAL_GRANT mapping wrong: %', v_row;
    END IF;
    IF v_row.provider_id = v_trial AND (v_row.class <> 'PROVEN_TRIAL' OR v_row.entitlement_status <> 'ACTIVE' OR v_row.billing_status <> 'NONE') THEN
      RAISE EXCEPTION 'FAIL: PROVEN_TRIAL mapping wrong: %', v_row;
    END IF;
    IF v_row.provider_id = v_ambiguous AND (v_row.class <> 'AMBIGUOUS_ACTIVE_ONLY' OR v_row.entitlement_status <> 'ACTIVE' OR v_row.billing_status <> 'UNKNOWN_BILLING_STATE') THEN
      RAISE EXCEPTION 'FAIL: AMBIGUOUS_ACTIVE_ONLY mapping wrong: %', v_row;
    END IF;
    IF v_row.provider_id = v_no_evidence AND v_row.action <> 'SKIPPED_NO_EVIDENCE' THEN
      RAISE EXCEPTION 'FAIL: NO_EVIDENCE was not skipped: %', v_row;
    END IF;
    IF v_row.provider_id = v_suspended AND (v_row.class <> 'SUSPENDED' OR v_row.entitlement_status <> 'LOCKED') THEN
      RAISE EXCEPTION 'FAIL: SUSPENDED mapping wrong: %', v_row;
    END IF;
    IF v_row.provider_id = v_post_cutover THEN
      RAISE EXCEPTION 'FAIL: post-cutover account must never be returned by the backfill at all: %', v_row;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: all 6 pre-cutover classes mapped correctly, post-cutover account untouched';

  -- ---- NO_EVIDENCE must truly have zero row, post-cutover must have zero row
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_no_evidence;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: NO_EVIDENCE account got an entitlement row after all'; END IF;
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_post_cutover;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: post-cutover account got an entitlement row (one-shot boundary violated)'; END IF;
  RAISE NOTICE 'PASS: NO_EVIDENCE and post-cutover both correctly have zero entitlement rows';

  -- ---- Idempotency: running again must not duplicate or error -----------
  PERFORM * FROM public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(v_cutover, false);
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_paid;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL: second backfill run duplicated a row for PROVEN_PAID (count=%)', v_count; END IF;
  RAISE NOTICE 'PASS: second run is idempotent, no duplicate rows';

  RAISE NOTICE 'ALL LEGACY BACKFILL TESTS PASSED';
END $$;

ROLLBACK;
