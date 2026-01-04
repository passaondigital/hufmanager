-- Create master admin check function
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'passaondigital@gmail.com',
    false
  )
$$;

-- Create admin_notes table for Dev-Brain
CREATE TABLE public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  type text NOT NULL DEFAULT 'idea' CHECK (type IN ('bug', 'idea', 'prompt', 'task')),
  status text NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'in_progress', 'done')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notes
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only master admin can access admin_notes
CREATE POLICY "Master admin full access to admin_notes"
ON public.admin_notes FOR ALL
USING (is_master_admin())
WITH CHECK (is_master_admin());

-- Add master admin policies to core tables

-- profiles: Master admin can see all
CREATE POLICY "Master admin can view all profiles"
ON public.profiles FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can update all profiles"
ON public.profiles FOR UPDATE
USING (is_master_admin());

CREATE POLICY "Master admin can delete all profiles"
ON public.profiles FOR DELETE
USING (is_master_admin());

-- horses: Master admin can see all
CREATE POLICY "Master admin can view all horses"
ON public.horses FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can update all horses"
ON public.horses FOR UPDATE
USING (is_master_admin());

-- appointments: Master admin can see all
CREATE POLICY "Master admin can view all appointments"
ON public.appointments FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can update all appointments"
ON public.appointments FOR UPDATE
USING (is_master_admin());

-- media_assets: Master admin can see all
CREATE POLICY "Master admin can view all media_assets"
ON public.media_assets FOR SELECT
USING (is_master_admin());

-- invoices: Master admin can see all
CREATE POLICY "Master admin can view all invoices"
ON public.invoices FOR SELECT
USING (is_master_admin());

-- access_grants: Master admin can see all
CREATE POLICY "Master admin can view all access_grants"
ON public.access_grants FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can update all access_grants"
ON public.access_grants FOR UPDATE
USING (is_master_admin());

-- business_settings: Master admin can see all
CREATE POLICY "Master admin can view all business_settings"
ON public.business_settings FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can update all business_settings"
ON public.business_settings FOR UPDATE
USING (is_master_admin());

-- user_roles: Master admin can see all
CREATE POLICY "Master admin can view all user_roles"
ON public.user_roles FOR SELECT
USING (is_master_admin());

CREATE POLICY "Master admin can manage all user_roles"
ON public.user_roles FOR ALL
USING (is_master_admin())
WITH CHECK (is_master_admin());

-- leads: Master admin can see all
CREATE POLICY "Master admin can view all leads"
ON public.leads FOR SELECT
USING (is_master_admin());

-- notifications: Master admin can see all
CREATE POLICY "Master admin can view all notifications"
ON public.notifications FOR SELECT
USING (is_master_admin());

-- hoof_analyses: Master admin can see all
CREATE POLICY "Master admin can view all hoof_analyses"
ON public.hoof_analyses FOR SELECT
USING (is_master_admin());

-- conversations: Master admin can see all
CREATE POLICY "Master admin can view all conversations"
ON public.conversations FOR SELECT
USING (is_master_admin());

-- messages: Master admin can see all
CREATE POLICY "Master admin can view all messages"
ON public.messages FOR SELECT
USING (is_master_admin());

-- Trigger for updated_at
CREATE TRIGGER update_admin_notes_updated_at
BEFORE UPDATE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();