-- Remove the foreign key constraint that prevents providers from creating customer profiles
-- Providers need to create "placeholder" profiles for customers who haven't signed up yet
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;