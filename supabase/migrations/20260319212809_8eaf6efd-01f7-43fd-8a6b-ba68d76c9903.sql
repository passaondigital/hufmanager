-- Verification documents for business clients (Gewerbeschein, §11 TierSchG, etc.)
CREATE TABLE public.client_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification docs"
  ON public.client_verification_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own verification docs"
  ON public.client_verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage verification docs"
  ON public.client_verification_documents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Stall-specific horse data sharing permissions
CREATE TABLE public.stall_horse_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horse_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  can_view_basic boolean NOT NULL DEFAULT true,
  can_view_equidenpass boolean NOT NULL DEFAULT false,
  can_view_insurance boolean NOT NULL DEFAULT false,
  can_view_vaccination boolean NOT NULL DEFAULT false,
  can_view_health_status boolean NOT NULL DEFAULT false,
  can_view_vet_reports boolean NOT NULL DEFAULT false,
  can_view_hoof_status boolean NOT NULL DEFAULT false,
  can_view_feeding boolean NOT NULL DEFAULT true,
  can_view_emergency boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stall_owner_id, horse_id)
);

ALTER TABLE public.stall_horse_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horse owners manage stall access"
  ON public.stall_horse_access FOR ALL
  TO authenticated
  USING (horse_owner_id = auth.uid());

CREATE POLICY "Stall owners view their access"
  ON public.stall_horse_access FOR SELECT
  TO authenticated
  USING (stall_owner_id = auth.uid());

-- Client-to-client connections
CREATE TABLE public.client_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

ALTER TABLE public.client_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own connections"
  ON public.client_connections FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Users can create connections"
  ON public.client_connections FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update connections targeting them"
  ON public.client_connections FOR UPDATE
  TO authenticated
  USING (target_id = auth.uid() OR requester_id = auth.uid());