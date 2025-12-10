-- CRITICAL SECURITY FIX: Enable Row Level Security on all affected tables
-- These tables have RLS policies defined but RLS is not enabled, meaning policies are NOT enforced

-- Enable RLS on profiles table (contains PII: emails, phones, addresses)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on horses table (contains GPS coordinates, medical history)
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on contacts table (contains customer contact information)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on feedbacks table (contains customer testimonials)
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on hoof_analyses table (contains sensitive medical/hoof data)
ALTER TABLE public.hoof_analyses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on offers table (contains business configurations)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on services table (contains pricing configurations)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;