-- Team & Employee Management Module
-- Tables: employees, employee_invites, assignments, work_events, documentation_items

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('assistant', 'employee', 'teamlead', 'provider')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sick', 'vacation', 'suspended', 'inactive')),
  employment_type TEXT CHECK (employment_type IN ('employee', 'contractor', 'apprentice')),
  contract_start_date DATE,
  contract_end_date DATE,
  can_work_alone BOOLEAN DEFAULT false,
  can_document BOOLEAN DEFAULT true,
  can_communicate_with_customers BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  UNIQUE(provider_id, email)
);

CREATE INDEX idx_employees_provider ON employees(provider_id);
CREATE INDEX idx_employees_status ON employees(provider_id, status);

-- EMPLOYEE INVITES
CREATE TABLE IF NOT EXISTS employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('assistant', 'employee', 'teamlead')),
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employee_invites_token ON employee_invites(invite_token);
CREATE INDEX idx_employee_invites_provider ON employee_invites(provider_id);

-- ASSIGNMENTS (Termin -> Mitarbeiter Zuweisung)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'en_route', 'checked_in', 'checked_out', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, employee_id)
);

CREATE INDEX idx_assignments_provider ON assignments(provider_id);
CREATE INDEX idx_assignments_employee ON assignments(employee_id);
CREATE INDEX idx_assignments_appointment ON assignments(appointment_id);
CREATE INDEX idx_assignments_status ON assignments(provider_id, status);

-- WORK EVENTS (Append-only log)
CREATE TABLE IF NOT EXISTS work_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('en_route', 'check_in', 'check_out', 'note_added', 'photo_added')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_events_assignment ON work_events(assignment_id);
CREATE INDEX idx_work_events_employee ON work_events(employee_id);

-- DOCUMENTATION ITEMS (Fotos, Notizen vom Mitarbeiter)
CREATE TABLE IF NOT EXISTS documentation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('photo', 'note', 'video')),
  content TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  provider_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_documentation_items_provider ON documentation_items(provider_id);
CREATE INDEX idx_documentation_items_assignment ON documentation_items(assignment_id);
CREATE INDEX idx_documentation_items_approval ON documentation_items(provider_id, approval_status);

-- RLS POLICIES

-- EMPLOYEES
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_manage_employees"
ON employees FOR ALL
TO authenticated
USING (provider_id = auth.uid());

-- EMPLOYEE INVITES
ALTER TABLE employee_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_manage_invites"
ON employee_invites FOR ALL
TO authenticated
USING (provider_id = auth.uid());

-- ASSIGNMENTS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_manage_assignments"
ON assignments FOR ALL
TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "employees_view_own_assignments"
ON assignments FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY "employees_update_own_assignment_status"
ON assignments FOR UPDATE
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- WORK EVENTS (Append-only: INSERT + SELECT only!)
ALTER TABLE work_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_view_all_events"
ON work_events FOR SELECT
TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "employees_insert_own_events"
ON work_events FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "employees_view_own_events"
ON work_events FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- DOCUMENTATION ITEMS
ALTER TABLE documentation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_manage_documentation"
ON documentation_items FOR ALL
TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "employees_view_own_documentation"
ON documentation_items FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

CREATE POLICY "employees_create_documentation"
ON documentation_items FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Auto-update updated_at on assignments
CREATE OR REPLACE FUNCTION update_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_timestamp
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION update_assignment_timestamp();
