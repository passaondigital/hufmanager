-- Allow admins to INSERT into autoflow_settings for any provider
CREATE POLICY "Admins can insert autoflow settings"
ON public.autoflow_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE autoflow_settings for any provider
CREATE POLICY "Admins can update autoflow settings"
ON public.autoflow_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to SELECT autoflow_settings for any provider
CREATE POLICY "Admins can view all autoflow settings"
ON public.autoflow_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));