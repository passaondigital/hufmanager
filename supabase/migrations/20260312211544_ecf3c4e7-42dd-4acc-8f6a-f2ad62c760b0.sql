-- Add provider_id and granted_by columns to employee_horse_access
ALTER TABLE public.employee_horse_access
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id);

-- Backfill provider_id from employee_profiles for existing rows
UPDATE public.employee_horse_access eha
SET provider_id = ep.provider_id
FROM public.employee_profiles ep
WHERE ep.user_id = eha.employee_id
  AND eha.provider_id IS NULL;

-- Drop old unique constraint and create new one
ALTER TABLE public.employee_horse_access
  DROP CONSTRAINT IF EXISTS employee_horse_access_employee_id_horse_id_key;

ALTER TABLE public.employee_horse_access
  ADD CONSTRAINT employee_horse_access_employee_horse_unique UNIQUE (employee_id, horse_id);

-- Update RLS: providers can manage access for their employees
DROP POLICY IF EXISTS "providers_manage_employee_access" ON public.employee_horse_access;
CREATE POLICY "providers_manage_employee_access"
  ON public.employee_horse_access
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());