
-- Revoke access_grants where demo provider is connected to non-demo clients
DO $$
DECLARE
  demo_ids uuid[] := ARRAY[
    'ecb7497b-8c60-493e-9da0-b2bd71d3001e',
    '00787f97-7d74-4ff7-8316-c7801afdc47c',
    '76224f11-043d-48ee-a3c8-5b18927d1ab9',
    '774110c0-8123-40ad-8da6-78e244aa83c4',
    '09dbdd2f-c3f8-43ea-ab63-8d22857f1a57',
    '75b04a0c-1462-4ddb-87ef-5d979ce1bbac'
  ];
BEGIN
  UPDATE access_grants
  SET is_active = false, status = 'revoked', revoked_at = now()
  WHERE provider_id = ANY(demo_ids) 
    AND client_id != ALL(demo_ids)
    AND is_active = true;

  UPDATE access_grants
  SET is_active = false, status = 'revoked', revoked_at = now()
  WHERE client_id = ANY(demo_ids) 
    AND provider_id != ALL(demo_ids)
    AND is_active = true;

  UPDATE horse_partner_access
  SET is_active = false
  WHERE (partner_profile_id = ANY(demo_ids) 
    AND horse_id NOT IN (SELECT id FROM horses WHERE owner_id = ANY(demo_ids)))
    AND is_active = true;

  UPDATE horse_partner_access
  SET is_active = false
  WHERE (partner_profile_id != ALL(demo_ids)
    AND horse_id IN (SELECT id FROM horses WHERE owner_id = ANY(demo_ids)))
    AND is_active = true;

  UPDATE employee_horse_access
  SET can_view = false, can_edit = false, can_add_notes = false
  WHERE (employee_id = ANY(demo_ids)
    AND horse_id NOT IN (SELECT id FROM horses WHERE owner_id = ANY(demo_ids)));

  UPDATE employee_horse_access
  SET can_view = false, can_edit = false, can_add_notes = false
  WHERE (employee_id != ALL(demo_ids)
    AND horse_id IN (SELECT id FROM horses WHERE owner_id = ANY(demo_ids)));
END $$;

-- Trigger to prevent future cross-contamination
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
BEGIN
  SELECT email INTO provider_email FROM profiles WHERE id = NEW.provider_id;
  SELECT email INTO client_email FROM profiles WHERE id = NEW.client_id;
  
  provider_is_demo := provider_email = ANY(demo_emails);
  client_is_demo := client_email = ANY(demo_emails);
  
  IF (provider_is_demo AND NOT client_is_demo) OR (NOT provider_is_demo AND client_is_demo) THEN
    RAISE EXCEPTION 'Demo accounts cannot be connected to real accounts';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_demo_real_access ON access_grants;
CREATE TRIGGER trg_prevent_demo_real_access
  BEFORE INSERT OR UPDATE ON access_grants
  FOR EACH ROW
  EXECUTE FUNCTION prevent_demo_real_access_grant();
