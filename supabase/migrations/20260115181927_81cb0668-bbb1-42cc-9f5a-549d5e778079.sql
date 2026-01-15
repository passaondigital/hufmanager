-- Fix legacy/nullable flags so existing connections actually count as active
-- Some rows have status='active' but is_active is NULL, which breaks RLS checks and app queries.

update public.access_grants
set is_active = true,
    updated_at = now()
where status = 'active'
  and is_active is null;