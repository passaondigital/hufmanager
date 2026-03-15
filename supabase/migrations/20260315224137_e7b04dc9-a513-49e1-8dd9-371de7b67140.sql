
-- Step 1: Expand organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS brand_color_primary TEXT DEFAULT '#F5970A',
  ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT DEFAULT '#0A0700',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Create organization_members table FIRST
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(org_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 3: Now create helper functions that reference organization_members
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'admin' AND is_active = true
  );
$$;

-- Step 4: RLS on organization_members using the functions
CREATE POLICY "Members can view own org members"
  ON organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (public.is_org_admin(auth.uid(), org_id));

-- Step 5: Update organizations RLS
DROP POLICY IF EXISTS "Org members can view own org" ON organizations;
DROP POLICY IF EXISTS "Org admins can update own org" ON organizations;
DROP POLICY IF EXISTS "Anyone can view active orgs" ON organizations;

CREATE POLICY "Org members can view own org"
  ON organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id) OR is_active = true);

CREATE POLICY "Org admins can update own org"
  ON organizations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), id));

-- Step 6: Organization Products
CREATE TABLE IF NOT EXISTS organization_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  ean TEXT,
  sku TEXT,
  category TEXT,
  subcategory TEXT,
  sizes TEXT[] DEFAULT '{}',
  price_net DECIMAL(10,2),
  price_currency TEXT DEFAULT 'EUR',
  unit TEXT DEFAULT 'Stück',
  is_active BOOLEAN DEFAULT true,
  application_areas TEXT[] DEFAULT '{}',
  recommendation_triggers JSONB DEFAULT '[]',
  video_url TEXT,
  documentation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage own products"
  ON organization_products FOR ALL
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Active products are public"
  ON organization_products FOR SELECT
  USING (is_active = true);

-- Step 7: Organization Orders
CREATE TABLE IF NOT EXISTS organization_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  ordered_by UUID REFERENCES auth.users(id) NOT NULL,
  items JSONB NOT NULL,
  total_net DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orderer can view own orders"
  ON organization_orders FOR SELECT
  USING (ordered_by = auth.uid());

CREATE POLICY "Orderer can create orders"
  ON organization_orders FOR INSERT
  WITH CHECK (ordered_by = auth.uid());

CREATE POLICY "Org members can view org orders"
  ON organization_orders FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage org orders"
  ON organization_orders FOR UPDATE
  USING (public.is_org_admin(auth.uid(), org_id));

-- Step 8: Insurance Policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  horse_id UUID REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  policy_number TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  coverage_details JSONB DEFAULT '{}',
  premium_monthly DECIMAL(10,2),
  premium_yearly DECIMAL(10,2),
  deductible DECIMAL(10,2),
  valid_from DATE NOT NULL,
  valid_until DATE,
  contract_document_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own policies"
  ON insurance_policies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Org members can view org policies"
  ON insurance_policies FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can manage policies"
  ON insurance_policies FOR ALL
  USING (public.is_org_admin(auth.uid(), org_id));

-- Step 9: Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  horse_id UUID REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  claim_type TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_date DATE,
  supporting_documents TEXT[] DEFAULT '{}',
  auto_attached_data JSONB DEFAULT '{}',
  estimated_amount DECIMAL(10,2),
  approved_amount DECIMAL(10,2),
  status TEXT DEFAULT 'reported',
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter can manage own claims"
  ON insurance_claims FOR ALL
  USING (reported_by = auth.uid());

CREATE POLICY "Org members can view org claims"
  ON insurance_claims FOR SELECT
  USING (
    policy_id IN (
      SELECT id FROM insurance_policies WHERE public.is_org_member(auth.uid(), org_id)
    )
  );

-- Step 10: School Courses
CREATE TABLE IF NOT EXISTS school_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  max_students INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE school_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage courses"
  ON school_courses FOR ALL
  USING (public.is_org_member(auth.uid(), org_id));

-- Step 11: School Cases
CREATE TABLE IF NOT EXISTS school_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES school_courses(id) ON DELETE CASCADE NOT NULL,
  horse_id UUID REFERENCES horses(id),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_exam BOOLEAN DEFAULT false,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE school_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members access cases"
  ON school_cases FOR ALL
  USING (
    course_id IN (SELECT id FROM school_courses WHERE public.is_org_member(auth.uid(), org_id))
  );

-- Step 12: School Submissions
CREATE TABLE IF NOT EXISTS school_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES school_cases(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  score INTEGER,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  UNIQUE(case_id, student_id)
);

ALTER TABLE school_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own submissions"
  ON school_submissions FOR ALL
  USING (
    student_id = auth.uid() 
    OR case_id IN (
      SELECT id FROM school_cases WHERE course_id IN (
        SELECT id FROM school_courses WHERE instructor_id = auth.uid()
      )
    )
  );

-- Step 13: Public Statistics
CREATE TABLE IF NOT EXISTS public_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  data JSONB NOT NULL,
  horse_count INTEGER,
  provider_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_published BOOLEAN DEFAULT false
);

ALTER TABLE public_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published stats are public"
  ON public_statistics FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins manage stats"
  ON public_statistics FOR ALL
  USING (public.is_admin(auth.uid()));
