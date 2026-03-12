
-- Provider: nur SELECT (kein DELETE)
-- Admin: voller Zugriff
DROP POLICY IF EXISTS "Providers can manage academy videos" ON academy_videos;

CREATE POLICY "Providers can view academy videos"
  ON academy_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('provider', 'partner', 'employee', 'client', 'admin')
    )
  );

CREATE POLICY "Admins can manage academy videos"
  ON academy_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
