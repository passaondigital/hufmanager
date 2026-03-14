-- ============================================================
-- SECURITY FIX MIGRATION — 2026-03-14 (retry)
-- ============================================================

-- Fixes 1-3 and 5-6 already applied. Now fix WARNING 4:

-- WARNING 4: notifications — restrict provider inserts to connected users
DROP POLICY IF EXISTS "Providers can create notifications" ON notifications;
DROP POLICY IF EXISTS "Providers can create notifications for connected users" ON notifications;
CREATE POLICY "Providers can create notifications for connected users"
ON notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM access_grants
      WHERE access_grants.provider_id = auth.uid()
        AND access_grants.client_id = user_id
        AND access_grants.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM employee_profiles
      WHERE employee_profiles.user_id = notifications.user_id
        AND employee_profiles.provider_id = auth.uid()
        AND employee_profiles.status = 'active'
    )
  )
);