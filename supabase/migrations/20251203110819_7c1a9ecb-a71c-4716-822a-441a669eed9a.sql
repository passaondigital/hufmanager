-- Fix user_roles table policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Providers can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'provider'));

CREATE POLICY "Providers can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'provider'));

-- Fix update_updated_at_column function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;