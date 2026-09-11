-- HufManager Slim — Access/Entitlement V1, Phase 6: repair/reconciliation.
--
-- Deliberately thin: it does not re-implement any business rule. It finds
-- hm_lifecycle_events rows that are candidates for HufManager Slim
-- entitlement projection but are missing or stale on product_entitlements
-- (no row yet, or the row's last_applied_event_occurred_at is older than
-- this event), and replays them through the exact same canonical writer
-- (hm_project_hufmanager_entitlement_v1) used by the live trigger path --
-- so every business rule, the out-of-order guard, and the is_test/product
-- gating all apply identically to a "live" projection and a "repaired" one.
--
-- Never rewrites hm_lifecycle_events or hufi_data_events (read-only against
-- both). Never deletes product_entitlements rows. Never invents a business
-- fact not already present in hm_lifecycle_events.
--
-- Not scheduled by this migration (Phase 6 instruction: "Noch KEIN neuer
-- Production Cron... Falls Scheduler sinnvoll: nur PLANEN, nicht
-- aktivieren"). Callable manually, or wired to XXL staging's existing
-- 15-minute reconciler cadence later as an explicit, separate decision.

CREATE OR REPLACE FUNCTION public.hm_reconcile_hufmanager_entitlements_v1(_batch_size integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_event public.hm_lifecycle_events%ROWTYPE;
  v_scanned integer := 0;
  v_applied integer := 0;
  v_errors integer := 0;
  v_started timestamptz := clock_timestamp();
BEGIN
  FOR v_event IN
    SELECT le.*
      FROM public.hm_lifecycle_events le
      LEFT JOIN public.product_entitlements pe
        ON pe.user_id = le.subject_id
       AND pe.product = 'HUFMANAGER'
       AND pe.plan = 'HUFMANAGER_SLIM'
     WHERE le.event_name IN (
             'payment_succeeded', 'subscription_cancelled', 'subscription_ended',
             'payment_failed', 'subscription_paused', 'subscription_resumed',
             'subscription_frozen', 'trial_started', 'trial_converted'
           )
       AND (
             pe.id IS NULL
          OR pe.last_applied_event_occurred_at IS NULL
          OR pe.last_applied_event_occurred_at < le.occurred_at
       )
     ORDER BY le.occurred_at ASC
     LIMIT GREATEST(_batch_size, 1)
  LOOP
    v_scanned := v_scanned + 1;
    BEGIN
      PERFORM public.hm_project_hufmanager_entitlement_v1(v_event);
      v_applied := v_applied + 1;
    EXCEPTION WHEN OTHERS THEN
      -- One candidate's failure must never abort the batch or touch
      -- lifecycle truth -- isolate it the same way the live trigger does.
      v_errors := v_errors + 1;
      PERFORM public._hm_reconciliation_issue_upsert_v1(
        'ENTITLEMENT_RECONCILE_UNEXPECTED_ERROR', 'HIGH', v_event.id,
        v_event.source::text, v_event.subject_id, v_event.provider_subscription_id, v_event.source_event_id, NULL,
        jsonb_build_object('event_name', v_event.event_name, 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM)
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'batch_size_used', _batch_size,
    'scanned', v_scanned,
    'applied', v_applied,
    'errors', v_errors,
    'duration_ms', round(extract(epoch FROM clock_timestamp() - v_started) * 1000)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hm_reconcile_hufmanager_entitlements_v1(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_reconcile_hufmanager_entitlements_v1(integer) FROM anon;
REVOKE ALL ON FUNCTION public.hm_reconcile_hufmanager_entitlements_v1(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hm_reconcile_hufmanager_entitlements_v1(integer) TO service_role;
