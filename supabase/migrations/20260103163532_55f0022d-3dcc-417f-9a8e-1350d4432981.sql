-- First add unique constraint on user_id to allow ON CONFLICT
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);