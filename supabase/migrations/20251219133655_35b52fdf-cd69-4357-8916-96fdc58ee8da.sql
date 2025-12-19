-- Create atomic increment function for magic_links uses_count
CREATE OR REPLACE FUNCTION public.increment_magic_link_uses(link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.magic_links
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = link_id;
$$;