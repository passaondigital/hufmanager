-- Fix stallbetreiber demo user role
UPDATE public.profiles SET role = 'client' WHERE id = '75b04a0c-1462-4ddb-87ef-5d979ce1bbac';
UPDATE public.user_roles SET role = 'client' WHERE user_id = '75b04a0c-1462-4ddb-87ef-5d979ce1bbac';