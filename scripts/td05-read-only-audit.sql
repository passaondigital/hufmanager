-- TD-05 read-only audit. Run in Supabase SQL Editor; it performs no writes.
SELECT table_name, count(*) FILTER (WHERE organization_id IS NULL) AS null_organization_id
FROM (
  SELECT 'appointments'::text table_name, organization_id FROM public.appointments
  UNION ALL SELECT 'contacts', organization_id FROM public.contacts
  UNION ALL SELECT 'horses', organization_id FROM public.horses
  UNION ALL SELECT 'invoices', organization_id FROM public.invoices
  UNION ALL SELECT 'inventory_items', organization_id FROM public.inventory_items
  UNION ALL SELECT 'expenses', organization_id FROM public.expenses
) rows GROUP BY table_name ORDER BY table_name;

SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('appointments','contacts','horses','invoices','inventory_items','expenses')
ORDER BY tablename, policyname;

SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers WHERE event_object_schema='public'
  AND event_object_table IN ('appointments','contacts','horses','invoices','inventory_items','expenses')
ORDER BY table_name, trigger_name;
