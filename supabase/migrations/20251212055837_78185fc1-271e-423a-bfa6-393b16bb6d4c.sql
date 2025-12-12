-- Enable RLS on tables that have policies defined but RLS disabled
-- This fixes critical data exposure vulnerabilities

-- Enable RLS on profiles table (contains PII: emails, phone numbers, addresses)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on horses table (contains location/medical data)
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on contacts table (contains client contact information)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;