-- Re-enable notification triggers
ALTER TABLE public.profiles ENABLE TRIGGER notify_admin_profile_changes;
ALTER TABLE public.profiles ENABLE TRIGGER on_new_profile_created;