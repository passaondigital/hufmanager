
-- Fix ecosystem_apps RLS
ALTER TABLE public.ecosystem_apps ENABLE ROW LEVEL SECURITY;

-- ecosystem_apps is a reference table - allow read for all authenticated users
CREATE POLICY "Authenticated users can view ecosystem apps"
  ON public.ecosystem_apps FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage ecosystem apps"
  ON public.ecosystem_apps FOR ALL
  USING (public.is_admin(auth.uid()));
