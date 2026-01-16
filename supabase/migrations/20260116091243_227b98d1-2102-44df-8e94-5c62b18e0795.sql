-- Create master_admins table for managing super admins without hardcoded values
CREATE TABLE IF NOT EXISTS public.master_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on master_admins
ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;

-- Only master admins can read the master_admins table
CREATE POLICY "Master admins can view master_admins"
ON public.master_admins FOR SELECT
TO authenticated
USING (public.is_master_admin());

-- Migrate existing hardcoded admin email to the table
INSERT INTO public.master_admins (email) 
VALUES ('passaondigital@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Update is_master_admin() function to use the table instead of hardcoded email
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.master_admins
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$;