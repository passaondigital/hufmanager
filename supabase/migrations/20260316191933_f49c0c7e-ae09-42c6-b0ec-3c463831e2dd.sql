-- Temporarily disable the notification trigger that may reference non-existent columns
ALTER TABLE public.profiles DISABLE TRIGGER on_new_profile_created;
ALTER TABLE public.profiles DISABLE TRIGGER notify_admin_profile_changes;