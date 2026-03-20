-- Temporarily disable notification triggers that may cause issues during user creation
ALTER TABLE public.profiles DISABLE TRIGGER notify_admin_profile_changes;
ALTER TABLE public.profiles DISABLE TRIGGER on_new_profile_created;