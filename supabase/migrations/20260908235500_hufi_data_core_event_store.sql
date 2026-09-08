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

COMMENT ON TABLE public.hufi_data_events IS
  'HufiDataCore append-only normalized events from external and internal systems.';
COMMENT ON TABLE public.hufi_data_state IS
  'HufiDataCore latest known state per source/entity for low-latency agent context.';
