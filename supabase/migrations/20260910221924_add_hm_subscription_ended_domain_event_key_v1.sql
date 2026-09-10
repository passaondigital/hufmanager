-- Group 1C (V2.0 foundation implementation):
-- hm_subscription_ended_domain_event_key_v1.
--
-- Implements EXACTLY the finalized V1.5 canonical-preimage/SHA-256
-- contract — no new format invented here. Scope: SUBSCRIPTION_ENDED ONLY,
-- pure computation, no table reads/writes, no now(), no network access.
--
-- Priority identity anchor: 1) provider_subscription_id,
-- 2) cancellation_source_event_id, 3) both missing -> INSUFFICIENT_IDENTITY,
-- no key generated. No subject_id fallback, ever — this function cannot be
-- called in a way that produces one, by construction (there is no
-- subject_id parameter at all).
--
-- Canonical preimage (V1.5, unchanged): six newline-separated
-- "field=value" lines, UTF-8, fixed order, no trailing newline:
--   version=1
--   event=subscription_ended
--   source=<source>
--   anchor_kind=<subscription|cancellation_event>
--   anchor_value=<exact provider_subscription_id OR
--                 cancellation_source_event_id, verbatim>
--   effective_end_date=<YYYY-MM-DD>
-- domain_event_key = 'sha256:' || lowercase-hex(SHA-256(preimage bytes)).
--
-- "Verbatim" per the finalized contract means no case-folding or trimming
-- is applied to the anchor value that enters the hash — btrim() below is
-- used ONLY to detect whether an anchor is present at all (distinguishing
-- NULL/empty/whitespace-only from a real value), never to mutate the
-- value that is actually hashed. Two inputs differing only by whitespace
-- or case intentionally produce different keys — this is contract-
-- faithful, not a bug.
--
-- Result is a tagged composite (V1.5 FUNCTION_RESULT_MODEL), never a bare
-- nullable string, so a caller cannot mistake INSUFFICIENT_IDENTITY for a
-- generated key.

CREATE TYPE public.hm_subscription_ended_domain_key_result AS (
  status text,             -- 'KEY_GENERATED' | 'INSUFFICIENT_IDENTITY'
  domain_event_key text,   -- set only when status = 'KEY_GENERATED'
  anchor_kind text,        -- 'subscription' | 'cancellation_event', set only when KEY_GENERATED
  anchor_value text,       -- set only when KEY_GENERATED
  reason text              -- set only when status = 'INSUFFICIENT_IDENTITY'
);

CREATE OR REPLACE FUNCTION public.hm_subscription_ended_domain_event_key_v1(
  p_source text,
  p_provider_subscription_id text,
  p_cancellation_source_event_id text,
  p_effective_end_date date
)
RETURNS public.hm_subscription_ended_domain_key_result
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_anchor_kind text;
  v_anchor_value text;
  v_preimage text;
  v_result public.hm_subscription_ended_domain_key_result;
BEGIN
  -- Not STRICT: provider_subscription_id and cancellation_source_event_id
  -- are legitimately NULL by design (that is exactly what selects the
  -- fallback anchor, or triggers INSUFFICIENT_IDENTITY) — a blanket
  -- NULL-in-NULL-out contract would be semantically wrong here.

  IF p_source IS NULL OR btrim(p_source) = '' THEN
    v_result.status := 'INSUFFICIENT_IDENTITY';
    v_result.reason := 'source is missing';
    RETURN v_result;
  END IF;

  IF p_effective_end_date IS NULL THEN
    v_result.status := 'INSUFFICIENT_IDENTITY';
    v_result.reason := 'effective_end_date is missing';
    RETURN v_result;
  END IF;

  IF p_provider_subscription_id IS NOT NULL AND btrim(p_provider_subscription_id) <> '' THEN
    v_anchor_kind := 'subscription';
    v_anchor_value := p_provider_subscription_id;
  ELSIF p_cancellation_source_event_id IS NOT NULL AND btrim(p_cancellation_source_event_id) <> '' THEN
    v_anchor_kind := 'cancellation_event';
    v_anchor_value := p_cancellation_source_event_id;
  ELSE
    v_result.status := 'INSUFFICIENT_IDENTITY';
    v_result.reason := 'both provider_subscription_id and cancellation_source_event_id are missing';
    RETURN v_result;
  END IF;

  -- Canonical preimage precondition (V1.5): no anchor value may contain a
  -- literal newline, which could otherwise create line-boundary ambiguity.
  IF position(chr(10) IN v_anchor_value) > 0 THEN
    v_result.status := 'INSUFFICIENT_IDENTITY';
    v_result.reason := 'anchor_value contains a newline, violates canonical preimage precondition';
    RETURN v_result;
  END IF;

  v_preimage :=
    'version=1' || chr(10) ||
    'event=subscription_ended' || chr(10) ||
    'source=' || p_source || chr(10) ||
    'anchor_kind=' || v_anchor_kind || chr(10) ||
    'anchor_value=' || v_anchor_value || chr(10) ||
    'effective_end_date=' || to_char(p_effective_end_date, 'YYYY-MM-DD');

  v_result.status := 'KEY_GENERATED';
  -- pgcrypto (digest/encode) lives in the `extensions` schema on this
  -- Supabase instance, not `public` — confirmed via pg_extension during
  -- acceptance testing (SET search_path = public alone hides it entirely,
  -- reproduced as "function does not exist"). Fully qualifying the call
  -- is preferred here over widening search_path: it makes the external
  -- dependency explicit at the call site rather than relying on
  -- search_path ordering. The explicit ::text cast on the algorithm
  -- literal remains necessary too — without it, PL/pgSQL fails to resolve
  -- the digest(text,text) vs digest(bytea,text) overload for an untyped
  -- string literal in this context, even though the identical call
  -- resolves fine in plain top-level SQL.
  v_result.domain_event_key := 'sha256:' || encode(extensions.digest(v_preimage, 'sha256'::text), 'hex');
  v_result.anchor_kind := v_anchor_kind;
  v_result.anchor_value := v_anchor_value;
  RETURN v_result;
END;
$$;
