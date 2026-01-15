-- Fix Issue 1: Create missing access_grant between KID-839458 (Lara Schlemmer) and PID-482429 (Pascal Schmid)
-- Client ID: 3675001f-031a-45d7-83d1-d492e2ae67e5
-- Provider ID: 99e50f7f-c2d1-4ce4-ba99-d7dc800e5090

INSERT INTO public.access_grants (
  provider_id,
  client_id,
  is_active,
  can_view_basic,
  can_view_medical,
  can_create_appointments,
  status
)
VALUES (
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
  '3675001f-031a-45d7-83d1-d492e2ae67e5',
  true,
  true,
  true,
  true,
  'active'
)
ON CONFLICT DO NOTHING