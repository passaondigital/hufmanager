-- Group 1D (V2.0 foundation implementation): hm_billing_effective_end_at_v1.
--
-- Implements HM_BILLING_EFFECTIVE_END_V1 (finalized policy): a period-end
-- cancelled subscription remains active through the entirety of
-- effective_end_date; the fachlich-technical end instant is the start of
-- the following calendar day, Europe/Berlin (IANA). Example:
-- effective_end_date=2026-10-10 -> 2026-10-11 00:00 Europe/Berlin.
-- DE-FIRST V1 default, explicitly not a permanent global solution — a
-- future per-tenant billing_timezone is a versioned V2 extension; this
-- function's own name is versioned specifically so historical callers/
-- results are never silently reinterpreted by a future policy change.
--
-- Volatility: STABLE, not IMMUTABLE. This function's output depends only
-- on its input date and the Europe/Berlin IANA timezone rules — but those
-- rules are system tzdata, not truly immutable data (a future tzdata
-- update changing DST rules could in principle change this function's
-- output for the same input across different points in time, even though
-- it is fully deterministic within any single query/transaction). Postgres
-- convention treats named-timezone conversions as STABLE for exactly this
-- reason — IMMUTABLE would incorrectly promise the output can never
-- change, VOLATILE would be too weak (no side effects, no now(), no
-- mutable table dependency). Not blindly defaulted — verified against
-- pgcrypto's own digest() volatility (IMMUTABLE, used by the sibling
-- Group 1C function) as a contrasting, correctly-different case.
--
-- STRICT (RETURNS NULL ON NULL INPUT): the only parameter is
-- effective_end_date; a NULL date has no meaningful effective end at all,
-- so NULL-in/NULL-out is the correct, minimal contract here — no
-- INSUFFICIENT_IDENTITY-style tagged result is needed for a single-input
-- pure date function.
--
-- SECURITY INVOKER (not DEFINER): pure computation, no table access, no
-- elevated privilege needed — matches this session's own established
-- principle of not adding an unnecessary SECURITY DEFINER surface.
--
-- 00:00 local time is never ambiguous or non-existent for any calendar
-- date in Europe/Berlin: both real DST transitions in this zone happen at
-- 02:00/03:00 local, well after midnight, so "start of day" never lands on
-- the transition itself — verified against the actual 2026 transition
-- dates as part of this migration's acceptance tests.

CREATE OR REPLACE FUNCTION public.hm_billing_effective_end_at_v1(
  effective_end_date date
)
RETURNS timestamptz
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ((effective_end_date + 1)::timestamp AT TIME ZONE 'Europe/Berlin');
$$;
