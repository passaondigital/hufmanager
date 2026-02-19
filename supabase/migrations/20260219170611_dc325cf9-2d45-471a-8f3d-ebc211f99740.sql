
-- 1. Create missing profile for Pferdebesitzer demo account
INSERT INTO public.profiles (id, email, full_name, readable_id, has_logged_in)
VALUES ('00787f97-7d74-4ff7-8316-c7801afdc47c', 'pferdebesitzer.hufmanager@gmail.com', 'Demo Pferdebesitzer', 'KID-DEMO01', true)
ON CONFLICT (id) DO UPDATE SET readable_id = 'KID-DEMO01', full_name = 'Demo Pferdebesitzer';

-- 2. Fix Mitarbeiter readable_id
UPDATE public.profiles 
SET readable_id = 'EID-DEMO01'
WHERE id = '76224f11-043d-48ee-a3c8-5b18927d1ab9';

-- 3. Create access_grant so Pferdebesitzer is connected to Provider
INSERT INTO public.access_grants (provider_id, client_id, is_active, can_view_basic, can_view_medical, can_create_appointments, status)
VALUES ('ecb7497b-8c60-493e-9da0-b2bd71d3001e', '00787f97-7d74-4ff7-8316-c7801afdc47c', true, true, true, true, 'active')
ON CONFLICT DO NOTHING;
