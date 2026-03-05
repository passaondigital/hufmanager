
-- 1. Add notification preferences to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'push' CHECK (notification_preference IN ('push', 'email', 'both', 'none')),
  ADD COLUMN IF NOT EXISTS notification_language TEXT DEFAULT 'de' CHECK (notification_language IN ('de', 'at', 'ch'));

-- 2. Create client_locations table for multiple stable addresses
CREATE TABLE IF NOT EXISTS public.client_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Hauptstall',
  address TEXT,
  zip_code TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;

-- Client can manage own locations
CREATE POLICY "client_own_locations" ON public.client_locations
  FOR ALL TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Provider can view locations of their clients
CREATE POLICY "provider_view_client_locations" ON public.client_locations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = client_locations.client_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
    )
  );

-- Admin access
CREATE POLICY "admin_all_client_locations" ON public.client_locations
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Add primary_location_id to horses
ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS primary_location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL;
