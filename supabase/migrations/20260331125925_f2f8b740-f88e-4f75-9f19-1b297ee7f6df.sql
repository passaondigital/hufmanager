-- Fix: Lifetime-Accounts (Pascal Schmid) dürfen nie 'expired' sein
-- PID-464546
UPDATE public.profiles
SET account_status = 'active'
WHERE id = '621111d0-404d-472a-8051-c78c804dba67';

-- PID-482429
UPDATE public.profiles
SET account_status = 'active'
WHERE id = '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090';