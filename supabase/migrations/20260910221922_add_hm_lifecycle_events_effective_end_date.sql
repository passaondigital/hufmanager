-- Group 1A (V2.0 foundation implementation): effective_end_date.
--
-- Provider-/fachliches Enddatum for a period-end cancellation. For CopeCart,
-- populated from payload.is_cancelled_for (a DATE, not a DateTime) once
-- hufi-data-core is extended to capture it — not yet done, out of scope
-- for this migration. Purely additive, no backfill, no derivation from
-- occurred_at/received_at/created_at/now()/a monthly interval. All
-- existing rows (0 today) stay NULL.
--
-- No index added: the later-specified reconciler query is not being built
-- in this session, and no other real query against this column exists yet
-- to justify one now — keeping the schema minimal per instruction.
--
-- No writer, no reconciler, no state/entitlement change, no provider
-- event consumption — table-only, additive, nullable column.

ALTER TABLE public.hm_lifecycle_events
  ADD COLUMN effective_end_date date;
