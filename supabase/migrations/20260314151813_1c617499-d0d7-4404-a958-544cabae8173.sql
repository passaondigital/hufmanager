-- ============================================================
-- FEATURE 1: Document Vault
-- ============================================================

-- Add vault_pin to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vault_pin text,
ADD COLUMN IF NOT EXISTS vault_locked_until timestamptz,
ADD COLUMN IF NOT EXISTS vault_failed_attempts int DEFAULT 0;

-- Vault documents table
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  category text NOT NULL CHECK (category IN ('equidenpass', 'kaufvertrag', 'versicherungspolice', 'rechtsdokumente')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own vault docs
CREATE POLICY "Owner full access to own vault docs"
ON public.vault_documents FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Admin can read (not write/delete) vault docs
CREATE POLICY "Admin read-only vault docs"
ON public.vault_documents FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Vault access log (immutable)
CREATE TABLE IF NOT EXISTS public.vault_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  documents_viewed text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.vault_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can insert (when they access vault)
CREATE POLICY "Admin can insert vault access log"
ON public.vault_access_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND admin_user_id = auth.uid());

-- Owner can read their own access logs
CREATE POLICY "Owner can read own vault access logs"
ON public.vault_access_log FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Admin can read all access logs
CREATE POLICY "Admin can read all vault access logs"
ON public.vault_access_log FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- No UPDATE or DELETE on vault_access_log (immutable)

-- ============================================================
-- FEATURE 2: Emergency Contact (enhanced)
-- Already exists as JSON in profiles.emergency_contacts
-- Adding dedicated notification_emergency_contact fields
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS primary_emergency_first_name text,
ADD COLUMN IF NOT EXISTS primary_emergency_last_name text,
ADD COLUMN IF NOT EXISTS primary_emergency_phone text,
ADD COLUMN IF NOT EXISTS primary_emergency_email text,
ADD COLUMN IF NOT EXISTS primary_emergency_relationship text,
ADD COLUMN IF NOT EXISTS primary_emergency_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_emergency_verify_token uuid;

-- ============================================================
-- FEATURE 3: Platform Succession
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_succession (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authorized_person_name text,
  authorized_person_email text,
  authorized_person_phone text,
  lawyer_name text,
  lawyer_firm text,
  lawyer_email text,
  lawyer_phone text,
  last_will_instructions text,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_succession ENABLE ROW LEVEL SECURITY;

-- Only master admin can read and write
CREATE POLICY "Master admin full access to succession"
ON public.platform_succession FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());