-- Block direct client inserts to pferdeakte_botschafter
-- Inserts now go through register-botschafter edge function (service_role)
DROP POLICY IF EXISTS "Public insert botschafter" ON pferdeakte_botschafter;

CREATE POLICY "Only service role can insert botschafter"
ON pferdeakte_botschafter FOR INSERT
WITH CHECK (false);
