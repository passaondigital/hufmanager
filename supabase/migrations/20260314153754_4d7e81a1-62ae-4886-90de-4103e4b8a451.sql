
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only service role can insert botschafter" ON public.pferdeakte_botschafter;

-- Allow authenticated users to insert their own botschafter row
CREATE POLICY "Users can insert own botschafter"
ON public.pferdeakte_botschafter
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
