-- HufManager Slim production baseline verification (read-only).
--
-- This file contains SELECTs only. Run it solely with a read-only database
-- role/transaction. It must never be used as a migration or passed to db push.
-- A valid reconciled production baseline returns passed=true for every row.

WITH expected_columns(column_name, data_type, udt_name) AS (
  VALUES
    ('live_lat', 'double precision', 'float8'),
    ('live_lng', 'double precision', 'float8'),
    ('live_accuracy', 'double precision', 'float8'),
    ('live_location_at', 'timestamp with time zone', 'timestamptz'),
    ('delay_minutes', 'integer', 'int4'),
    ('delay_reason', 'text', 'text'),
    ('delay_reported_at', 'timestamp with time zone', 'timestamptz')
),
actual_columns AS (
  SELECT c.column_name, c.data_type, c.udt_name
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'daily_tours'
),
column_check AS (
  SELECT
    count(actual.column_name) = 7
      AND bool_and(
        actual.column_name IS NOT NULL
        AND actual.data_type = expected.data_type
        AND actual.udt_name = expected.udt_name
      ) AS passed,
    count(actual.column_name)::text || '/7 expected columns match' AS detail
  FROM expected_columns AS expected
  LEFT JOIN actual_columns AS actual USING (column_name)
),
function_check AS (
  SELECT
    count(*) = 1
      AND bool_and(NOT p.prosecdef)
      AND bool_and(coalesce(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=public']) AS passed,
    count(*)::text || ' matching SECURITY INVOKER function(s)' AS detail
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'sync_daily_tour_actual_distance'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
),
trigger_check AS (
  SELECT
    count(*) = 1
      AND bool_and(t.tgenabled <> 'D')
      AND bool_and(p.proname = 'sync_daily_tour_actual_distance') AS passed,
    count(*)::text || ' enabled matching trigger(s)' AS detail
  FROM pg_catalog.pg_trigger AS t
  JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname = 'vehicle_logs'
    AND t.tgname = 'sync_daily_tour_actual_distance_trigger'
    AND NOT t.tgisinternal
),
tour_history_check AS (
  SELECT
    count(*) = 1 AS passed,
    count(*)::text || ' production history row(s) for 20260817071323' AS detail
  FROM supabase_migrations.schema_migrations
  WHERE version = '20260817071323'
),
legacy_history_check AS (
  SELECT
    count(*) = 0 AS passed,
    count(*)::text || ' legacy history row(s) for 20260815130000' AS detail
  FROM supabase_migrations.schema_migrations
  WHERE version = '20260815130000'
),
inventory_rpc_check AS (
  SELECT
    pg_catalog.to_regprocedure('public.consume_inventory_stock(jsonb)') IS NULL AS passed,
    CASE
      WHEN pg_catalog.to_regprocedure('public.consume_inventory_stock(jsonb)') IS NULL
        THEN 'inventory RPC absent as required'
      ELSE 'inventory RPC unexpectedly present'
    END AS detail
),
inventory_history_check AS (
  SELECT
    count(*) = 0 AS passed,
    count(*)::text || ' inventory RPC history row(s) for 20260817114000' AS detail
  FROM supabase_migrations.schema_migrations
  WHERE version = '20260817114000'
)
SELECT 'tour_columns' AS check_name, passed, detail FROM column_check
UNION ALL
SELECT 'tour_function_security', passed, detail FROM function_check
UNION ALL
SELECT 'tour_distance_trigger', passed, detail FROM trigger_check
UNION ALL
SELECT 'tour_history_registered', passed, detail FROM tour_history_check
UNION ALL
SELECT 'legacy_tour_history_absent', passed, detail FROM legacy_history_check
UNION ALL
SELECT 'inventory_rpc_absent', passed, detail FROM inventory_rpc_check
UNION ALL
SELECT 'inventory_history_absent', passed, detail FROM inventory_history_check
ORDER BY check_name;
