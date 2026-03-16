-- Grant table access to authenticated users (RLS policies already handle row-level security)
GRANT SELECT, INSERT, UPDATE ON public.pferdeakte_botschafter TO authenticated;
GRANT SELECT, INSERT ON public.pferdeakte_botschafter TO anon;