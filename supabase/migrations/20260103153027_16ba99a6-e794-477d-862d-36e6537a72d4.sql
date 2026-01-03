-- Allow authenticated users to self-heal "ghost user" cases by inserting their own profile row
-- (Users already have UPDATE access to their own profile via existing policies.)

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
