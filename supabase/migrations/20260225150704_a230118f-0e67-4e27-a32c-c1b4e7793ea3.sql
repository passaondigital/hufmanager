
-- Fix orphaned users without roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('db744207-177a-41cc-8e7b-5ac7aa707eb3', 'provider'::app_role),
  ('042c6cc6-7967-403c-8611-a0e3e01adf0a', 'client'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
