
-- ============================================
-- CLEANUP: Verwaiste access_grants löschen
-- ============================================

-- Lösche access_grants die auf nicht-existierende Profile verweisen
DELETE FROM public.access_grants
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = access_grants.client_id 
  AND p.deleted_at IS NULL
);

-- Lösche verwaiste Profile (ohne auth.users und soft-deleted)
-- Diese wurden versehentlich erstellt und haben keine Verwendung
DELETE FROM public.profiles
WHERE deleted_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = profiles.id);

-- Setze Rollen für alle verbleibenden Profile ohne Rolle
-- (die von Providern erstellt wurden)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'client'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role IS NULL
  AND p.deleted_at IS NULL
  AND p.created_by_provider_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
