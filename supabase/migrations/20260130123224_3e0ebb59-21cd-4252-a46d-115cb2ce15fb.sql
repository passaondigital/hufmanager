-- Enable all modules for demo provider account
UPDATE profiles 
SET 
  feature_statuses = jsonb_build_object(
    'module_invoicing', 'public',
    'module_chat', 'public',
    'module_maps', 'public',
    'module_academy', 'public',
    'module_hufanalyse', 'public',
    'module_network', 'public',
    'module_analytics', 'public',
    'beta_features', 'public',
    'module_team', 'public'
  ),
  feature_flags = jsonb_build_object(
    'module_invoicing', true,
    'module_chat', true,
    'module_maps', true,
    'module_academy', true,
    'module_hufanalyse', true,
    'module_network', true,
    'module_analytics', true,
    'beta_features', true
  ),
  plan_override = 'lifetime_grant'
WHERE email = 'hufbearbeiter.hufmanager@gmail.com';