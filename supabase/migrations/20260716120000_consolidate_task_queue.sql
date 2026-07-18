-- ============================================================================
-- Schritt 5 (Hebel 5): agent_tasks + hufi_task_queue zu EINEM System zusammenführen
--
-- Der Client schreibt Einzelaktionen (vormals agent_tasks) jetzt als
-- Ein-Schritt-Tasks in hufi_task_queue (siehe hufi-task-engine.ts:
-- createActionTask / Tool "execute_agent_action").
--
-- Diese Migration überführt bestehende offene agent_tasks-Zeilen 1:1 in
-- hufi_task_queue und markiert agent_tasks als deprecated (nicht gedroppt,
-- um bestehende Referenzen/Historie nicht zu verlieren).
-- ============================================================================

INSERT INTO public.hufi_task_queue (
  id, user_id, title, description, trigger_phrase,
  status, priority, steps, current_step, context,
  result_summary, created_at, started_at, completed_at
)
SELECT
  at.id,
  at.user_id,
  CASE at.type
    WHEN 'create_appointment' THEN 'Termin anlegen'
    WHEN 'create_invoice'     THEN 'Rechnung erstellen'
    WHEN 'send_message'       THEN 'Nachricht senden'
    WHEN 'set_reminder'       THEN 'Erinnerung setzen'
    WHEN 'create_note'        THEN 'Notiz erstellen'
    WHEN 'delete'             THEN 'Löschen'
    ELSE 'Aktion'
  END,
  at.explanation,
  at.user_message,
  CASE at.status
    WHEN 'suggested' THEN 'pending'
    WHEN 'approved'  THEN 'awaiting_confirm'
    WHEN 'executing' THEN 'running'
    WHEN 'executed'  THEN 'done'
    WHEN 'rejected'  THEN 'cancelled'
    WHEN 'failed'    THEN 'failed'
    ELSE 'pending'
  END,
  5,
  jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(),
    'tool', 'execute_agent_action',
    'description', COALESCE(at.explanation, ''),
    'params', jsonb_build_object(
      'actionType', CASE at.type
        WHEN 'create_appointment' THEN 'create_appointment'
        WHEN 'create_invoice'     THEN 'send_invoice'
        WHEN 'send_message'       THEN 'notify_client'
        WHEN 'set_reminder'       THEN 'remind_dsgvo'
        WHEN 'create_note'        THEN 'create_note'
        WHEN 'delete'             THEN 'remind_dsgvo'
        ELSE 'remind_dsgvo'
      END,
      'payload', at.payload,
      'explanation', COALESCE(at.explanation, '')
    ),
    'status', CASE at.status WHEN 'executed' THEN 'done' WHEN 'failed' THEN 'failed' ELSE 'pending' END,
    'requires_confirm', true,
    'result', at.result
  )),
  CASE WHEN at.status IN ('executed', 'failed') THEN 1 ELSE 0 END,
  jsonb_build_object('sessionId', at.session_id, 'taskType', at.type, 'migratedFromAgentTasks', true),
  at.result->>'message',
  at.created_at,
  at.executed_at,
  at.executed_at
FROM public.agent_tasks at
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.agent_tasks IS
  'DEPRECATED (16.07.2026, Schritt 5 HUFI_ROADMAP): abgelöst durch hufi_task_queue. '
  'Nur noch zur historischen Referenz vorhanden, Client schreibt hier nicht mehr hinein.';
