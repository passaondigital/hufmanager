-- Add anamnesis tracking columns to horses table
ALTER TABLE public.horses
ADD COLUMN last_anamnesis_date timestamp with time zone DEFAULT NULL,
ADD COLUMN anamnesis_interval_months integer DEFAULT 12;

-- Add index for efficient querying of overdue assessments
CREATE INDEX idx_horses_anamnesis_due ON public.horses (last_anamnesis_date, anamnesis_interval_months)
WHERE last_anamnesis_date IS NOT NULL;