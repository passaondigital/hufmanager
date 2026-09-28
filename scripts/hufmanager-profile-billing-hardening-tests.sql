-- P2 Hardening (20260929100000): Billing-/Access-Felder in profiles gegen Nicht-Admin-Updates.
-- Aufruf (lokaler Stack): docker exec -i supabase_db_vnschgjxkzzwzefqlrji psql -U postgres -v ON_ERROR_STOP=1 < scripts/hufmanager-profile-billing-hardening-tests.sql
-- Vor der Migration ausgeführt = Negativkontrolle (H1–H3 FAIL erwartet). Endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO authenticated;
CREATE FUNCTION pg_temp.mk_user(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta,
          '{"provider":"email","providers":["email"]}', now(), now(), now());
$$;
SELECT pg_temp.mk_user('00000000-0000-4000-9100-0000000000a1', 'hd-admin@example.invalid', '{"full_name":"HD Admin","role":"provider"}');
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-9100-0000000000a1', 'admin') ON CONFLICT DO NOTHING;
SELECT pg_temp.mk_user('00000000-0000-4000-9100-0000000000d1', 'hd-prov@example.invalid', '{"full_name":"HD Prov","role":"provider","signup_app":"hufmanager"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9100-0000000000c1', 'hd-client@example.invalid', '{"full_name":"HD Client","role":"client"}');
INSERT INTO public.access_grants (provider_id, client_id, status) VALUES ('00000000-0000-4000-9100-0000000000d1', '00000000-0000-4000-9100-0000000000c1', 'active') ON CONFLICT DO NOTHING;
UPDATE public.profiles SET access_valid_until = NULL, copecart_subscription_id = NULL, is_manually_managed = false, force_password_reset = true
 WHERE id IN ('00000000-0000-4000-9100-0000000000d1', '00000000-0000-4000-9100-0000000000c1');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9100-0000000000d1","role":"authenticated"}', true);
UPDATE public.profiles SET access_valid_until = '2099-12-31', copecart_subscription_id = 'fake-sub', is_manually_managed = true,
       signup_app = 'hufiapp', vault_plan = 'unlimited', vault_plan_status = 'active', suspended_reason = 'x',
       full_name = 'HD Prov Neu', force_password_reset = false, plan_override = 'lifetime_grant'
 WHERE id = '00000000-0000-4000-9100-0000000000d1';
UPDATE public.profiles SET access_valid_until = '2099-12-31', copecart_subscription_id = 'fake-sub-c'
 WHERE id = '00000000-0000-4000-9100-0000000000c1';
RESET ROLE;

INSERT INTO r SELECT 'H1 Self-Update access_valid_until/copecart_subscription_id/is_manually_managed wirkungslos',
  access_valid_until IS NULL AND copecart_subscription_id IS NULL AND NOT is_manually_managed,
  coalesce(access_valid_until::text,'-') || ' ' || coalesce(copecart_subscription_id,'-') FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';
INSERT INTO r SELECT 'H2 Self-Update signup_app/vault_*/suspended_reason wirkungslos',
  signup_app = 'hufmanager' AND vault_plan IS DISTINCT FROM 'unlimited' AND vault_plan_status IS DISTINCT FROM 'active' AND suspended_reason IS NULL,
  coalesce(signup_app,'-') FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';
INSERT INTO r SELECT 'H3 Provider ändert Billing-Felder eines verbundenen Kunden → wirkungslos',
  access_valid_until IS NULL AND copecart_subscription_id IS NULL, '' FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000c1';
INSERT INTO r SELECT 'H4 bestehender Schutz plan_override bleibt', plan_override IS NULL, coalesce(plan_override,'-') FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';
INSERT INTO r SELECT 'H5 legitime Self-Updates (Name, force_password_reset) funktionieren', full_name = 'HD Prov Neu' AND NOT force_password_reset, ''
  FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9100-0000000000a1","role":"authenticated"}', true);
UPDATE public.profiles SET access_valid_until = '2027-01-15', copecart_subscription_id = 'admin-set', is_manually_managed = true
 WHERE id = '00000000-0000-4000-9100-0000000000d1';
RESET ROLE;
INSERT INTO r SELECT 'H6 Admin darf Felder setzen (Mission Control)', access_valid_until = '2027-01-15' AND copecart_subscription_id = 'admin-set' AND is_manually_managed, ''
  FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';

SELECT set_config('request.jwt.claims', '', true);
UPDATE public.profiles SET copecart_subscription_id = 'service-set' WHERE id = '00000000-0000-4000-9100-0000000000d1';
INSERT INTO r SELECT 'H7 Service-Role/Webhook (kein JWT) darf Felder setzen', copecart_subscription_id = 'service-set', ''
  FROM public.profiles WHERE id = '00000000-0000-4000-9100-0000000000d1';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
