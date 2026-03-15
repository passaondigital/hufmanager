
-- 1) Extend horse_partner_access with owner approval and team sharing fields
ALTER TABLE public.horse_partner_access 
  ADD COLUMN IF NOT EXISTS owner_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS can_view_other_partners BOOLEAN DEFAULT false;

-- Backfill: If invited_by_client_id is set, mark as owner_approved
UPDATE public.horse_partner_access 
SET owner_approved = true, owner_approved_at = created_at 
WHERE invited_by_client_id IS NOT NULL AND owner_approved = false;

-- 2) Create horse_care_team table
CREATE TABLE IF NOT EXISTS public.horse_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_sharing_enabled BOOLEAN DEFAULT false,
  team_sharing_enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(horse_id)
);

ALTER TABLE public.horse_care_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages care team"
  ON public.horse_care_team FOR ALL
  USING (owner_id = auth.uid());

-- Helper function to avoid RLS recursion for provider/partner read access
CREATE OR REPLACE FUNCTION public.has_active_horse_partner_access(_user_id UUID, _horse_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.horse_partner_access
    WHERE partner_profile_id = _user_id 
      AND horse_id = _horse_id 
      AND status = 'active' 
      AND owner_approved = true
  )
$$;

CREATE POLICY "Partners can view care team status"
  ON public.horse_care_team FOR SELECT
  USING (
    public.has_active_horse_partner_access(auth.uid(), horse_id)
    OR public.is_provider_for_horse(auth.uid(), horse_id)
  );

-- 3) Create partner_recommendations table
CREATE TABLE IF NOT EXISTS public.partner_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE NOT NULL,
  recommended_by UUID REFERENCES auth.users(id) NOT NULL,
  recommended_partner_email TEXT,
  recommended_partner_name TEXT,
  recommended_partner_type TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE public.partner_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recommender and owner can access"
  ON public.partner_recommendations FOR ALL
  USING (recommended_by = auth.uid() OR owner_id = auth.uid());

-- 4) Extend profiles for provider discovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS service_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';
