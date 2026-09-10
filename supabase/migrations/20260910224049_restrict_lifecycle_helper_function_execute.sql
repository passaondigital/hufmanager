-- V2.1.1: restrict EXECUTE on the two Group-1 pure helper functions to
-- least privilege. Grants-only change — no function body, return type,
-- volatility, hashing, timezone policy, search_path, name, arguments, or
-- business semantics touched.
--
-- Both functions were created with this schema's default privileges
-- (confirmed live via pg_proc.proacl before this migration: PUBLIC, anon,
-- authenticated, postgres, and service_role all held EXECUTE) — the same
-- default-grant-to-anon/authenticated behavior already found and handled
-- for the write primitive in the prior migration, here applied
-- retroactively to the two Group-1 read-only functions. Not a live write
-- vector (both are pure computation, no table access), but unnecessary
-- public API surface, tightened for least privilege.
--
-- Exact real signatures read from pg_proc before writing this file, not
-- guessed:
--   hm_subscription_ended_domain_event_key_v1(text, text, text, date)
--   hm_billing_effective_end_at_v1(date)
--
-- Nested-call safety: both hm_subscription_ended_domain_event_key_v1 and
-- hm_billing_effective_end_at_v1 are SECURITY INVOKER, as is the calling
-- primitive hm_apply_subscription_ended_outcome_v1 — confirmed live via
-- pg_proc.prosecdef before writing this migration. A SECURITY INVOKER
-- function's nested calls execute as the actual calling role throughout,
-- not the function owner, so a service_role caller of the primitive
-- retains its own EXECUTE grant on these two helpers after this lockdown
-- — no elevated/owner context is required or assumed. Verified empirically
-- in this migration's own acceptance tests, not merely reasoned about.

REVOKE ALL ON FUNCTION public.hm_subscription_ended_domain_event_key_v1(
  text, text, text, date
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.hm_subscription_ended_domain_event_key_v1(
  text, text, text, date
) FROM anon;

REVOKE ALL ON FUNCTION public.hm_subscription_ended_domain_event_key_v1(
  text, text, text, date
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.hm_subscription_ended_domain_event_key_v1(
  text, text, text, date
) TO service_role;

REVOKE ALL ON FUNCTION public.hm_billing_effective_end_at_v1(
  date
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.hm_billing_effective_end_at_v1(
  date
) FROM anon;

REVOKE ALL ON FUNCTION public.hm_billing_effective_end_at_v1(
  date
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.hm_billing_effective_end_at_v1(
  date
) TO service_role;
