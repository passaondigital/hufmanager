-- Re-enable triggers
ALTER TABLE public.profiles ENABLE TRIGGER on_new_profile_created;
ALTER TABLE public.profiles ENABLE TRIGGER notify_admin_profile_changes;

-- Set readable_id for the new business demo user
UPDATE public.profiles SET readable_id = 'BID-' || floor(100000 + random() * 900000)::int WHERE id = '09dbdd2f-c3f8-43ea-ab63-8d22857f1a57' AND readable_id IS NULL;