CREATE POLICY "Admin can insert notifications for broadcast"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (is_master_admin());