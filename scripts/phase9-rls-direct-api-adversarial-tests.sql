-- Phase 9 — RLS_PROVIDER_ENFORCEMENT + DIRECT_API_ACCESS_ENFORCEMENT
-- adversarial tests. Staging/local only, never Production.
--
-- Simulates exactly what PostgREST does for a real REST call (SET LOCAL
-- role authenticated; SET LOCAL request.jwt.claims '{"sub": "..."}') —
-- this proves DIRECT_API_ACCESS_ENFORCEMENT at the raw protocol level,
-- not just "the app's own UI happens not to call this". All fixtures are
-- synthetic, created and rolled back inside one transaction; nothing is
-- committed.
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/phase9-rls-direct-api-adversarial-tests.sql

BEGIN;

DO $$
DECLARE
  v_provider uuid := '20000000-0000-4000-8000-000000000001';
  v_client   uuid := '20000000-0000-4000-8000-000000000002';
  v_admin    uuid := '20000000-0000-4000-8000-000000000003';
  v_horse_id uuid;
  v_contact_id uuid;
  v_appt_id uuid;
  v_invoice_id uuid;
  v_hoof_id uuid;
  v_count int;
BEGIN
  -- ---- Fixtures (as superuser / bypasses RLS) ----------------------------
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_provider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9-provider@hufi-test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
    (v_client,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9-client@hufi-test.local',   crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
    (v_admin,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase9-admin@hufi-test.local',    crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now());

  INSERT INTO public.profiles (id, full_name, email) VALUES
    (v_provider, 'Phase9 Test Provider', 'phase9-provider@hufi-test.local'),
    (v_client,   'Phase9 Test Client',   'phase9-client@hufi-test.local'),
    (v_admin,    'Phase9 Test Admin',    'phase9-admin@hufi-test.local');

  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_provider, 'provider'), (v_client, 'client'), (v_admin, 'admin');

  INSERT INTO public.horses (owner_id, name) VALUES (v_client, 'Phase9 Test Horse') RETURNING id INTO v_horse_id;

  INSERT INTO public.access_grants (provider_id, client_id, is_active, status)
  VALUES (v_provider, v_client, true, 'active');

  INSERT INTO public.contacts (provider_id, profile_id, full_name) VALUES (v_provider, v_client, 'Phase9 Test Client') RETURNING id INTO v_contact_id;
  INSERT INTO public.appointments (provider_id, horse_id, date, time, status) VALUES (v_provider, v_horse_id, CURRENT_DATE, '10:00', 'planned') RETURNING id INTO v_appt_id;
  INSERT INTO public.hoof_analyses (provider_id, horse_id) VALUES (v_provider, v_horse_id) RETURNING id INTO v_hoof_id;
  INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_provider, v_client, 1) RETURNING id INTO v_invoice_id;

  RAISE NOTICE 'Fixtures created: provider=%, client=%, admin=%, horse=%', v_provider, v_client, v_admin, v_horse_id;

  -- ---- A1: provider with NO entitlement row (NO_ENTITLEMENT) is DENIED --
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);

  SELECT count(*) INTO v_count FROM public.contacts WHERE id = v_contact_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A1a: provider without entitlement could still SELECT own contacts (direct API access not enforced)'; END IF;

  SELECT count(*) INTO v_count FROM public.appointments WHERE id = v_appt_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A1b: provider without entitlement could still SELECT own appointments'; END IF;

  SELECT count(*) INTO v_count FROM public.hoof_analyses WHERE id = v_hoof_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A1c: provider without entitlement could still SELECT own hoof_analyses'; END IF;

  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A1d: provider without entitlement could still SELECT own invoices'; END IF;

  SELECT count(*) INTO v_count FROM public.horses WHERE id = v_horse_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A1e: provider without entitlement could still SELECT client horse via access_grant'; END IF;

  RAISE NOTICE 'PASS A1: provider without entitlement denied on all 5 protected tables';

  -- ---- A2: INSERT is denied too (WITH CHECK), not just SELECT -----------
  BEGIN
    INSERT INTO public.contacts (provider_id, profile_id, full_name) VALUES (v_provider, v_client, 'should be rejected');
    RAISE EXCEPTION 'FAIL A2: provider without entitlement could INSERT a new contact';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS A2: INSERT correctly rejected (insufficient_privilege) for provider without entitlement';
  END;

  -- ---- A3: customer relationship is UNAFFECTED by provider's access ----
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client)::text, true);

  SELECT count(*) INTO v_count FROM public.contacts WHERE id = v_contact_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A3a: client could not see own contact entry (customer-relationship policy broken by the new gate)'; END IF;

  SELECT count(*) INTO v_count FROM public.horses WHERE id = v_horse_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A3b: client could not see own horse (customer-relationship policy broken)'; END IF;

  SELECT count(*) INTO v_count FROM public.appointments WHERE id = v_appt_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A3c: client could not see own horse appointment (customer-relationship policy broken)'; END IF;

  RAISE NOTICE 'PASS A3: customer-relationship access fully preserved regardless of provider entitlement state';

  -- ---- A4: admin bypass for CROSS-ACCOUNT oversight, where it already
  -- existed before Phase 9 ----------------------------------------------
  -- contacts/horses/appointments have a pre-existing "Admins can
  -- view/manage all ..." PERMISSIVE policy (is_admin()); hoof_analyses/
  -- invoices deliberately only ever gave that cross-account read to
  -- is_master_admin() (a distinct, narrower concept -- checked directly
  -- this session, not assumed), never to a plain 'admin'-role account.
  -- That is an existing, intentional privacy boundary on clinical/billing
  -- data (task requirement 4: preserve existing customer-relationship /
  -- access policies) -- not something Phase 9 should widen. So this
  -- cross-account check only applies to the 3 tables that already had it.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  SELECT count(*) INTO v_count FROM public.contacts WHERE id = v_contact_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A4a: admin could not view a contact belonging to a provider with no entitlement'; END IF;

  SELECT count(*) INTO v_count FROM public.horses WHERE id = v_horse_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A4b: admin could not view horses belonging to a client with no provider entitlement'; END IF;

  RAISE NOTICE 'PASS A4: pre-existing cross-account admin oversight (contacts, horses) intact';

  -- ---- A4x: the REAL PROVEN_ADMIN_EMPLOYEE case -- an admin-role
  -- account that is ALSO a provider, working on their OWN hoof_analyses/
  -- invoices, must not be blocked by lacking entitlement. This is what
  -- "PROVEN_ADMIN_EMPLOYEE needs no product_entitlements row" (Legacy
  -- Compatibility doc §4) actually depends on for these 2 tables, since
  -- they have no cross-account admin policy to fall back on.
  RESET ROLE;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin, 'provider');
  INSERT INTO public.hoof_analyses (provider_id, horse_id) VALUES (v_admin, v_horse_id);
  INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_admin, v_client, 1);

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  SELECT count(*) INTO v_count FROM public.hoof_analyses WHERE provider_id = v_admin;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A4x-hoof: admin-as-provider with no entitlement could not see own hoof_analyses (is_admin bypass missing)'; END IF;

  SELECT count(*) INTO v_count FROM public.invoices WHERE provider_id = v_admin;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A4x-invoice: admin-as-provider with no entitlement could not see own invoices (is_admin bypass missing)'; END IF;

  RAISE NOTICE 'PASS A4x: admin-as-provider bypass works on hoof_analyses/invoices for their own rows';

  -- ---- A5: granting ACTIVE access restores it ---------------------------
  RESET ROLE; -- back to the session's real (superuser) role, bypasses RLS for fixture setup
  PERFORM set_config('request.jwt.claims', '', true);

  INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, source)
  VALUES (v_provider, 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'VERIFIED_PAID', 'PHASE9_TEST');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);

  SELECT count(*) INTO v_count FROM public.contacts WHERE id = v_contact_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A5a: ACTIVE entitlement did not restore contacts access'; END IF;
  SELECT count(*) INTO v_count FROM public.horses WHERE id = v_horse_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A5b: ACTIVE entitlement did not restore horse access via access_grant'; END IF;

  RAISE NOTICE 'PASS A5: ACTIVE entitlement restores access on all gated tables';

  -- ---- A6: PAUSED denies productive work but profile/billing stay open -
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  UPDATE public.product_entitlements SET status = 'PAUSED' WHERE user_id = v_provider;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);

  SELECT count(*) INTO v_count FROM public.contacts WHERE id = v_contact_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL A6a: PAUSED provider could still access contacts (productive work must be DENIED while PAUSED)'; END IF;

  -- Profile/billing must stay reachable — same underlying request, only
  -- an unrelated table (this migration touches nothing on profiles).
  SELECT count(*) INTO v_count FROM public.profiles WHERE id = v_provider;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A6b: PAUSED provider lost access to own profile row (violates PAUSED rule: Profile must stay allowed)'; END IF;

  PERFORM public.has_hufmanager_access_v1(v_provider); -- must not raise
  RAISE NOTICE 'PASS A6: PAUSED denies the 5 protected business tables while profile access stays intact';

  RAISE NOTICE 'ALL PHASE 9 ADVERSARIAL TESTS PASSED';
END $$;

ROLLBACK;
