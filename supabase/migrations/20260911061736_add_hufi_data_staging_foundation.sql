-- V2.4.1: hufi_data_events / hufi_data_state / hufi_data_apply_state
-- staging foundation mirror.
--
-- XXL-Staging (127.0.0.1:54322) ONLY, applied via psql -f. These three
-- objects already exist on Production (vnschgjxkzzwzefqlrji) as the
-- deployed hufi-data-core ingestion target, but were never present on
-- XXL-Staging -- confirmed read-only against both databases before
-- writing this file (production: information_schema.columns / pg_constraint
-- / pg_proc; staging: information_schema.tables / routines, 0 rows).
--
-- SCHEMA/FUNCTION MIRROR ONLY. Zero production data copied -- no row from
-- production ever touched this session; only structure (columns, types,
-- defaults, constraints, indexes, RLS state, function body, security,
-- grants) was read and is reproduced here. Both tables start and, after
-- this migration alone, remain at 0 rows.
--
-- No lifecycle wiring, no atomic ingest primitive, no Edge Function
-- change here -- that is the deliberately separate next step
-- (hufi_data_ingest_and_project_v1), so this migration and its review
-- stay small and unambiguous.

CREATE TABLE public.hufi_data_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source text NOT NULL,
  source_event_id text NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'event',

  entity_type text,
  entity_id text,

  product_id text,
  order_id text,
  transaction_id text,
  subscription_id text,

  customer_email text,
  customer_name text,

  amount numeric,
  currency text,
  status text,

  is_test boolean NOT NULL DEFAULT false,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),

  payload_sha256 text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT hufi_data_events_source_event_unique UNIQUE (source, source_event_id),
  CONSTRAINT hufi_data_events_source_not_blank CHECK (btrim(source) <> ''),
  CONSTRAINT hufi_data_events_source_event_not_blank CHECK (btrim(source_event_id) <> ''),
  CONSTRAINT hufi_data_events_event_type_not_blank CHECK (btrim(event_type) <> '')
);

CREATE INDEX hufi_data_events_received_at_idx
  ON public.hufi_data_events (received_at DESC);

CREATE INDEX hufi_data_events_source_event_type_received_idx
  ON public.hufi_data_events (source, event_type, received_at DESC);

CREATE INDEX hufi_data_events_source_subscription_received_idx
  ON public.hufi_data_events (source, subscription_id, received_at DESC)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX hufi_data_events_source_transaction_idx
  ON public.hufi_data_events (source, transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX hufi_data_events_source_email_received_idx
  ON public.hufi_data_events (source, lower(customer_email), received_at DESC)
  WHERE customer_email IS NOT NULL;

-- Same default-grant reality already documented and handled for
-- hm_lifecycle_events (ALTER DEFAULT PRIVILEGES on this schema grants ALL
-- on every new public table to anon/authenticated automatically) --
-- explicitly revoked here rather than relying on RLS alone, matching
-- production's real grant set (postgres/service_role only, confirmed
-- read-only, no client grants).

REVOKE ALL ON public.hufi_data_events FROM anon;
REVOKE ALL ON public.hufi_data_events FROM authenticated;

ALTER TABLE public.hufi_data_events ENABLE ROW LEVEL SECURITY;
-- No policies: matches production exactly (RLS enabled, 0 policies,
-- FORCE RLS false, postgres/service_role bypass RLS and need no policy).

CREATE TABLE public.hufi_data_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,

  last_source_event_id text NOT NULL,
  last_event_type text NOT NULL,

  product_id text,
  order_id text,
  transaction_id text,
  subscription_id text,

  customer_email text,
  customer_name text,

  amount numeric,
  currency text,
  status text,

  is_test boolean NOT NULL DEFAULT false,

  last_occurred_at timestamptz NOT NULL DEFAULT now(),
  last_received_at timestamptz NOT NULL DEFAULT now(),

  data jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT hufi_data_state_source_entity_unique UNIQUE (source, entity_type, entity_id)
);

CREATE INDEX hufi_data_state_source_received_idx
  ON public.hufi_data_state (source, last_received_at DESC);

CREATE INDEX hufi_data_state_source_subscription_idx
  ON public.hufi_data_state (source, subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX hufi_data_state_source_email_idx
  ON public.hufi_data_state (source, lower(customer_email))
  WHERE customer_email IS NOT NULL;

REVOKE ALL ON public.hufi_data_state FROM anon;
REVOKE ALL ON public.hufi_data_state FROM authenticated;

ALTER TABLE public.hufi_data_state ENABLE ROW LEVEL SECURITY;
-- No policies: matches production exactly, same reasoning as above.

-- hufi_data_apply_state: production body/semantics reproduced verbatim
-- (read directly from pg_get_functiondef on the deployed production
-- function before writing this). SECURITY DEFINER is required here (not
-- a house-style default) because the intended caller is the future
-- atomic ingest primitive running as the calling role, which must be able
-- to write hufi_data_state without a separate table grant, exactly
-- mirroring production's own already-deployed choice -- not introduced
-- fresh by this migration.

CREATE OR REPLACE FUNCTION public.hufi_data_apply_state(
  _source text,
  _entity_type text,
  _entity_id text,
  _last_source_event_id text,
  _last_event_type text,
  _product_id text,
  _order_id text,
  _transaction_id text,
  _subscription_id text,
  _customer_email text,
  _customer_name text,
  _amount numeric,
  _currency text,
  _status text,
  _is_test boolean,
  _last_occurred_at timestamptz,
  _last_received_at timestamptz,
  _data jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO public.hufi_data_state (
    source,
    entity_type,
    entity_id,
    last_source_event_id,
    last_event_type,
    product_id,
    order_id,
    transaction_id,
    subscription_id,
    customer_email,
    customer_name,
    amount,
    currency,
    status,
    is_test,
    last_occurred_at,
    last_received_at,
    data
  ) VALUES (
    _source,
    _entity_type,
    _entity_id,
    _last_source_event_id,
    _last_event_type,
    _product_id,
    _order_id,
    _transaction_id,
    _subscription_id,
    _customer_email,
    _customer_name,
    _amount,
    _currency,
    _status,
    COALESCE(_is_test, false),
    COALESCE(_last_occurred_at, now()),
    COALESCE(_last_received_at, now()),
    COALESCE(_data, '{}'::jsonb)
  )
  ON CONFLICT (source, entity_type, entity_id)
  DO UPDATE SET
    last_source_event_id = EXCLUDED.last_source_event_id,
    last_event_type = EXCLUDED.last_event_type,
    product_id = EXCLUDED.product_id,
    order_id = EXCLUDED.order_id,
    transaction_id = EXCLUDED.transaction_id,
    subscription_id = EXCLUDED.subscription_id,
    customer_email = EXCLUDED.customer_email,
    customer_name = EXCLUDED.customer_name,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    is_test = EXCLUDED.is_test,
    last_occurred_at = EXCLUDED.last_occurred_at,
    last_received_at = EXCLUDED.last_received_at,
    data = EXCLUDED.data
  WHERE EXCLUDED.last_occurred_at >= public.hufi_data_state.last_occurred_at;
$function$;

-- Same default-grant reality already documented for FUNCTIONS in
-- 20260910224049_restrict_lifecycle_helper_function_execute.sql: a bare
-- REVOKE FROM PUBLIC is not sufficient on this schema, explicit per-role
-- revokes are required.

REVOKE ALL ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) FROM anon;

REVOKE ALL ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) TO service_role;
