
-- Fix delete_client_cascade: deactivate access_grants BEFORE soft-deleting the profile
-- Also add exception handling for robustness
CREATE OR REPLACE FUNCTION public.delete_client_cascade(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _provider_id uuid;
BEGIN
  _provider_id := auth.uid();

  -- Verify the provider has access to this client
  IF NOT (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = _client_id 
      AND created_by_provider_id = _provider_id
    )
    OR EXISTS (
      SELECT 1 FROM access_grants 
      WHERE client_id = _client_id 
      AND provider_id = _provider_id 
      AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung zum Löschen dieses Kunden';
  END IF;

  -- 1. FIRST: Deactivate access grants (before soft-deleting profile, 
  --    because validate_access_grant_roles checks deleted_at IS NULL)
  UPDATE access_grants 
  SET is_active = false, revoked_at = NOW() 
  WHERE client_id = _client_id 
  AND provider_id = _provider_id;

  -- 2. Cancel all future appointments for horses owned by this client
  UPDATE appointments 
  SET status = 'cancelled' 
  WHERE horse_id IN (SELECT id FROM horses WHERE owner_id = _client_id)
  AND date >= CURRENT_DATE
  AND status NOT IN ('cancelled', 'completed');

  -- 3. Soft delete all horses owned by this client
  UPDATE horses 
  SET deleted_at = NOW() 
  WHERE owner_id = _client_id 
  AND deleted_at IS NULL;

  -- 4. LAST: Soft delete the client profile
  UPDATE profiles 
  SET deleted_at = NOW() 
  WHERE id = _client_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Fehler beim Löschen: %', SQLERRM;
END;
$$;
