
-- =============================================
-- PART 1: Partner Integration (#PRID) Migration
-- =============================================

-- 1. Add 'partner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- 2. Create partner_type enum
DO $$ BEGIN
  CREATE TYPE public.partner_type AS ENUM (
    'tierarzt', 'physiotherapeut', 'osteopath', 'chiropraktiker',
    'reitlehrer', 'trainer', 'sattler', 'huforthopaedie',
    'zahnarzt', 'ernaehrungsberater', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create horse_partner_access table (horse-centric)
CREATE TABLE public.horse_partner_access (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id                UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  partner_profile_id      UUID REFERENCES public.profiles(id),
  partner_email           TEXT,
  partner_name            TEXT,
  partner_type            public.partner_type,
  invited_by_provider_id  UUID REFERENCES public.profiles(id),
  invited_by_client_id    UUID REFERENCES public.profiles(id),
  can_view_basic          BOOLEAN NOT NULL DEFAULT true,
  can_view_hoof_history   BOOLEAN NOT NULL DEFAULT true,
  can_view_medical        BOOLEAN NOT NULL DEFAULT false,
  can_add_treatment_notes BOOLEAN NOT NULL DEFAULT false,
  can_create_appointments BOOLEAN NOT NULL DEFAULT false,
  status                  TEXT NOT NULL DEFAULT 'pending',
  is_active               BOOLEAN NOT NULL DEFAULT false,
  invite_token            TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at              TIMESTAMPTZ DEFAULT now(),
  accepted_at             TIMESTAMPTZ,
  revoked_at              TIMESTAMPTZ,
  access_note             TEXT,
  valid_until             DATE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Status validation trigger (instead of CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_horse_partner_access_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'rejected', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, active, rejected, or revoked', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_horse_partner_access
  BEFORE INSERT OR UPDATE ON public.horse_partner_access
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_partner_access_status();

-- 4. Create partner_treatment_notes table
CREATE TABLE public.partner_treatment_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id         UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  partner_id       UUID NOT NULL REFERENCES public.profiles(id),
  partner_type     public.partner_type,
  treatment_date   DATE NOT NULL,
  title            TEXT NOT NULL,
  notes            TEXT,
  findings         TEXT,
  next_treatment   DATE,
  photo_urls       TEXT[] DEFAULT '{}',
  visible_to_pid   BOOLEAN NOT NULL DEFAULT true,
  visible_to_kid   BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 5. Update generate_profile_readable_id to handle 'partner' role with PRID prefix
CREATE OR REPLACE FUNCTION public.generate_profile_readable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
  user_role_from_meta TEXT;
  user_role app_role;
BEGIN
  IF NEW.readable_id IS NOT NULL AND NEW.readable_id != '' THEN
    RETURN NEW;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  
  IF user_role IS NULL THEN
    SELECT raw_user_meta_data->>'role' INTO user_role_from_meta
    FROM auth.users WHERE id = NEW.id;
    
    IF user_role_from_meta = 'provider' THEN
      user_role := 'provider'::app_role;
    ELSIF user_role_from_meta = 'client' THEN
      user_role := 'client'::app_role;
    ELSIF user_role_from_meta = 'partner' THEN
      user_role := 'partner'::app_role;
    END IF;
  END IF;
  
  IF user_role = 'provider' THEN
    prefix := 'PID';
  ELSIF user_role = 'admin' THEN
    prefix := 'AID';
  ELSIF user_role = 'partner' THEN
    prefix := 'PRID';
  ELSE
    prefix := 'KID';
  END IF;
  
  LOOP
    new_id := generate_random_id(prefix);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE readable_id = new_id) THEN
      NEW.readable_id := new_id;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique readable_id';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 6. Enable RLS
ALTER TABLE public.horse_partner_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_treatment_notes ENABLE ROW LEVEL SECURITY;

-- 7. Helper function: check if user is provider for a horse (via owner's access_grants or created_by)
CREATE OR REPLACE FUNCTION public.is_provider_for_horse(_provider_id uuid, _horse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.profiles p ON p.id = h.owner_id
    WHERE h.id = _horse_id
    AND h.deleted_at IS NULL
    AND (
      p.created_by_provider_id = _provider_id
      OR EXISTS (
        SELECT 1 FROM public.access_grants ag
        WHERE ag.client_id = h.owner_id
        AND ag.provider_id = _provider_id
        AND ag.is_active = true
      )
    )
  );
$$;

-- 8. RLS policies for horse_partner_access

-- Provider can view grants for horses they manage
CREATE POLICY "provider_view_horse_partner_access" ON public.horse_partner_access
  FOR SELECT USING (
    invited_by_provider_id = auth.uid()
    OR public.is_provider_for_horse(auth.uid(), horse_id)
  );

-- Client can view grants for their own horses
CREATE POLICY "client_view_horse_partner_access" ON public.horse_partner_access
  FOR SELECT USING (
    invited_by_client_id = auth.uid()
    OR horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid() AND deleted_at IS NULL)
  );

-- Partner can view their own grants
CREATE POLICY "partner_view_own_grants" ON public.horse_partner_access
  FOR SELECT USING (partner_profile_id = auth.uid());

-- Provider can insert (invite partners)
CREATE POLICY "provider_insert_horse_partner_access" ON public.horse_partner_access
  FOR INSERT WITH CHECK (
    invited_by_provider_id = auth.uid()
    AND public.is_provider_for_horse(auth.uid(), horse_id)
  );

-- Client can insert (invite partners for their horses)
CREATE POLICY "client_insert_horse_partner_access" ON public.horse_partner_access
  FOR INSERT WITH CHECK (
    invited_by_client_id = auth.uid()
    AND horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid() AND deleted_at IS NULL)
  );

-- Provider can update grants they manage
CREATE POLICY "provider_update_horse_partner_access" ON public.horse_partner_access
  FOR UPDATE USING (
    invited_by_provider_id = auth.uid()
    OR public.is_provider_for_horse(auth.uid(), horse_id)
  );

-- Client can update grants for their horses
CREATE POLICY "client_update_horse_partner_access" ON public.horse_partner_access
  FOR UPDATE USING (
    invited_by_client_id = auth.uid()
    OR horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid() AND deleted_at IS NULL)
  );

-- Partner can update their own grant (accept/reject)
CREATE POLICY "partner_update_own_grant" ON public.horse_partner_access
  FOR UPDATE USING (partner_profile_id = auth.uid());

-- Admin full access
CREATE POLICY "admin_full_horse_partner_access" ON public.horse_partner_access
  FOR ALL USING (public.is_admin(auth.uid()));

-- 9. RLS policies for partner_treatment_notes

-- Partner can CRUD their own notes
CREATE POLICY "partner_crud_treatment_notes" ON public.partner_treatment_notes
  FOR ALL USING (partner_id = auth.uid());

-- Provider can read notes if visible_to_pid and they manage the horse
CREATE POLICY "provider_read_treatment_notes" ON public.partner_treatment_notes
  FOR SELECT USING (
    visible_to_pid = true
    AND public.is_provider_for_horse(auth.uid(), horse_id)
  );

-- Client can read notes if visible_to_kid and they own the horse
CREATE POLICY "client_read_treatment_notes" ON public.partner_treatment_notes
  FOR SELECT USING (
    visible_to_kid = true
    AND horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid() AND deleted_at IS NULL)
  );

-- Admin full access
CREATE POLICY "admin_full_treatment_notes" ON public.partner_treatment_notes
  FOR ALL USING (public.is_admin(auth.uid()));

-- 10. Function to accept partner invitation by token
CREATE OR REPLACE FUNCTION public.accept_partner_invitation(p_token text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant record;
BEGIN
  IF p_token IS NULL OR char_length(p_token) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  SELECT * INTO v_grant
  FROM public.horse_partner_access
  WHERE invite_token = p_token
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- Check expiry
  IF v_grant.valid_until IS NOT NULL AND v_grant.valid_until < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Link partner and activate
  UPDATE public.horse_partner_access
  SET partner_profile_id = p_user_id,
      status = 'active',
      is_active = true,
      accepted_at = now()
  WHERE id = v_grant.id;

  RETURN jsonb_build_object(
    'success', true,
    'grant_id', v_grant.id,
    'horse_id', v_grant.horse_id
  );
END;
$$;

-- 11. Function to get invitation details by token (public, no auth needed)
CREATE OR REPLACE FUNCTION public.get_partner_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_token IS NULL OR char_length(p_token) < 10 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT jsonb_build_object(
    'valid', true,
    'id', hpa.id,
    'horse_name', h.name,
    'horse_readable_id', h.readable_id,
    'partner_email', hpa.partner_email,
    'partner_name', hpa.partner_name,
    'partner_type', hpa.partner_type,
    'inviter_name', COALESCE(
      (SELECT full_name FROM profiles WHERE id = hpa.invited_by_provider_id),
      (SELECT full_name FROM profiles WHERE id = hpa.invited_by_client_id)
    ),
    'inviter_role', CASE
      WHEN hpa.invited_by_provider_id IS NOT NULL THEN 'provider'
      ELSE 'client'
    END,
    'can_view_basic', hpa.can_view_basic,
    'can_view_hoof_history', hpa.can_view_hoof_history,
    'can_view_medical', hpa.can_view_medical,
    'can_add_treatment_notes', hpa.can_add_treatment_notes,
    'can_create_appointments', hpa.can_create_appointments,
    'access_note', hpa.access_note,
    'status', hpa.status,
    'valid_until', hpa.valid_until
  ) INTO result
  FROM public.horse_partner_access hpa
  JOIN public.horses h ON h.id = hpa.horse_id AND h.deleted_at IS NULL
  WHERE hpa.invite_token = p_token;

  RETURN COALESCE(result, jsonb_build_object('valid', false));
END;
$$;

-- 12. Indexes for performance
CREATE INDEX idx_horse_partner_access_horse_id ON public.horse_partner_access(horse_id);
CREATE INDEX idx_horse_partner_access_partner_profile_id ON public.horse_partner_access(partner_profile_id);
CREATE INDEX idx_horse_partner_access_invite_token ON public.horse_partner_access(invite_token);
CREATE INDEX idx_horse_partner_access_status ON public.horse_partner_access(status);
CREATE INDEX idx_partner_treatment_notes_horse_id ON public.partner_treatment_notes(horse_id);
CREATE INDEX idx_partner_treatment_notes_partner_id ON public.partner_treatment_notes(partner_id);
CREATE INDEX idx_partner_treatment_notes_treatment_date ON public.partner_treatment_notes(treatment_date);

-- 13. Update handle_new_user to support partner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_from_meta TEXT;
  assigned_role app_role;
BEGIN
  user_role_from_meta := new.raw_user_meta_data->>'role';
  
  IF user_role_from_meta = 'client' THEN
    assigned_role := 'client'::app_role;
  ELSIF user_role_from_meta = 'admin' THEN
    assigned_role := 'admin'::app_role;
  ELSIF user_role_from_meta = 'partner' THEN
    assigned_role := 'partner'::app_role;
  ELSE
    assigned_role := 'provider'::app_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Neuer Nutzer')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;
