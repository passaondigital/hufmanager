-- horse_status CHECK constraint (text column)
ALTER TABLE public.horses 
DROP CONSTRAINT IF EXISTS horses_horse_status_check;

ALTER TABLE public.horses
ADD CONSTRAINT horses_horse_status_check
CHECK (horse_status IN (
  'active',
  'sold', 
  'deceased',
  'stolen',
  'archived'
));