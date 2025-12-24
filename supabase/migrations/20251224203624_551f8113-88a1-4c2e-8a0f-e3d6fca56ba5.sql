-- Drop the foreign key constraint on notifications.user_id that's causing the error
-- The constraint references auth.users but the user might not exist there yet
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;