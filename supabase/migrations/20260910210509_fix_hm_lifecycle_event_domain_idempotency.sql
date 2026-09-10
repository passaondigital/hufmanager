-- Forward fix for hm_lifecycle_events' idempotency key.
--
-- CRITICAL finding (independent adversarial audit, V1.2.1): the original
-- UNIQUE(source, source_event_id) constraint (20260910150140_add_hm_lifecycle_events.sql)
-- cannot support one CopeCart event legitimately emitting two distinct
-- domain rows for the same source_event_id — e.g. trial_converted AND
-- subscription_activated from one payment.made event where the subject was
-- TRIAL_ACTIVE (see docs/HUFMANAGER_LIFECYCLE_IMPLEMENTATION_PLAN.md's
-- mapping table in hm-factengine). The second insert was silently rejected
-- as a false duplicate under the old key.
--
-- hm_lifecycle_events has no entity_id/entity_type concept (only
-- subject_id); source_event_id is derived 1:1 from a single CopeCart
-- transaction/delivery, so it can never legitimately span two different
-- subjects. A 3-column key (source, source_event_id, event_name) is
-- therefore sufficient — no subject_id/entity_id needed in the key.
--
-- Table-only change: drops and re-adds one UNIQUE constraint. No other
-- constraint, column, RLS policy, grant, or table is touched. No lifecycle
-- writer, no entitlements, no legacy billing change.

ALTER TABLE public.hm_lifecycle_events
  DROP CONSTRAINT hm_lifecycle_events_unique_source_event;

ALTER TABLE public.hm_lifecycle_events
  ADD CONSTRAINT hm_lifecycle_events_unique_source_event
  UNIQUE (source, source_event_id, event_name);
