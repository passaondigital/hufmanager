-- Minimal-Replik der für appointments relevanten PROD-Objekte (vnschgjxkzzwzefqlrji),
-- Definitionen am 27.09.2026 read-only aus PROD gelesen (pg_get_functiondef / pg_policies /
-- pg_trigger). NUR für eine Wegwerf-Postgres zum Testen des Termin-Guards.
-- Nicht auf eine echte Supabase-DB anwenden.
\set ON_ERROR_STOP 1
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, last_sign_in_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;

CREATE TYPE public.app_role AS ENUM ('admin','provider','client','employee','partner');
CREATE TYPE public.employee_status AS ENUM ('active','sick','vacation','suspended','inactive');

CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text, created_by_provider_id uuid,
  organization_id uuid, deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE public.user_roles (user_id uuid, role public.app_role, UNIQUE (user_id, role));
CREATE TABLE public.master_admins (email text);
CREATE TABLE public.organizations (id uuid PRIMARY KEY, name text NOT NULL, owner_id uuid NOT NULL, is_active boolean);
CREATE TABLE public.organization_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL,
  user_id uuid NOT NULL, role text, is_active boolean);
CREATE TABLE public.employee_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL,
  user_id uuid, full_name text, email text, status public.employee_status DEFAULT 'active');
CREATE TABLE public.access_grants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL,
  provider_id uuid NOT NULL, is_active boolean DEFAULT true, status text NOT NULL DEFAULT 'active',
  can_create_appointments boolean DEFAULT true, valid_until timestamptz, revoked_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider_id));
CREATE TABLE public.horses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL,
  deleted_at timestamptz);
CREATE TABLE public.services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid, name text, is_active boolean);
CREATE TABLE public.product_entitlements (user_id uuid, product text, plan text, status text, trial_ends_at timestamptz);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.profiles(id),
  assigned_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  date date NOT NULL, time time, duration integer, service_type text, notes text, price numeric,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

-- Funktionen wörtlich aus PROD
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role) $$;
CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.master_admins WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) $$;
CREATE FUNCTION public.has_active_access_grant(_provider_id uuid, _client_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.access_grants WHERE provider_id = _provider_id AND client_id = _client_id
    AND is_active = true AND status = 'active' AND (valid_until IS NULL OR valid_until > now())) $$;
CREATE FUNCTION public.is_employee_of_provider(_user_id uuid, _provider_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.employee_profiles WHERE user_id = _user_id AND provider_id = _provider_id AND status = 'active') $$;
CREATE FUNCTION public.has_hufmanager_access_v1() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.product_entitlements WHERE user_id = auth.uid() AND product = 'HUFMANAGER'
    AND plan = 'HUFMANAGER_SLIM' AND (status = 'ACTIVE' OR (status = 'TRIAL_ACTIVE' AND (trial_ends_at IS NULL OR trial_ends_at >= now())))) $$;
CREATE FUNCTION public.get_user_organization(_user_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id AND (auth.uid() = _user_id OR public.is_admin(auth.uid())) LIMIT 1 $$;
CREATE FUNCTION public.auto_assign_organization() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN NEW.organization_id := public.get_user_organization(auth.uid()); END IF;
  RETURN NEW;
END; $$;
CREATE FUNCTION public.validate_appointment_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('planned','pending','confirmed','completed','cancelled','no_show','requested') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  IF NEW.price IS NOT NULL AND NEW.price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
  IF NEW.duration IS NOT NULL AND (NEW.duration < 1 OR NEW.duration > 480) THEN
    RAISE EXCEPTION 'Duration must be between 1 and 480 minutes';
  END IF;
  RETURN NEW;
END; $$;
CREATE FUNCTION public.hm_guard_service_owner_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_owner_col text := TG_ARGV[0]; v_service_col text := TG_ARGV[1];
  v_new jsonb := to_jsonb(NEW); v_old jsonb;
  v_service_id uuid := (v_new ->> v_service_col)::uuid; v_owner_id uuid := (v_new ->> v_owner_col)::uuid;
BEGIN
  IF v_service_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    IF (v_old ->> v_service_col) IS NOT DISTINCT FROM (v_new ->> v_service_col)
       AND (v_old ->> v_owner_col) IS NOT DISTINCT FROM (v_new ->> v_owner_col) THEN RETURN NEW; END IF;
  END IF;
  IF v_owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = v_service_id AND s.provider_id = v_owner_id) THEN
    RAISE EXCEPTION 'Leistung gehört nicht zu diesem Betrieb' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER auto_assign_org_to_appointments BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION auto_assign_organization();
CREATE TRIGGER trg_hm_guard_service_owner_v1 BEFORE INSERT OR UPDATE OF service_id, provider_id ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION hm_guard_service_owner_v1('provider_id', 'service_id');
CREATE TRIGGER trg_validate_appointment BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION validate_appointment_status();

-- appointments-RLS wörtlich aus PROD (ohne Client/Partner-SELECT, für Schreibtests irrelevant)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all appointments" ON public.appointments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Provider can access own appointments" ON public.appointments FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Providers can insert own appointments" ON public.appointments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());
CREATE POLICY "Providers can update own appointments" ON public.appointments FOR UPDATE
  USING (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND provider_id = auth.uid());
CREATE POLICY hufmanager_slim_entitlement_gate_v1 ON public.appointments AS RESTRICTIVE FOR ALL TO authenticated
  USING ((provider_id IS DISTINCT FROM auth.uid()) OR has_hufmanager_access_v1() OR is_admin(auth.uid()) OR is_master_admin());
CREATE POLICY hufmanager_slim_entitlement_gate_insert_v1 ON public.appointments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((provider_id IS DISTINCT FROM auth.uid()) OR has_hufmanager_access_v1() OR is_admin(auth.uid()) OR is_master_admin());

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
