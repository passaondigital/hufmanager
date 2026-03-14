
DROP POLICY IF EXISTS "Users can insert own botschafter" ON public.pferdeakte_botschafter;

CREATE POLICY "Users can register as botschafter"
ON public.pferdeakte_botschafter FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND email IS NOT NULL
  AND first_name IS NOT NULL
  AND last_name IS NOT NULL
  AND status = 'pending'
);
