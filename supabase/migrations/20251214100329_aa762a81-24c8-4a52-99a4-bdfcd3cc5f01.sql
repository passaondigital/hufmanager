-- Add RLS policy to allow clients to view their own contact record when linked via profile_id
CREATE POLICY "Clients can view own contact record"
ON public.contacts FOR SELECT
USING (
  (profile_id = auth.uid())
  AND (deleted_at IS NULL)
);