-- Add length constraint on appointments.notes column
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_notes_length_check 
CHECK (notes IS NULL OR char_length(notes) <= 2000);

-- Add length constraint on appointments.completion_notes column for consistency
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_completion_notes_length_check 
CHECK (completion_notes IS NULL OR char_length(completion_notes) <= 5000);