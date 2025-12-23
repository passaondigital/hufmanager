-- =====================================================
-- 1. CREATE RPC FUNCTION: delete_client_cascade
-- Soft deletes a client and all related data
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_client_cascade(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _provider_id uuid;
BEGIN
  -- Get current user
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

  -- 1. Soft delete the client profile
  UPDATE profiles 
  SET deleted_at = NOW() 
  WHERE id = _client_id;

  -- 2. Soft delete all horses owned by this client
  UPDATE horses 
  SET deleted_at = NOW() 
  WHERE owner_id = _client_id 
  AND deleted_at IS NULL;

  -- 3. Cancel all future appointments for horses owned by this client
  UPDATE appointments 
  SET status = 'cancelled' 
  WHERE horse_id IN (SELECT id FROM horses WHERE owner_id = _client_id)
  AND date >= CURRENT_DATE
  AND status NOT IN ('cancelled', 'completed');

  -- 4. Deactivate access grants for this client with the provider
  UPDATE access_grants 
  SET is_active = false, revoked_at = NOW() 
  WHERE client_id = _client_id 
  AND provider_id = _provider_id;
END;
$$;

-- =====================================================
-- 2. CREATE RPC FUNCTION: delete_horse_safe
-- Soft deletes a horse and cancels future appointments
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_horse_safe(_horse_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _provider_id uuid;
  _owner_id uuid;
BEGIN
  -- Get current user
  _provider_id := auth.uid();
  
  -- Get the horse owner
  SELECT owner_id INTO _owner_id 
  FROM horses 
  WHERE id = _horse_id AND deleted_at IS NULL;
  
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Pferd nicht gefunden';
  END IF;

  -- Verify the provider has access to this horse
  IF NOT (
    _owner_id = _provider_id  -- Owner can delete their own horse
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = _owner_id 
      AND created_by_provider_id = _provider_id
    )
    OR EXISTS (
      SELECT 1 FROM access_grants 
      WHERE client_id = _owner_id 
      AND provider_id = _provider_id 
      AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung zum Löschen dieses Pferdes';
  END IF;

  -- 1. Soft delete the horse
  UPDATE horses 
  SET deleted_at = NOW() 
  WHERE id = _horse_id;

  -- 2. Cancel all future appointments for this horse
  UPDATE appointments 
  SET status = 'cancelled' 
  WHERE horse_id = _horse_id
  AND date >= CURRENT_DATE
  AND status NOT IN ('cancelled', 'completed');
END;
$$;

-- =====================================================
-- 3. UPDATE RLS POLICIES FOR HORSES
-- Allow providers to update/delete horses via access_grants
-- =====================================================

-- Drop existing restrictive DELETE policies if they exist
DROP POLICY IF EXISTS "Providers can delete horses for created clients" ON horses;
DROP POLICY IF EXISTS "Providers can delete horses with active access" ON horses;
DROP POLICY IF EXISTS "Clients can delete own horses" ON horses;

-- Create unified DELETE policy for clients (owners)
CREATE POLICY "Clients can delete own horses" 
ON horses 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create unified DELETE policy for providers with access
CREATE POLICY "Providers can delete horses with access" 
ON horses 
FOR DELETE 
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND (
    -- Provider created the client who owns this horse
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = horses.owner_id 
      AND p.created_by_provider_id = auth.uid()
    )
    OR
    -- Provider has active access grant to the client
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.client_id = horses.owner_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
  )
);