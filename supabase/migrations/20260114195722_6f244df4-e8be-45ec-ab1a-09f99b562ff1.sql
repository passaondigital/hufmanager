-- Add unique constraint on (user_id, role) for user_roles table
-- This is needed for the ON CONFLICT clause in the handle_new_user trigger

-- First drop the existing unique constraint on just user_id 
-- (since a user can have multiple roles in theory)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Create the composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key 
ON public.user_roles (user_id, role);