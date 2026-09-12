-- Phase 9 — dedicated public.invoices RLS test matrix (full CRUD).
-- invoices is part of the new protection surface (RLS_PROVIDER_ENFORCEMENT);
-- this covers every path named in the task, not just a spot check.
-- Staging/local only, rolled back at the end.

BEGIN;

DO $$
DECLARE
  v_provider uuid := '60000000-0000-4000-8000-000000000001'; -- owns the invoice, no entitlement at first
  v_foreign_provider uuid := '60000000-0000-4000-8000-000000000002'; -- a different provider, never entitled
  v_client uuid := '60000000-0000-4000-8000-000000000003'; -- the invoice's client_id
  v_master_admin_email text := 'phase9-master-admin@hufi-test.local';
  v_master_admin uuid := '60000000-0000-4000-8000-000000000004';
  v_invoice_id uuid;
  v_count int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_provider, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','phase9-inv-provider@hufi-test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
    (v_foreign_provider, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','phase9-inv-foreign@hufi-test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
    (v_client, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','phase9-inv-client@hufi-test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
    (v_master_admin, '00000000-0000-0000-0000-000000000000','authenticated','authenticated', v_master_admin_email, crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now());

  INSERT INTO public.profiles (id, full_name, email) VALUES
    (v_provider, 'Inv Provider', 'phase9-inv-provider@hufi-test.local'),
    (v_foreign_provider, 'Inv Foreign Provider', 'phase9-inv-foreign@hufi-test.local'),
    (v_client, 'Inv Client', 'phase9-inv-client@hufi-test.local'),
    (v_master_admin, 'Inv Master Admin', v_master_admin_email);

  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_provider, 'provider'), (v_foreign_provider, 'provider'), (v_client, 'client');

  -- master_admins is keyed by email, not user_id (see is_master_admin()).
  INSERT INTO public.master_admins (email) VALUES (v_master_admin_email)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_provider, v_client, 42)
    RETURNING id INTO v_invoice_id;

  -- ==== 1. Provider ohne Access liest eigene Invoice -> DENIED ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);

  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL 1: provider without entitlement could SELECT own invoice'; END IF;
  RAISE NOTICE 'PASS 1: provider without access DENIED on own invoice (SELECT)';

  -- ==== 2. INSERT denied without access ===================================
  BEGIN
    INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_provider, v_client, 5);
    RAISE EXCEPTION 'FAIL 2: provider without entitlement could INSERT an invoice';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 2: INSERT denied without access';
  END;

  -- ==== 3. fremder Provider -> DENIED (regardless of entitlement) =======
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_foreign_provider)::text, true);
  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL 3: a foreign provider could see another provider''s invoice'; END IF;
  RAISE NOTICE 'PASS 3: foreign provider DENIED (tenant isolation, pre-existing, unaffected)';

  -- ==== 4. Customer-Pfad: Client sieht eigene Invoice, unabhängig vom
  -- Entitlement-Status des Providers (bestehendes Verhalten) ==============
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client)::text, true);
  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL 4: client could not see own invoice (customer-relationship policy broken)'; END IF;
  RAISE NOTICE 'PASS 4: client sees own invoice regardless of provider entitlement (unaffected)';

  -- ==== 5. Admin-Pfad: nur is_master_admin() hatte hier je Cross-Account-
  -- Zugriff (kein plain 'admin' -- siehe HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §5).
  -- Phase 9 erhaelt genau diese bestehende Grenze. ========================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_master_admin)::text, true);
  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL 5: master_admin could not view a provider''s invoice without entitlement (pre-existing path)'; END IF;
  RAISE NOTICE 'PASS 5: master_admin cross-account read intact';

  -- ==== 6. ACTIVE entitlement restores full CRUD for the owning provider =
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, source)
  VALUES (v_provider, 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'VERIFIED_PAID', 'PHASE9_INVOICE_TEST');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);

  SELECT count(*) INTO v_count FROM public.invoices WHERE id = v_invoice_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL 6a: ACTIVE entitlement did not restore SELECT on own invoice'; END IF;

  UPDATE public.invoices SET notes = 'updated by test' WHERE id = v_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL 6b: ACTIVE entitlement did not restore UPDATE on own invoice'; END IF;

  INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_provider, v_client, 7);
  RAISE NOTICE 'PASS 6: ACTIVE entitlement restores SELECT/UPDATE/INSERT for the owning provider';

  -- ==== 7. DELETE: only if an existing permissive policy allows it at all
  -- ("Providers can delete own invoices" -- has_role(provider) AND provider_id=auth.uid()) --
  -- restrictive gate must not block it once entitled, and must have
  -- blocked it before (re-verify the before/after symmetry explicitly). ==
  DELETE FROM public.invoices WHERE id = v_invoice_id;
  IF FOUND THEN
    RAISE NOTICE 'PASS 7: DELETE allowed for the owning provider with ACTIVE entitlement';
  ELSE
    RAISE EXCEPTION 'FAIL 7: DELETE unexpectedly blocked for an entitled owning provider';
  END IF;

  -- ==== 8. Re-confirm DELETE is denied again once entitlement is removed
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  DELETE FROM public.product_entitlements WHERE user_id = v_provider;
  INSERT INTO public.invoices (provider_id, client_id, total_amount) VALUES (v_provider, v_client, 3) RETURNING id INTO v_invoice_id;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_provider)::text, true);
  DELETE FROM public.invoices WHERE id = v_invoice_id;
  IF FOUND THEN RAISE EXCEPTION 'FAIL 8: DELETE succeeded for a provider with no entitlement'; END IF;
  RAISE NOTICE 'PASS 8: DELETE denied again once entitlement is gone';

  RAISE NOTICE 'INVOICE_RLS_TESTS=PASS';
END $$;

ROLLBACK;
