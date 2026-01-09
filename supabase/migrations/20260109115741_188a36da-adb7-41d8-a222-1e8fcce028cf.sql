-- 1) Fix contacts policy: replace auth.users reference with profiles
DROP POLICY IF EXISTS "Final_Smart_Contact_Access" ON public.contacts;

CREATE POLICY "Contacts access for providers and owners"
ON public.contacts
FOR ALL
USING (
  provider_id = auth.uid()
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  provider_id = auth.uid()
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- 2) Fix horses policy: replace auth.users reference with profiles  
DROP POLICY IF EXISTS "Final_Smart_Horse_Access" ON public.horses;

CREATE POLICY "Horses access for owners and providers"
ON public.horses
FOR ALL
USING (
  owner_id = auth.uid()
  OR owner_id IN (
    SELECT c.profile_id FROM public.contacts c
    WHERE c.provider_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id IN (
    SELECT c.profile_id FROM public.contacts c
    WHERE c.provider_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
  )
);

-- 3) Remove duplicate INSERT policy on profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;