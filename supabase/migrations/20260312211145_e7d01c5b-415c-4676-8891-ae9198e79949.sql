-- Add partner client ownership columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS created_by_partner_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS managing_partner_id uuid REFERENCES auth.users(id);