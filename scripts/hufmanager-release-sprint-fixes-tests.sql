-- Release-Sprint 28.09.2026: Kleinunternehmer-Rechnung + Termin-Status. NUR lokaler Stack, endet mit ROLLBACK.
--   docker exec -i supabase_db_vnschgjxkzzwzefqlrji psql -U postgres -v ON_ERROR_STOP=1 < scripts/hufmanager-release-sprint-fixes-tests.sql
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO authenticated;
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
VALUES ('00000000-0000-4000-a5a5-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rs-provider@example.test',
        '{"full_name":"RS Provider","role":"provider","signup_app":"hufmanager"}', '{"provider":"email","providers":["email"]}', now(), now(), now());
INSERT INTO public.user_roles(user_id, role) VALUES ('00000000-0000-4000-a5a5-0000000000b1', 'provider') ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a5a5-0000000000b1","role":"authenticated"}', true);
DO $$
DECLARE v_cust uuid; v_horse uuid; v jsonb;
BEGIN
  v := public.create_customer_with_contact('{"full_name":"RS Kunde"}'::jsonb, '{"category":"client"}'::jsonb);
  v_cust := coalesce((v->>'profile_id')::uuid, (v->>'id')::uuid);
  INSERT INTO public.horses(owner_id, name, equine_type) VALUES (v_cust, 'RS Pferd', 'horse') RETURNING id INTO v_horse;

  FOREACH v IN ARRAY ARRAY['"privat"'::jsonb, '"gewerbe"'::jsonb, '"kleinunternehmer"'::jsonb] LOOP
    BEGIN
      PERFORM public.create_invoice_with_items(
        jsonb_build_object('client_id', v_cust, 'provider_id', '00000000-0000-4000-a5a5-0000000000b1', 'horse_id', v_horse,
          'invoice_number', 'RS-' || (v #>> '{}'), 'issue_date', current_date, 'total_amount', 45, 'status', 'draft',
          'payment_method', 'Bar', 'customer_type', v #>> '{}', 'payment_status', 'unpaid'),
        '[{"title":"Barhufbearbeitung","quantity":1,"unit_price":45,"total_price":45}]'::jsonb);
      INSERT INTO r VALUES ('I ' || (v #>> '{}') || ': Rechnung mit Position speicherbar', true, NULL);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO r VALUES ('I ' || (v #>> '{}') || ': Rechnung mit Position speicherbar', false, SQLERRM);
    END;
  END LOOP;
  BEGIN
    PERFORM public.create_invoice_with_items(
      jsonb_build_object('client_id', v_cust, 'provider_id', '00000000-0000-4000-a5a5-0000000000b1', 'invoice_number', 'RS-x',
        'issue_date', current_date, 'total_amount', 45, 'status', 'draft', 'customer_type', 'client'),
      '[{"title":"X","quantity":1,"unit_price":45,"total_price":45}]'::jsonb);
    INSERT INTO r VALUES ('I4 unbekannter Kundentyp weiterhin abgelehnt', false, 'NO_ERROR');
  EXCEPTION WHEN check_violation THEN INSERT INTO r VALUES ('I4 unbekannter Kundentyp weiterhin abgelehnt', true, NULL);
    WHEN OTHERS THEN INSERT INTO r VALUES ('I4 unbekannter Kundentyp weiterhin abgelehnt', false, SQLERRM);
  END;

  BEGIN
    INSERT INTO public.appointments(horse_id, provider_id, client_id, date, time, service_type, status)
    VALUES (v_horse, '00000000-0000-4000-a5a5-0000000000b1', v_cust, current_date + 1, '09:00', 'Barhufbearbeitung', 'planned');
    INSERT INTO r VALUES ('A1 Termin mit Status planned (neuer Frontend-Wert) speicherbar', true, NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO r VALUES ('A1 Termin mit Status planned (neuer Frontend-Wert) speicherbar', false, SQLERRM);
  END;
  BEGIN
    INSERT INTO public.appointments(horse_id, provider_id, client_id, date, time, service_type, status)
    VALUES (v_horse, '00000000-0000-4000-a5a5-0000000000b1', v_cust, current_date + 1, '10:00', 'Barhufbearbeitung', 'scheduled');
    INSERT INTO r VALUES ('A2 alter Wert scheduled wird vom Trigger abgelehnt (Ursache des Bugs)', false, 'NO_ERROR');
  EXCEPTION WHEN OTHERS THEN INSERT INTO r VALUES ('A2 alter Wert scheduled wird vom Trigger abgelehnt (Ursache des Bugs)', SQLERRM LIKE 'Invalid appointment status%', SQLERRM);
  END;
END $$;
RESET ROLE;
SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
