
-- ============================================================
-- FIX: Infinite recursion between horses ↔ horse_partner_access
-- ============================================================

-- 1. SECURITY DEFINER helper: check if user owns a horse (bypasses horses RLS)
CREATE OR REPLACE FUNCTION public.is_horse_owner(_user_id uuid, _horse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.horses
    WHERE id = _horse_id
      AND owner_id = _user_id
      AND deleted_at IS NULL
  );
$$;

-- 2. SECURITY DEFINER helper: get all horse IDs owned by a user (bypasses horses RLS)
CREATE OR REPLACE FUNCTION public.get_owner_horse_ids(_owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.horses
  WHERE owner_id = _owner_id
    AND deleted_at IS NULL;
$$;

-- 3. SECURITY DEFINER helper: check partner access to horse (bypasses horse_partner_access RLS)
CREATE OR REPLACE FUNCTION public.has_horse_partner_access(_partner_id uuid, _horse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.horse_partner_access
    WHERE horse_id = _horse_id
      AND partner_profile_id = _partner_id
      AND is_active = true
      AND status = 'active'
  );
$$;

-- 4. Fix horse_partner_access policies: replace inline horses subquery
DROP POLICY IF EXISTS "client_view_horse_partner_access" ON public.horse_partner_access;
CREATE POLICY "client_view_horse_partner_access"
ON public.horse_partner_access FOR SELECT
TO authenticated
USING (
  invited_by_client_id = auth.uid()
  OR horse_id IN (SELECT public.get_owner_horse_ids(auth.uid()))
);

DROP POLICY IF EXISTS "client_update_horse_partner_access" ON public.horse_partner_access;
CREATE POLICY "client_update_horse_partner_access"
ON public.horse_partner_access FOR UPDATE
TO authenticated
USING (
  invited_by_client_id = auth.uid()
  OR horse_id IN (SELECT public.get_owner_horse_ids(auth.uid()))
);

-- 5. Fix horses policy: replace inline horse_partner_access subquery
DROP POLICY IF EXISTS "Partners can view shared horses basic" ON public.horses;
CREATE POLICY "Partners can view shared horses basic"
ON public.horses FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_horse_partner_access(auth.uid(), id)
);

-- 6. Fix appointments partner policy similarly
DROP POLICY IF EXISTS "Partners can view shared appointments with consent" ON public.appointments;
CREATE POLICY "Partners can view shared appointments with consent"
ON public.appointments FOR SELECT
TO authenticated
USING (
  data_shared_with_partners = true
  AND public.has_horse_partner_access(auth.uid(), horse_id)
);
