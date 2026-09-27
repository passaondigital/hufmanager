-- Testumgebung für den hufi-agent-BOLA-Hotfix. Setzt auf
-- scripts/appointment-guard-replica-schema.sql auf (Wegwerf-Postgres!).
-- RLS-Policies wörtlich aus PROD (vnschgjxkzzwzefqlrji, gelesen 27.09.2026).
\set ON_ERROR_STOP 1
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'throwaway';
GRANT anon, authenticated, service_role TO authenticator;

ALTER TABLE public.horses ADD CONSTRAINT horses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN readable_id text, ADD COLUMN phone text, ADD COLUMN user_type text;
ALTER TABLE public.horses ADD COLUMN eqid text, ADD COLUMN breed text, ADD COLUMN birth_year int, ADD COLUMN gender text,
  ADD COLUMN color text, ADD COLUMN height_cm int, ADD COLUMN hoof_type text, ADD COLUMN shoeing_interval int,
  ADD COLUMN special_notes text, ADD COLUMN health_status text;
CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid, client_id uuid REFERENCES public.profiles(id),
  horse_id uuid REFERENCES public.horses(id), invoice_number text, total_amount numeric, payment_status text, created_at timestamptz DEFAULT now());
CREATE TABLE public.partner_treatment_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), horse_id uuid, partner_id uuid,
  treatment_date date, title text, findings text, notes text, partner_type text, visible_to_pid boolean DEFAULT true);

ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Horse owner full access" ON public.horses FOR ALL USING (owner_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Admins can manage all horses" ON public.horses FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Provider can view client horses timed" ON public.horses FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
  SELECT 1 FROM access_grants ag WHERE ag.client_id = horses.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true
    AND ag.status = 'active' AND (ag.valid_until IS NULL OR ag.valid_until > now())));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Providers can view connected clients" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'provider'::app_role)
  AND (created_by_provider_id = auth.uid() OR EXISTS (SELECT 1 FROM access_grants ag WHERE ag.client_id = profiles.id
    AND ag.provider_id = auth.uid() AND ag.is_active = true AND ag.status = 'active')));

ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider sees own grants" ON public.access_grants FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Client sees own grants" ON public.access_grants FOR ALL USING (client_id = auth.uid());

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can view own invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());
CREATE POLICY "Clients can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = client_id);

ALTER TABLE public.partner_treatment_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_crud_treatment_notes ON public.partner_treatment_notes FOR ALL USING (partner_id = auth.uid());

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Fixtures: A, B Provider (Slim aktiv) · E Mitarbeiter A · F Mitarbeiter B · C Kunde von A UND B (geteilt)
-- K Kunde nur von B · HC Pferd von C · HK Pferd von K
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','a@example.invalid'),('00000000-0000-4000-8000-00000000b0b0','b@example.invalid'),
 ('00000000-0000-4000-8000-00000000e0e0','e@example.invalid'),('00000000-0000-4000-8000-00000000f1f1','f@example.invalid'),
 ('00000000-0000-4000-8000-00000000c0c0','c@example.invalid'),('00000000-0000-4000-8000-0000000000cc','k@example.invalid');
INSERT INTO profiles (id, email, full_name, created_by_provider_id, user_type) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','a@example.invalid','Provider A',NULL,'provider'),
 ('00000000-0000-4000-8000-00000000b0b0','b@example.invalid','Provider B',NULL,'provider'),
 ('00000000-0000-4000-8000-00000000e0e0','e@example.invalid','Mitarbeiter E',NULL,'employee'),
 ('00000000-0000-4000-8000-00000000f1f1','f@example.invalid','Mitarbeiter F',NULL,'employee'),
 ('00000000-0000-4000-8000-00000000c0c0','c@example.invalid','Kunde C',NULL,'client'),
 ('00000000-0000-4000-8000-0000000000cc','k@example.invalid','Kunde K','00000000-0000-4000-8000-00000000b0b0','client');
INSERT INTO user_roles(user_id, role) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','provider'),('00000000-0000-4000-8000-00000000b0b0','provider'),
 ('00000000-0000-4000-8000-00000000e0e0','employee'),('00000000-0000-4000-8000-00000000f1f1','employee'),
 ('00000000-0000-4000-8000-00000000c0c0','client'),('00000000-0000-4000-8000-0000000000cc','client');
INSERT INTO product_entitlements(user_id,product,plan,status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','HUFMANAGER','HUFMANAGER_SLIM','ACTIVE'),
 ('00000000-0000-4000-8000-00000000b0b0','HUFMANAGER','HUFMANAGER_SLIM','ACTIVE');
INSERT INTO employee_profiles(provider_id, user_id, full_name, status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000e0e0','E','active'),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-00000000f1f1','F','active');
INSERT INTO access_grants(provider_id, client_id, is_active, status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000c0c0',true,'active'),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-00000000c0c0',true,'active'),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-0000000000cc',true,'active');
INSERT INTO horses(id, owner_id, name) VALUES
 ('00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0','Geteilt-HC'),
 ('00000000-0000-4000-8000-0000000004cc','00000000-0000-4000-8000-0000000000cc','Nur-B-HK');
INSERT INTO appointments(id, provider_id, horse_id, client_id, date, status, notes) VALUES
 ('00000000-0000-4000-8000-00000000aaa1','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0',current_date+3,'planned','A-original'),
 ('00000000-0000-4000-8000-00000000aaa2','00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0',current_date+4,'planned','A-original'),
 ('00000000-0000-4000-8000-00000000bbb1','00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-0000000004c1','00000000-0000-4000-8000-00000000c0c0',current_date+5,'planned','B-original'),
 ('00000000-0000-4000-8000-00000000bbb2','00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-0000000004cc','00000000-0000-4000-8000-0000000000cc',current_date+6,'planned','B-original');
INSERT INTO invoices(provider_id, client_id, horse_id, invoice_number, total_amount, payment_status) VALUES
 ('00000000-0000-4000-8000-00000000a0a0','00000000-0000-4000-8000-00000000c0c0','00000000-0000-4000-8000-0000000004c1','A-RE-1',50,'open'),
 ('00000000-0000-4000-8000-00000000b0b0','00000000-0000-4000-8000-00000000c0c0','00000000-0000-4000-8000-0000000004c1','B-RE-SECRET',999,'open');
