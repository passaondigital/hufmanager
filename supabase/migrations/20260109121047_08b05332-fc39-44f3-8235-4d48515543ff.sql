-- Fix Supabase Auth 500 on /token caused by NULL token columns
-- (Data repair only: set token fields to empty string where they are NULL)

UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;

UPDATE auth.users
SET recovery_token = ''
WHERE recovery_token IS NULL;

UPDATE auth.users
SET email_change_token_new = ''
WHERE email_change_token_new IS NULL;

UPDATE auth.users
SET email_change_token_current = ''
WHERE email_change_token_current IS NULL;