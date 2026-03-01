-- Allow partners with can_view_hoof_history to read hoof_history entries
CREATE POLICY "Partners with hoof access can view hoof history"
ON public.hoof_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.horse_partner_access hpa
    WHERE hpa.horse_id = hoof_history.horse_id
      AND hpa.partner_profile_id = auth.uid()
      AND hpa.is_active = true
      AND hpa.status = 'active'
      AND hpa.can_view_hoof_history = true
  )
);