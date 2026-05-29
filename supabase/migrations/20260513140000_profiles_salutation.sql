-- Add salutation preference to user profiles.
-- Stores how Hufi addresses the user (du/Sie/name).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS salutation text;
