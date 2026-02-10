
-- Add missing review columns to employee_documentation
ALTER TABLE public.employee_documentation
ADD COLUMN IF NOT EXISTS review_notes text,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
