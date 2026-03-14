-- Allow partners to also create client profiles
DROP POLICY IF EXISTS "Providers can create client profiles" ON public.profiles;

CREATE POLICY "Providers and partners can create client profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role)
  OR has_role(auth.uid(), 'partner'::app_role)
);