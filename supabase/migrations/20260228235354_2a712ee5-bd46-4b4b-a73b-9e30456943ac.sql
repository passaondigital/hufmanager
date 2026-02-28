
-- Provider account cascade delete function
CREATE OR REPLACE FUNCTION public.delete_provider_cascade(_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify the calling user IS the provider (self-delete only)
  IF auth.uid() != _provider_id THEN
    -- Also allow admins
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Keine Berechtigung zum Löschen dieses Accounts';
    END IF;
  END IF;

  -- 1. Cancel all future appointments
  UPDATE appointments 
  SET status = 'cancelled' 
  WHERE provider_id = _provider_id
  AND date >= CURRENT_DATE
  AND status NOT IN ('cancelled', 'completed');

  -- 2. Deactivate all access grants
  UPDATE access_grants 
  SET is_active = false, revoked_at = NOW() 
  WHERE provider_id = _provider_id AND is_active = true;

  -- 3. Delete business settings
  DELETE FROM business_settings WHERE user_id = _provider_id;

  -- 4. Delete services
  DELETE FROM services WHERE provider_id = _provider_id;

  -- 5. Delete autoflow settings
  DELETE FROM autoflow_settings WHERE provider_id = _provider_id;

  -- 6. Delete autoflow logs
  DELETE FROM autoflow_log WHERE provider_id = _provider_id;

  -- 7. Soft-delete contacts
  UPDATE contacts SET deleted_at = NOW() WHERE provider_id = _provider_id AND deleted_at IS NULL;

  -- 8. Delete daily tours
  DELETE FROM daily_tours WHERE provider_id = _provider_id;

  -- 9. Delete notifications
  DELETE FROM notifications WHERE user_id = _provider_id;

  -- 10. Delete push subscriptions
  DELETE FROM push_subscriptions WHERE user_id = _provider_id;

  -- 11. Delete AI chat messages
  DELETE FROM ai_chat_messages WHERE user_id = _provider_id;

  -- 12. Delete conversations where provider
  DELETE FROM conversations WHERE provider_id = _provider_id;

  -- 13. Delete employee profiles (as employer)
  DELETE FROM employee_profiles WHERE provider_id = _provider_id;

  -- 14. Soft-delete the provider profile
  UPDATE profiles 
  SET 
    deleted_at = NOW(),
    full_name = 'Gelöschter Benutzer',
    email = NULL,
    phone = NULL,
    stable_street = NULL,
    stable_zip = NULL,
    stable_city = NULL,
    stable_latitude = NULL,
    stable_longitude = NULL,
    avatar_url = NULL
  WHERE id = _provider_id;
END;
$$;
