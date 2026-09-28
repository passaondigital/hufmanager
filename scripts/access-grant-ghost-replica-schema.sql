-- Minimal-Replik der für access_grants relevanten PROD-Objekte (vnschgjxkzzwzefqlrji),
-- Definitionen am 28.09.2026 read-only aus PROD gelesen (information_schema / pg_get_functiondef /
-- pg_policies / pg_trigger). NUR für eine Wegwerf-Postgres zum Testen des Ghost-Grant-Fixes.
-- enforce_access_grant_security = PROD-Fassung VOR dem Fix (md5 e037737a…).
-- Nicht auf eine echte Supabase-DB anwenden.
\set ON_ERROR_STOP 1
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY, name text, statements text[], created_by text);

CREATE TYPE public.app_role AS ENUM ('admin','provider','client','employee','partner');
CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text, created_by_provider_id uuid,
  deleted_at timestamptz);
CREATE TABLE public.user_roles (id bigserial, user_id uuid, role public.app_role, UNIQUE (user_id, role));
CREATE TABLE public.master_admins (email text);
CREATE TABLE public.access_grants (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_view_basic boolean DEFAULT true,
  can_view_medical boolean DEFAULT true,
  can_create_appointments boolean DEFAULT true,
  is_active boolean DEFAULT true,
  granted_at timestamptz DEFAULT now() NOT NULL,
  revoked_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamptz DEFAULT now(),
  request_message text, partner_email text, partner_name text, valid_until timestamptz,
  auto_revoke_on_last_appointment boolean DEFAULT false,
  UNIQUE (client_id, provider_id));
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.access_grants TO anon, authenticated, service_role;
GRANT SELECT ON public.profiles, public.user_roles TO authenticated;

-- Funktionen wörtlich aus PROD
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;
CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.master_admins WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) $$;
CREATE FUNCTION public.auth_user_email() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$ SELECT email::text FROM auth.users WHERE id = auth.uid() $$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE FUNCTION public.prevent_demo_real_access_grant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $function$
DECLARE
  demo_emails text[] := ARRAY['hufbearbeiter.hufmanager@gmail.com','pferdebesitzer.hufmanager@gmail.com',
    'mitarbeiter.hufmanager@gmail.com','partner.hufmanager@gmail.com','hufmanagerbusiness@gmail.com',
    'hufmanagerstallbetreiber@gmail.com'];
  provider_email text; client_email text; provider_is_demo boolean; client_is_demo boolean; client_is_ghost boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_active = false OR NEW.status IN ('revoked', 'rejected', 'cancelled') THEN RETURN NEW; END IF;
  END IF;
  SELECT email INTO provider_email FROM profiles WHERE id = NEW.provider_id;
  SELECT email INTO client_email FROM profiles WHERE id = NEW.client_id;
  provider_is_demo := provider_email = ANY(demo_emails);
  client_is_demo := client_email = ANY(demo_emails);
  client_is_ghost := NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.client_id);
  IF provider_is_demo AND client_is_ghost THEN RETURN NEW; END IF;
  IF (provider_is_demo AND NOT client_is_demo) OR (NOT provider_is_demo AND client_is_demo) THEN
    RAISE EXCEPTION 'Demo accounts cannot be connected to real accounts';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.validate_access_grant_roles() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $function$
DECLARE
  v_client_role public.app_role; v_provider_role public.app_role;
  v_client_profile_exists boolean; v_is_ghost_profile boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.client_id AND deleted_at IS NULL) INTO v_client_profile_exists;
  IF NOT v_client_profile_exists THEN RAISE EXCEPTION 'access_grants: client_id profile does not exist'; END IF;
  v_provider_role := public.get_user_role(NEW.provider_id);
  IF v_provider_role IS NULL OR v_provider_role <> 'provider'::public.app_role THEN
    RAISE EXCEPTION 'access_grants: provider_id must have role provider';
  END IF;
  v_client_role := public.get_user_role(NEW.client_id);
  SELECT (created_by_provider_id IS NOT NULL) INTO v_is_ghost_profile FROM public.profiles WHERE id = NEW.client_id;
  IF v_client_role IS NULL AND NOT v_is_ghost_profile THEN
     RAISE EXCEPTION 'ZUGRIFF VERWEIGERT: Das Profil ist weder Kunde noch vom Provider erstellt.';
  END IF;
  RETURN NEW;
END;
$function$;

-- PROD-Fassung vor dem Fix (wörtlich)
CREATE FUNCTION public.enforce_access_grant_security() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $function$
DECLARE
  v_is_real_client boolean;
  v_caller_is_provider boolean;
BEGIN
  v_is_real_client := EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.client_id);
  v_caller_is_provider := (auth.uid() = NEW.provider_id) AND public.has_role(auth.uid(), 'provider'::public.app_role);
  IF v_caller_is_provider AND v_is_real_client THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_active = true OR NEW.status = 'active' THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot unilaterally create active grants for real clients.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF (OLD.is_active = false OR OLD.status <> 'active') AND (NEW.is_active = true OR NEW.status = 'active') THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot activate access grants for real clients.';
      END IF;
      IF OLD.can_view_medical = false AND NEW.can_view_medical = true THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot grant themselves medical permissions for real clients.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_enforce_access_grant_security BEFORE INSERT OR UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION enforce_access_grant_security();
CREATE TRIGGER trg_prevent_demo_real_access BEFORE INSERT OR UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION prevent_demo_real_access_grant();
CREATE TRIGGER trg_update_access_grants_updated_at BEFORE UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_validate_access_grant_roles_final BEFORE INSERT OR UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION validate_access_grant_roles();

-- Policies wörtlich aus PROD (pg_policies 28.09.2026)
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client sees own grants" ON public.access_grants FOR ALL TO public USING (client_id = auth.uid());
CREATE POLICY "Provider sees own grants" ON public.access_grants FOR ALL TO public USING (provider_id = auth.uid());
CREATE POLICY "Clients can create access grants" ON public.access_grants FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = client_id) AND has_role(auth.uid(), 'client'::app_role));
CREATE POLICY "Providers can create access grants" ON public.access_grants FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'provider'::app_role) AND (auth.uid() = provider_id) AND ((NOT (EXISTS (SELECT 1
   FROM auth.users WHERE (users.id = access_grants.client_id)))) OR ((is_active = false) AND ((status IS NULL) OR (status = 'pending'::text)) AND (can_view_medical = false))));
CREATE POLICY "Clients can view own access grants" ON public.access_grants FOR SELECT TO public USING (auth.uid() = client_id);
CREATE POLICY "Master admin can view all access_grants" ON public.access_grants FOR SELECT TO public USING (is_master_admin());
CREATE POLICY "Partners can view their own grants by email" ON public.access_grants FOR SELECT TO public
  USING ((partner_email IS NOT NULL) AND (partner_email = auth_user_email()));
CREATE POLICY "Providers can view grants for themselves" ON public.access_grants FOR SELECT TO public USING (auth.uid() = provider_id);
CREATE POLICY "Users can view own access grants" ON public.access_grants FOR SELECT TO authenticated
  USING ((client_id = auth.uid()) OR (provider_id = auth.uid()));
CREATE POLICY "Clients can update own access grants" ON public.access_grants FOR UPDATE TO public
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Master admin can update all access_grants" ON public.access_grants FOR UPDATE TO public USING (is_master_admin());
CREATE POLICY "Providers can update grants" ON public.access_grants FOR UPDATE TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK ((auth.uid() = provider_id) AND ((NOT (EXISTS (SELECT 1 FROM auth.users WHERE (users.id = access_grants.client_id))))
   OR (((is_active = false) OR (status = ANY (ARRAY['revoked'::text, 'rejected'::text, 'cancelled'::text]))) AND (can_view_medical = false))));
