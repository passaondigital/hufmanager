-- =====================================================
-- TEAM MANAGEMENT & GROUP APPOINTMENTS SCHEMA UPDATE
-- Part 1: Core Tables and Columns First
-- =====================================================

-- 1. Create organization role enum
DO $$ BEGIN
  CREATE TYPE public.organization_role AS ENUM ('admin', 'employee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create organizations table (WITHOUT RLS policies that reference profiles yet)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Update profiles table with organization fields FIRST
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS org_role public.organization_role DEFAULT 'employee';

-- Add the FK constraint after column exists
DO $$ BEGIN
  ALTER TABLE public.profiles 
    ADD CONSTRAINT fk_profiles_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(id) 
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- 4. NOW enable RLS and create policies on organizations (after profiles.organization_id exists)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view their org"
  ON public.organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Organization owner can update their org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owner can delete their org"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Create appointment status enum
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'canceled_by_client', 'canceled_by_provider', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create appointment_groups table for "Sammeltermine"
CREATE TABLE IF NOT EXISTS public.appointment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  notes TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view appointment groups"
  ON public.appointment_groups FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Org admins and creators can manage appointment groups"
  ON public.appointment_groups FOR ALL
  USING (
    created_by = auth.uid()
    OR (
      organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND org_role = 'admin'
      )
    )
    OR public.is_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_appointment_groups_org ON public.appointment_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointment_groups_date ON public.appointment_groups(date);

-- 7. Update appointments table
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.appointment_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_group_id ON public.appointments(group_id);
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);

-- 8. Create broadcast_logs table
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT,
  message_content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipients_count INTEGER NOT NULL DEFAULT 0,
  recipient_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view broadcast logs"
  ON public.broadcast_logs FOR SELECT
  USING (
    sent_by = auth.uid()
    OR (
      organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND org_role = 'admin'
      )
    )
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Org admins can create broadcasts"
  ON public.broadcast_logs FOR INSERT
  WITH CHECK (
    sent_by = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_org ON public.broadcast_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_sent_at ON public.broadcast_logs(sent_at DESC);

-- 9. Add organization_id to existing tables
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON public.contacts(organization_id);

ALTER TABLE public.horses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_horses_organization_id ON public.horses(organization_id);

ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);

ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id ON public.inventory_items(organization_id);

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);

-- 10. Helper functions
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND org_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 11. Updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_groups_updated_at
  BEFORE UPDATE ON public.appointment_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Auto-assign organization function and triggers
CREATE OR REPLACE FUNCTION public.auto_assign_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_assign_org_to_contacts
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_organization();

CREATE TRIGGER auto_assign_org_to_appointments
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_organization();