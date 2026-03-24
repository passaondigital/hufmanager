-- Fix: Demo isolation trigger should NOT block UPDATE operations (cleanup/deactivation)
-- and should allow demo providers to work with ghost profiles they created

CREATE OR REPLACE FUNCTION prevent_demo_real_access_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_emails text[] := ARRAY[
    'hufbearbeiter.hufmanager@gmail.com',
    'pferdebesitzer.hufmanager@gmail.com',
    'mitarbeiter.hufmanager@gmail.com',
    'partner.hufmanager@gmail.com',
    'hufmanagerbusiness@gmail.com',
    'hufmanagerstallbetreiber@gmail.com'
  ];
  provider_email text;
  client_email text;
  provider_is_demo boolean;
  client_is_demo boolean;
  client_is_ghost boolean;
BEGIN
  -- Allow UPDATE operations that deactivate/revoke (cleanup operations)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_active = false OR NEW.status IN ('revoked', 'rejected', 'cancelled') THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT email INTO provider_email FROM profiles WHERE id = NEW.provider_id;
  SELECT email INTO client_email FROM profiles WHERE id = NEW.client_id;
  
  provider_is_demo := provider_email = ANY(demo_emails);
  client_is_demo := client_email = ANY(demo_emails);
  
  -- Check if client is a ghost profile (created by provider, no auth user)
  client_is_ghost := NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.client_id
  );
  
  -- Allow demo providers to work with ghost profiles they created
  IF provider_is_demo AND client_is_ghost THEN
    RETURN NEW;
  END IF;
  
  IF (provider_is_demo AND NOT client_is_demo) OR (NOT provider_is_demo AND client_is_demo) THEN
    RAISE EXCEPTION 'Demo accounts cannot be connected to real accounts';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger (same definition, function logic changed)
DROP TRIGGER IF EXISTS trg_prevent_demo_real_access ON access_grants;
CREATE TRIGGER trg_prevent_demo_real_access
  BEFORE INSERT OR UPDATE ON access_grants
  FOR EACH ROW
  EXECUTE FUNCTION prevent_demo_real_access_grant();