
-- FIX 1: Tighten "Verbundene Profile sehen" policy - change OR to AND for access_grant checks
DROP POLICY IF EXISTS "Verbundene Profile sehen" ON public.profiles;

CREATE POLICY "Verbundene Profile sehen" ON public.profiles
FOR SELECT
USING (
  (id = auth.uid())
  OR (EXISTS (
    SELECT 1 FROM access_grants
    WHERE (
      (access_grants.client_id = auth.uid() AND access_grants.provider_id = profiles.id)
      OR (access_grants.provider_id = auth.uid() AND access_grants.client_id = profiles.id)
    )
    AND access_grants.status = 'active'
    AND access_grants.is_active = true
  ))
);

-- FIX 2: Tighten "Providers can view connected clients" - fix COALESCE(is_active, true) bug
DROP POLICY IF EXISTS "Providers can view connected clients" ON public.profiles;

CREATE POLICY "Providers can view connected clients" ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'provider') AND (
    created_by_provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
    )
  )
);

-- FIX 3: Restrict employee invitation token policy - add 7-day expiration
DROP POLICY IF EXISTS "Anyone can view by invitation_token" ON public.employee_profiles;

CREATE POLICY "Anyone can view by invitation_token" ON public.employee_profiles
FOR SELECT
USING (
  invitation_token IS NOT NULL
  AND invitation_accepted_at IS NULL
  AND created_at > (now() - interval '7 days')
);
