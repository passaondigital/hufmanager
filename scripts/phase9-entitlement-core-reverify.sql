-- Phase 9 — reproducible re-verification of the entitlement core
-- (T1-T17, T24, T25 from the original staging test matrix in
-- docs/HUFMANAGER_SLIM_ENTITLEMENT_PRODUCTION_READINESS_V1.md §4).
--
-- No harness for this existed on disk (same gap as the legacy
-- classification numbers) — this is a new, persisted, reproducible one.
-- Exercises the REAL entry points, not a re-implementation of their
-- logic: public.hufi_data_ingest_and_project_v1 (same function real
-- CopeCart webhook traffic calls), public.hm_reconcile_period_end_subscriptions_v1,
-- public.hm_reconcile_hufmanager_entitlements_v1. Staging/local only,
-- everything rolled back at the end.
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/phase9-entitlement-core-reverify.sql

BEGIN;

DO $$
DECLARE
  v_t1 uuid := '40000000-0000-4000-8000-000000000001';
  v_t3 uuid := '40000000-0000-4000-8000-000000000003';
  v_t4 uuid := '40000000-0000-4000-8000-000000000004';
  v_t7 uuid := '40000000-0000-4000-8000-000000000007';
  v_t11 uuid := '40000000-0000-4000-8000-000000000011';
  v_t12 uuid := '40000000-0000-4000-8000-000000000012';
  v_t14 uuid := '40000000-0000-4000-8000-000000000014';
  v_t15 uuid := '40000000-0000-4000-8000-000000000015';
  v_t17 uuid := '40000000-0000-4000-8000-000000000017';
  v_t24 uuid := '40000000-0000-4000-8000-000000000024';
  v_t25 uuid := '40000000-0000-4000-8000-000000000025';
  v_res public.hufi_data_ingest_result;
  v_row public.product_entitlements%ROWTYPE;
  v_count int;
  v_issues_before int;
  v_deleted_id uuid;
BEGIN
  -- ---- Fixtures: one profile per subject, all with real emails so the
  -- CopeCart projector's identity resolution (profiles.email lookup)
  -- actually has something to resolve. -----------------------------------
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()
  FROM (VALUES
    (v_t1,'t1-core@hufi-test.local'),(v_t3,'t3-core@hufi-test.local'),(v_t4,'t4-core@hufi-test.local'),
    (v_t7,'t7-core@hufi-test.local'),(v_t11,'t11-core@hufi-test.local'),(v_t12,'t12-core@hufi-test.local'),
    (v_t14,'t14-core@hufi-test.local'),(v_t15,'t15-core@hufi-test.local'),(v_t17,'t17-core@hufi-test.local'),
    (v_t24,'t24-core@hufi-test.local'),(v_t25,'t25-core@hufi-test.local')
  ) AS x(id, email);

  -- ON CONFLICT: some environments' handle_new_user() trigger already
  -- auto-inserts a stub public.profiles row on the auth.users insert above
  -- (confirmed live on a real Production restore) -- an upsert works
  -- either way, a plain INSERT does not.
  INSERT INTO public.profiles (id, full_name, email)
  SELECT id, 'Core Reverify ' || id, email FROM (VALUES
    (v_t1,'t1-core@hufi-test.local'),(v_t3,'t3-core@hufi-test.local'),(v_t4,'t4-core@hufi-test.local'),
    (v_t7,'t7-core@hufi-test.local'),(v_t11,'t11-core@hufi-test.local'),(v_t12,'t12-core@hufi-test.local'),
    (v_t14,'t14-core@hufi-test.local'),(v_t15,'t15-core@hufi-test.local'),(v_t17,'t17-core@hufi-test.local'),
    (v_t24,'t24-core@hufi-test.local'),(v_t25,'t25-core@hufi-test.local')
  ) AS x(id, email)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  -- ==== T1: real payment.made, is_test=false -> ACTIVE / VERIFIED_PAID ==
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t1_paid','payment.made','event','subscription','sub_t1','3a97bd25','ord_t1','txn_t1','sub_t1',
    't1-core@hufi-test.local','T1 Core',49.00,'EUR','paid', false,
    now() - interval '10 minutes', now(), 'sha_t1', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t1 AND product='HUFMANAGER' AND plan='HUFMANAGER_SLIM';
  IF v_row.status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID' THEN
    RAISE EXCEPTION 'FAIL T1: expected ACTIVE/VERIFIED_PAID, got %/%', v_row.status, v_row.billing_status;
  END IF;
  IF NOT public._hm_has_hufmanager_access_v1(v_t1) THEN RAISE EXCEPTION 'FAIL T1: has_hufmanager_access_v1 false for ACTIVE'; END IF;
  RAISE NOTICE 'PASS T1';

  -- ==== T2: same payment retried -> deduped, exactly 1 row ==============
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t1_paid','payment.made','event','subscription','sub_t1','3a97bd25','ord_t1','txn_t1','sub_t1',
    't1-core@hufi-test.local','T1 Core',49.00,'EUR','paid', false,
    now() - interval '10 minutes', now(), 'sha_t1', '{}'::jsonb
  );
  IF v_res.event_inserted IS DISTINCT FROM false THEN RAISE EXCEPTION 'FAIL T2: retry was treated as a new event'; END IF;
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_t1;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T2: retry duplicated the entitlement row (count=%)', v_count; END IF;
  RAISE NOTICE 'PASS T2';

  -- ==== T3: test payment -> zero entitlement rows ========================
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t3_test','payment.made','event','subscription','sub_t3','3a97bd25','ord_t3','txn_t3','sub_t3',
    't3-core@hufi-test.local','T3 Core',49.00,'EUR','paid', true,
    now(), now(), 'sha_t3', '{}'::jsonb
  );
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_t3;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T3: test payment created % entitlement row(s)', v_count; END IF;
  RAISE NOTICE 'PASS T3';

  -- ==== T4: wrong product_id -> lifecycle truth yes, entitlement no =====
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t4_wrongproduct','payment.made','event','subscription','sub_t4','some-other-product','ord_t4','txn_t4','sub_t4',
    't4-core@hufi-test.local','T4 Core',9.00,'EUR','paid', false,
    now(), now(), 'sha_t4', '{}'::jsonb
  );
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE subject_id = v_t4 AND event_name = 'payment_succeeded';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T4: expected 1 lifecycle event regardless of product, got %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_t4;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T4: wrong product still created an entitlement row'; END IF;
  RAISE NOTICE 'PASS T4';

  -- ==== T5: unresolved subject -> no lifecycle row, issue recorded ======
  v_issues_before := (SELECT count(*) FROM public.hm_lifecycle_reconciliation_issues WHERE issue_type = 'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT');
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t5_nobody','payment.made','event','subscription','sub_t5','3a97bd25','ord_t5','txn_t5','sub_t5',
    'nobody-t5@hufi-test.local','Nobody',9.00,'EUR','paid', false,
    now(), now(), 'sha_t5', '{}'::jsonb
  );
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE source_event_id = 'evt_t5_nobody';
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T5: an unresolved subject still produced a lifecycle event'; END IF;
  IF (SELECT count(*) FROM public.hm_lifecycle_reconciliation_issues WHERE issue_type = 'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT') <= v_issues_before THEN
    RAISE EXCEPTION 'FAIL T5: no LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT issue recorded';
  END IF;
  RAISE NOTICE 'PASS T5';

  -- ==== T6: period-end cancellation, future effective_end_date ===========
  -- (reuses T1's subject/subscription, which is ACTIVE)
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t1_cancel_future','payment.recurring.cancelled','event','subscription','sub_t1','3a97bd25','ord_t1','txn_t1c','sub_t1',
    't1-core@hufi-test.local','T1 Core',NULL,'EUR','cancelled', false,
    now(), now(), 'sha_t1c', jsonb_build_object('is_cancelled_for', to_char(current_date + 30, 'YYYY-MM-DD'))
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t1;
  IF v_row.status <> 'ACTIVE' THEN RAISE EXCEPTION 'FAIL T6: access must stay ACTIVE for a future cancellation, got %', v_row.status; END IF;
  IF v_row.billing_status <> 'CANCELLED' THEN RAISE EXCEPTION 'FAIL T6: billing_status must be CANCELLED, got %', v_row.billing_status; END IF;
  IF v_row.current_period_end IS NULL OR v_row.current_period_end::date <> current_date + 30 THEN
    RAISE EXCEPTION 'FAIL T6: current_period_end not set to the cancellation date (got %)', v_row.current_period_end;
  END IF;
  RAISE NOTICE 'PASS T6';

  -- ==== T7: reconciler produces subscription_ended for a PAST cancellation
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t7_paid','payment.made','event','subscription','sub_t7','3a97bd25','ord_t7','txn_t7','sub_t7',
    't7-core@hufi-test.local','T7 Core',49.00,'EUR','paid', false,
    now() - interval '40 days', now(), 'sha_t7', '{}'::jsonb
  );
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t7_cancel_past','payment.recurring.cancelled','event','subscription','sub_t7','3a97bd25','ord_t7','txn_t7c','sub_t7',
    't7-core@hufi-test.local','T7 Core',NULL,'EUR','cancelled', false,
    now() - interval '35 days', now(), 'sha_t7c', jsonb_build_object('is_cancelled_for', to_char(current_date - 2, 'YYYY-MM-DD'))
  );
  PERFORM public.hm_reconcile_period_end_subscriptions_v1(100);
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t7;
  IF v_row.status <> 'FROZEN' THEN RAISE EXCEPTION 'FAIL T7: expected FROZEN after reconciler, got %', v_row.status; END IF;
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE subject_id = v_t7 AND event_name = 'subscription_ended';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T7: expected exactly 1 subscription_ended lifecycle event, got %', v_count; END IF;
  RAISE NOTICE 'PASS T7';

  -- ==== T8: duplicate cancellation replay -> idempotent =================
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t7_cancel_past','payment.recurring.cancelled','event','subscription','sub_t7','3a97bd25','ord_t7','txn_t7c','sub_t7',
    't7-core@hufi-test.local','T7 Core',NULL,'EUR','cancelled', false,
    now() - interval '35 days', now(), 'sha_t7c', jsonb_build_object('is_cancelled_for', to_char(current_date - 2, 'YYYY-MM-DD'))
  );
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE source_event_id = 'evt_t7_cancel_past' AND event_name = 'subscription_cancelled';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T8: duplicate cancellation created % rows, expected 1', v_count; END IF;
  RAISE NOTICE 'PASS T8';

  -- ==== T9: older out-of-order payment cannot reactivate a FROZEN row ===
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t7_old_payment','payment.made','event','subscription','sub_t7_old','3a97bd25','ord_t7o','txn_t7o','sub_t7_old',
    't7-core@hufi-test.local','T7 Core',49.00,'EUR','paid', false,
    now() - interval '39 days', now(), 'sha_t7o', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t7;
  IF v_row.status <> 'FROZEN' THEN RAISE EXCEPTION 'FAIL T9: an out-of-order old payment reactivated a FROZEN row (status=%)', v_row.status; END IF;
  RAISE NOTICE 'PASS T9';

  -- ==== T10: genuinely newer real payment reactivates ====================
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t7_reactivate','payment.made','event','subscription','sub_t7_v2','3a97bd25','ord_t7v2','txn_t7v2','sub_t7_v2',
    't7-core@hufi-test.local','T7 Core',49.00,'EUR','paid', false,
    now(), now(), 'sha_t7v2', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t7;
  IF v_row.status <> 'ACTIVE' OR v_row.external_subscription_id <> 'sub_t7_v2' THEN
    RAISE EXCEPTION 'FAIL T10: expected reactivation to ACTIVE with new subscription id, got status=% sub=%', v_row.status, v_row.external_subscription_id;
  END IF;
  RAISE NOTICE 'PASS T10';

  -- ==== T11: payment_failed -> PAST_DUE, status untouched ================
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t11_paid','payment.made','event','subscription','sub_t11','3a97bd25','ord_t11','txn_t11','sub_t11',
    't11-core@hufi-test.local','T11 Core',49.00,'EUR','paid', false,
    now() - interval '5 days', now(), 'sha_t11', '{}'::jsonb
  );
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t11_failed','payment.failed','event','subscription','sub_t11','3a97bd25','ord_t11f','txn_t11f','sub_t11',
    't11-core@hufi-test.local','T11 Core',49.00,'EUR','failed', false,
    now(), now(), 'sha_t11f', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t11;
  IF v_row.billing_status <> 'PAST_DUE' THEN RAISE EXCEPTION 'FAIL T11: expected billing_status PAST_DUE, got %', v_row.billing_status; END IF;
  IF v_row.status <> 'ACTIVE' THEN RAISE EXCEPTION 'FAIL T11: payment_failed must not change entitlement status, got %', v_row.status; END IF;
  RAISE NOTICE 'PASS T11';

  -- ==== T12/T13: refund / chargeback -> zero outcomes, row untouched ====
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t12_paid','payment.made','event','subscription','sub_t12','3a97bd25','ord_t12','txn_t12','sub_t12',
    't12-core@hufi-test.local','T12 Core',49.00,'EUR','paid', false,
    now() - interval '5 days', now(), 'sha_t12', '{}'::jsonb
  );
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t12_refund','payment.refunded','event','subscription','sub_t12','3a97bd25','ord_t12','txn_t12r','sub_t12',
    't12-core@hufi-test.local','T12 Core',49.00,'EUR','refunded', false,
    now(), now(), 'sha_t12r', '{}'::jsonb
  );
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t12_chargeback','payment.charged_back','event','subscription','sub_t12','3a97bd25','ord_t12','txn_t12cb','sub_t12',
    't12-core@hufi-test.local','T12 Core',49.00,'EUR','charged_back', false,
    now(), now(), 'sha_t12cb', '{}'::jsonb
  );
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE subject_id = v_t12 AND event_name NOT IN ('payment_succeeded');
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T12/T13: refund/chargeback produced % non-payment_succeeded lifecycle event(s)', v_count; END IF;
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t12;
  IF v_row.status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID' THEN
    RAISE EXCEPTION 'FAIL T12/T13: refund/chargeback must leave entitlement untouched, got %/%', v_row.status, v_row.billing_status;
  END IF;
  RAISE NOTICE 'PASS T12/T13';

  -- ==== T14: synthetic trial_started -> TRIAL_ACTIVE, access granted ====
  INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, product, plan)
  VALUES ('trial_started', v_t14, now(), 'copecart', 'evt_t14_trial', 'OBSERVED_EVENT', 'HUFMANAGER', 'HUFMANAGER_SLIM');
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t14;
  IF v_row.status <> 'TRIAL_ACTIVE' THEN RAISE EXCEPTION 'FAIL T14: expected TRIAL_ACTIVE, got %', v_row.status; END IF;
  IF NOT public._hm_has_hufmanager_access_v1(v_t14) THEN RAISE EXCEPTION 'FAIL T14: active trial must grant access'; END IF;
  RAISE NOTICE 'PASS T14';

  -- ==== T15: trial window passed -> stored status unchanged, access denied
  INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, product, plan)
  VALUES ('trial_started', v_t15, now() - interval '20 days', 'copecart', 'evt_t15_trial', 'OBSERVED_EVENT', 'HUFMANAGER', 'HUFMANAGER_SLIM');
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t15;
  IF v_row.status <> 'TRIAL_ACTIVE' THEN RAISE EXCEPTION 'FAIL T15: stored status must stay TRIAL_ACTIVE (event-sourced), got %', v_row.status; END IF;
  IF public._hm_has_hufmanager_access_v1(v_t15) THEN RAISE EXCEPTION 'FAIL T15: expired trial must deny access'; END IF;
  RAISE NOTICE 'PASS T15';

  -- ==== T16: real payment during/after trial -> converts to ACTIVE ======
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t14_convert','payment.made','event','subscription','sub_t14','3a97bd25','ord_t14','txn_t14','sub_t14',
    't14-core@hufi-test.local','T14 Core',49.00,'EUR','paid', false,
    now(), now(), 'sha_t14conv', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t14;
  IF v_row.status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID' OR v_row.trial_status <> 'NONE' THEN
    RAISE EXCEPTION 'FAIL T16: expected ACTIVE/VERIFIED_PAID/trial_status NONE, got %/%/%', v_row.status, v_row.billing_status, v_row.trial_status;
  END IF;
  RAISE NOTICE 'PASS T16';

  -- ==== T17: test payment during a VALID trial does not convert it ======
  INSERT INTO public.hm_lifecycle_events (event_name, subject_id, occurred_at, source, source_event_id, verification_status, product, plan)
  VALUES ('trial_started', v_t17, now(), 'copecart', 'evt_t17_trial', 'OBSERVED_EVENT', 'HUFMANAGER', 'HUFMANAGER_SLIM');
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t17_testpay','payment.made','event','subscription','sub_t17','3a97bd25','ord_t17','txn_t17','sub_t17',
    't17-core@hufi-test.local','T17 Core',49.00,'EUR','paid', true,
    now(), now(), 'sha_t17', '{}'::jsonb
  );
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t17;
  IF v_row.status <> 'TRIAL_ACTIVE' OR v_row.trial_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'FAIL T17: a test payment must not convert a valid trial, got status=% trial_status=%', v_row.status, v_row.trial_status;
  END IF;
  RAISE NOTICE 'PASS T17';

  -- ==== T24: reconciler repairs a deliberately-deleted entitlement row ==
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t24_paid','payment.made','event','subscription','sub_t24','3a97bd25','ord_t24','txn_t24','sub_t24',
    't24-core@hufi-test.local','T24 Core',49.00,'EUR','paid', false,
    now(), now(), 'sha_t24', '{}'::jsonb
  );
  SELECT id INTO v_deleted_id FROM public.product_entitlements WHERE user_id = v_t24;
  DELETE FROM public.product_entitlements WHERE id = v_deleted_id;
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_t24;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T24 setup: delete did not remove the row'; END IF;
  PERFORM public.hm_reconcile_hufmanager_entitlements_v1(100);
  SELECT * INTO v_row FROM public.product_entitlements WHERE user_id = v_t24;
  IF v_row.status <> 'ACTIVE' OR v_row.billing_status <> 'VERIFIED_PAID' THEN
    RAISE EXCEPTION 'FAIL T24: reconciler did not repair the deleted row correctly (status=%, billing=%)', v_row.status, v_row.billing_status;
  END IF;
  RAISE NOTICE 'PASS T24';

  -- ==== T25: writer failure must not lose the lifecycle event ===========
  EXECUTE format(
    'ALTER TABLE public.product_entitlements ADD CONSTRAINT phase9_t25_force_fail CHECK (user_id <> %L) NOT VALID',
    v_t25
  );
  v_issues_before := (SELECT count(*) FROM public.hm_lifecycle_reconciliation_issues WHERE issue_type = 'ENTITLEMENT_PROJECTION_UNEXPECTED_ERROR' AND subject_id = v_t25);
  v_res := public.hufi_data_ingest_and_project_v1(
    'copecart','evt_t25_paid','payment.made','event','subscription','sub_t25','3a97bd25','ord_t25','txn_t25','sub_t25',
    't25-core@hufi-test.local','T25 Core',49.00,'EUR','paid', false,
    now(), now(), 'sha_t25', '{}'::jsonb
  );
  SELECT count(*) INTO v_count FROM public.hm_lifecycle_events WHERE subject_id = v_t25 AND event_name = 'payment_succeeded';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T25: lifecycle event was lost when entitlement projection failed (count=%)', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.product_entitlements WHERE user_id = v_t25;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T25: entitlement row unexpectedly exists despite the forced failure'; END IF;
  IF (SELECT count(*) FROM public.hm_lifecycle_reconciliation_issues WHERE issue_type = 'ENTITLEMENT_PROJECTION_UNEXPECTED_ERROR' AND subject_id = v_t25 AND severity = 'HIGH') <= v_issues_before THEN
    RAISE EXCEPTION 'FAIL T25: no HIGH severity ENTITLEMENT_PROJECTION_UNEXPECTED_ERROR issue recorded';
  END IF;
  ALTER TABLE public.product_entitlements DROP CONSTRAINT phase9_t25_force_fail;
  RAISE NOTICE 'PASS T25';

  RAISE NOTICE 'ENTITLEMENT_CORE_REVERIFY=PASS (T1-T17, T24, T25)';
END $$;

ROLLBACK;
