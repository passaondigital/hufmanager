-- HufiDataCore: generic append-only event store + latest entity state.
-- First producer: CopeCart IPN. Future producers can reuse the same schema.
--
-- Security model:
-- - no client-side access
-- - Edge Functions use the Supabase service role
-- - external agents should consume this through a server-side integration,
--   never by exposing the service-role key in a browser or client app

CREATE TABLE IF NOT EXISTS public.hufi_data_events (
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
  amount numeric(14,2),
  currency text,
  status text,
  is_test boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),
  payload_sha256 text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT hufi_data_events_source_not_blank CHECK (btrim(source) <> ''),
  CONSTRAINT hufi_data_events_source_event_not_blank CHECK (btrim(source_event_id) <> ''),
  CONSTRAINT hufi_data_events_event_type_not_blank CHECK (btrim(event_type) <> ''),
  CONSTRAINT hufi_data_events_source_event_unique UNIQUE (source, source_event_id)
);

CREATE INDEX IF NOT EXISTS hufi_data_events_received_idx
  ON public.hufi_data_events (received_at DESC);
CREATE INDEX IF NOT EXISTS hufi_data_events_source_type_received_idx
  ON public.hufi_data_events (source, event_type, received_at DESC);
CREATE INDEX IF NOT EXISTS hufi_data_events_transaction_idx
  ON public.hufi_data_events (source, transaction_id)
  WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hufi_data_events_subscription_idx
  ON public.hufi_data_events (source, subscription_id, received_at DESC)
  WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hufi_data_events_customer_idx
  ON public.hufi_data_events (source, lower(customer_email), received_at DESC)
  WHERE customer_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hufi_data_state (
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
  amount numeric(14,2),
  currency text,
  status text,
  is_test boolean NOT NULL DEFAULT false,
  last_occurred_at timestamptz NOT NULL DEFAULT now(),
  last_received_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT hufi_data_state_source_entity_unique UNIQUE (source, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS hufi_data_state_source_updated_idx
  ON public.hufi_data_state (source, last_received_at DESC);
CREATE INDEX IF NOT EXISTS hufi_data_state_subscription_idx
  ON public.hufi_data_state (source, subscription_id)
  WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hufi_data_state_customer_idx
  ON public.hufi_data_state (source, lower(customer_email))
  WHERE customer_email IS NOT NULL;

ALTER TABLE public.hufi_data_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hufi_data_state ENABLE ROW LEVEL SECURITY;

-- Intentionally no anon/authenticated policies. These tables are backend-only.
REVOKE ALL ON TABLE public.hufi_data_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.hufi_data_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hufi_data_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hufi_data_state TO service_role;

-- Latest-state writer. The WHERE clause prevents a delayed CopeCart retry from
-- overwriting a newer cancellation/refund/payment state.
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
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hufi_data_apply_state(
  text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, text, boolean, timestamptz, timestamptz, jsonb
) TO service_role;

COMMENT ON TABLE public.hufi_data_events IS
  'HufiDataCore append-only normalized events from external and internal systems.';
COMMENT ON TABLE public.hufi_data_state IS
  'HufiDataCore latest known state per source/entity for low-latency agent context.';
