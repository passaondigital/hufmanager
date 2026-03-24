-- Re-activate access_grants for ghost profiles connected to demo provider
-- Ghost profiles have no auth.users entry and are managed by the provider
UPDATE access_grants
SET is_active = true, status = 'active', revoked_at = NULL
WHERE provider_id = 'ecb7497b-8c60-493e-9da0-b2bd71d3001e'
AND client_id IN (
  SELECT ag.client_id 
  FROM access_grants ag
  WHERE ag.provider_id = 'ecb7497b-8c60-493e-9da0-b2bd71d3001e'
  AND ag.status = 'revoked'
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ag.client_id)
);