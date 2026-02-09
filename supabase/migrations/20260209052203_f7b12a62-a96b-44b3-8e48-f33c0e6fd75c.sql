-- ================================================================
-- EMPLOYEE & TEAM MANAGEMENT MODULE - PHASE 1 DATABASE SCHEMA
-- ================================================================

-- 1. Create employee role enum
CREATE TYPE public.employee_role AS ENUM ('view', 'employee', 'team_lead');

-- 2. Create employee status enum
CREATE TYPE public.employee_status AS ENUM ('active', 'sick', 'vacation', 'suspended', 'inactive');

-- 3. Create employment type enum
CREATE TYPE public.employment_type AS ENUM ('employee', 'contractor');

-- 4. Create employee_profiles table (employees linked to providers/organizations)
CREATE TABLE public.employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Basic info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  
  -- Role & permissions
  role employee_role NOT NULL DEFAULT 'employee',
  status employee_status NOT NULL DEFAULT 'active',
  employment_type employment_type NOT NULL DEFAULT 'employee',
  
  -- Contract info
  contract_start_date DATE,
  contract_end_date DATE,
  contract_pdf_url TEXT,
  
  -- Qualifications
  can_work_alone BOOLEAN DEFAULT false,
  can_apply_hoof_protection BOOLEAN DEFAULT false,
  can_work_sensitive_clients BOOLEAN DEFAULT false,
  
  -- Custom permissions (override defaults)
  custom_permissions JSONB DEFAULT '{}',
  
  -- Invitation tracking
  invitation_token TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_employee_email_per_provider UNIQUE (email, provider_id)
);

-- 5. Create employee_assignments table (job assignments)
CREATE TABLE public.employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'checked_in', 'working', 'checked_out', 'completed', 'cancelled')),
  
  -- Check-in/out
  check_in_time TIMESTAMPTZ,
  check_in_location_lat NUMERIC,
  check_in_location_lng NUMERIC,
  check_out_time TIMESTAMPTZ,
  check_out_location_lat NUMERIC,
  check_out_location_lng NUMERIC,
  
  -- Provider review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'needs_correction')),
  review_notes TEXT,
  
  -- Instructions from provider
  instructions TEXT,
  allowed_actions JSONB DEFAULT '["document", "photos", "notes"]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create employee_documentation table (work documentation by employees)
CREATE TABLE public.employee_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.employee_assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Documentation content
  notes TEXT,
  photo_urls TEXT[],
  
  -- Material usage (quantities only, no prices for employees)
  materials_used JSONB DEFAULT '[]',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'needs_revision')),
  submitted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create employee_availability table (vacation, sick days, working hours)
CREATE TABLE public.employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Availability type
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'unavailable', 'working_hours')),
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- For working hours type
  start_time TIME,
  end_time TIME,
  weekdays INTEGER[], -- 0=Sunday, 1=Monday, etc.
  
  -- Request tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create employee_audit_log table
CREATE TABLE public.employee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Actor info
  actor_id UUID REFERENCES public.profiles(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('employee', 'provider', 'system')),
  
  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_employee_profiles_provider ON public.employee_profiles(provider_id);
CREATE INDEX idx_employee_profiles_user ON public.employee_profiles(user_id);
CREATE INDEX idx_employee_profiles_status ON public.employee_profiles(status);
CREATE INDEX idx_employee_profiles_invitation ON public.employee_profiles(invitation_token);

CREATE INDEX idx_employee_assignments_employee ON public.employee_assignments(employee_id);
CREATE INDEX idx_employee_assignments_provider ON public.employee_assignments(provider_id);
CREATE INDEX idx_employee_assignments_appointment ON public.employee_assignments(appointment_id);
CREATE INDEX idx_employee_assignments_status ON public.employee_assignments(status);

CREATE INDEX idx_employee_documentation_assignment ON public.employee_documentation(assignment_id);
CREATE INDEX idx_employee_documentation_employee ON public.employee_documentation(employee_id);

CREATE INDEX idx_employee_availability_employee ON public.employee_availability(employee_id);
CREATE INDEX idx_employee_availability_dates ON public.employee_availability(start_date, end_date);

CREATE INDEX idx_employee_audit_log_employee ON public.employee_audit_log(employee_id);
CREATE INDEX idx_employee_audit_log_provider ON public.employee_audit_log(provider_id);
CREATE INDEX idx_employee_audit_log_created ON public.employee_audit_log(created_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is an employee of a provider
CREATE OR REPLACE FUNCTION public.is_employee_of_provider(_user_id UUID, _provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE user_id = _user_id
      AND provider_id = _provider_id
      AND status = 'active'
  )
$$;

-- Helper function to get employee profile ID for a user
CREATE OR REPLACE FUNCTION public.get_employee_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employee_profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ================================================================
-- EMPLOYEE_PROFILES POLICIES
-- ================================================================

-- Providers can view their own employees
CREATE POLICY "Providers can view their employees"
ON public.employee_profiles FOR SELECT
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can view their own profile
CREATE POLICY "Employees can view own profile"
ON public.employee_profiles FOR SELECT
USING (user_id = auth.uid());

-- Team leads can view team members (same provider)
CREATE POLICY "Team leads can view team"
ON public.employee_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_profiles ep
    WHERE ep.user_id = auth.uid()
      AND ep.provider_id = employee_profiles.provider_id
      AND ep.role = 'team_lead'
      AND ep.status = 'active'
  )
);

-- Providers can create employees
CREATE POLICY "Providers can create employees"
ON public.employee_profiles FOR INSERT
WITH CHECK (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Providers can update their employees
CREATE POLICY "Providers can update employees"
ON public.employee_profiles FOR UPDATE
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can update limited fields on their own profile
CREATE POLICY "Employees can update own profile"
ON public.employee_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Providers can delete employees
CREATE POLICY "Providers can delete employees"
ON public.employee_profiles FOR DELETE
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- ================================================================
-- EMPLOYEE_ASSIGNMENTS POLICIES
-- ================================================================

-- Providers can view all assignments they created
CREATE POLICY "Providers can view assignments"
ON public.employee_assignments FOR SELECT
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can view their own assignments
CREATE POLICY "Employees can view own assignments"
ON public.employee_assignments FOR SELECT
USING (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- Team leads can view all team assignments
CREATE POLICY "Team leads can view team assignments"
ON public.employee_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_profiles ep
    WHERE ep.user_id = auth.uid()
      AND ep.provider_id = employee_assignments.provider_id
      AND ep.role = 'team_lead'
      AND ep.status = 'active'
  )
);

-- Providers can create assignments
CREATE POLICY "Providers can create assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Team leads can create assignments for their team
CREATE POLICY "Team leads can create assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_profiles ep
    WHERE ep.user_id = auth.uid()
      AND ep.provider_id = employee_assignments.provider_id
      AND ep.role = 'team_lead'
      AND ep.status = 'active'
  )
);

-- Providers can update assignments
CREATE POLICY "Providers can update assignments"
ON public.employee_assignments FOR UPDATE
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can update status of their own assignments
CREATE POLICY "Employees can update own assignment status"
ON public.employee_assignments FOR UPDATE
USING (
  employee_id = public.get_employee_profile_id(auth.uid())
)
WITH CHECK (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- ================================================================
-- EMPLOYEE_DOCUMENTATION POLICIES
-- ================================================================

-- Providers can view all documentation
CREATE POLICY "Providers can view documentation"
ON public.employee_documentation FOR SELECT
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can view their own documentation
CREATE POLICY "Employees can view own documentation"
ON public.employee_documentation FOR SELECT
USING (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- Employees can create documentation for their assignments
CREATE POLICY "Employees can create documentation"
ON public.employee_documentation FOR INSERT
WITH CHECK (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- Employees can update their own draft documentation
CREATE POLICY "Employees can update own documentation"
ON public.employee_documentation FOR UPDATE
USING (
  employee_id = public.get_employee_profile_id(auth.uid())
  AND status IN ('draft', 'needs_revision')
);

-- Providers can update documentation (for approval)
CREATE POLICY "Providers can update documentation"
ON public.employee_documentation FOR UPDATE
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- ================================================================
-- EMPLOYEE_AVAILABILITY POLICIES
-- ================================================================

-- Providers can view all availability
CREATE POLICY "Providers can view availability"
ON public.employee_availability FOR SELECT
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Employees can view their own availability
CREATE POLICY "Employees can view own availability"
ON public.employee_availability FOR SELECT
USING (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- Employees can request availability (vacation, sick)
CREATE POLICY "Employees can request availability"
ON public.employee_availability FOR INSERT
WITH CHECK (
  employee_id = public.get_employee_profile_id(auth.uid())
);

-- Providers can manage availability
CREATE POLICY "Providers can manage availability"
ON public.employee_availability FOR ALL
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- ================================================================
-- EMPLOYEE_AUDIT_LOG POLICIES
-- ================================================================

-- Providers can view audit logs
CREATE POLICY "Providers can view audit logs"
ON public.employee_audit_log FOR SELECT
USING (
  provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
ON public.employee_audit_log FOR INSERT
WITH CHECK (true);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-update updated_at
CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_assignments_updated_at
  BEFORE UPDATE ON public.employee_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documentation_updated_at
  BEFORE UPDATE ON public.employee_documentation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_availability_updated_at
  BEFORE UPDATE ON public.employee_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logging trigger function
CREATE OR REPLACE FUNCTION public.log_employee_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employee_audit_log (
    employee_id,
    provider_id,
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.employee_id, OLD.employee_id),
    COALESCE(NEW.provider_id, OLD.provider_id),
    auth.uid(),
    CASE 
      WHEN public.is_employee_of_provider(auth.uid(), COALESCE(NEW.provider_id, OLD.provider_id)) THEN 'employee'
      ELSE 'provider'
    END,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Apply audit triggers
CREATE TRIGGER audit_employee_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_employee_action();

-- Add 'employee' to user_roles enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employee' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'employee';
  END IF;
END $$;