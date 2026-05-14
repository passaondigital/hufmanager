import { supabase } from "@/integrations/supabase/client";
import { executeHufiAction, type HufiAction, type ActionResult } from "./hufi-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentTaskType =
  | "create_appointment"
  | "create_invoice"
  | "send_message"
  | "set_reminder"
  | "create_note"
  | "set_price_group"
  | "delete"
  | "generic_action";

export type AgentTaskStatus =
  | "suggested"
  | "approved"
  | "executing"
  | "executed"
  | "rejected"
  | "failed";

export interface AgentTask {
  id: string;
  user_id: string;
  session_id: string | null;
  type: AgentTaskType;
  status: AgentTaskStatus;
  payload: Record<string, unknown>;
  explanation: string | null;
  user_message: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  executed_at: string | null;
}

// ── Human-readable labels ─────────────────────────────────────────────────────

export function taskTypeLabel(type: AgentTaskType): string {
  switch (type) {
    case "create_appointment": return "Termin anlegen";
    case "create_invoice":     return "Rechnung erstellen";
    case "send_message":       return "Nachricht senden";
    case "set_reminder":       return "Erinnerung setzen";
    case "create_note":        return "Notiz erstellen";
    case "set_price_group":    return "Preisgruppe setzen";
    case "delete":             return "Löschen";
    case "generic_action":     return "Aktion";
  }
}

export function taskTypeIcon(type: AgentTaskType): string {
  switch (type) {
    case "create_appointment": return "📅";
    case "create_invoice":     return "🧾";
    case "send_message":       return "💬";
    case "set_reminder":       return "🔔";
    case "create_note":        return "📝";
    case "set_price_group":    return "🏷";
    case "delete":             return "🗑";
    case "generic_action":     return "⚡";
  }
}

// ── Map intent action string → AgentTaskType ──────────────────────────────────

export function intentActionToTaskType(action: string): AgentTaskType {
  switch (action) {
    case "create_invoice":     return "create_invoice";
    case "create_appointment": return "create_appointment";
    case "set_reminder":       return "set_reminder";
    case "send_message":       return "send_message";
    case "delete":             return "delete";
    default:                   return "generic_action";
  }
}

// Map AgentTaskType → HufiAction.type for executeHufiAction
function taskTypeToActionType(type: AgentTaskType): HufiAction["type"] {
  switch (type) {
    case "create_appointment": return "create_appointment";
    case "create_invoice":     return "send_invoice";
    case "send_message":       return "notify_client";
    case "set_reminder":       return "remind_dsgvo";
    case "create_note":        return "create_note";
    case "set_price_group":    return "set_price_group";
    case "delete":             return "remind_dsgvo";
    case "generic_action":     return "remind_dsgvo";
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createAgentTask(
  userId: string,
  type: AgentTaskType,
  payload: Record<string, unknown>,
  explanation: string,
  userMessage: string,
  sessionId?: string,
): Promise<AgentTask | null> {
  const { data, error } = await supabase
    .from("agent_tasks")
    .insert({
      user_id: userId,
      session_id: sessionId ?? null,
      type,
      status: "suggested",
      payload,
      explanation,
      user_message: userMessage,
    })
    .select()
    .single();

  if (error) {
    console.error("[agent-tasks] createAgentTask failed:", error.message);
    return null;
  }
  return data as AgentTask;
}

export async function getPendingTasks(userId: string): Promise<AgentTask[]> {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["suggested", "approved", "executing"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return (data ?? []) as AgentTask[];
}

export async function rejectTask(taskId: string): Promise<void> {
  await supabase
    .from("agent_tasks")
    .update({ status: "rejected" })
    .eq("id", taskId);
}

// Approve + execute in one call — status transitions through approved → executing → executed|failed
export async function approveAndExecuteTask(
  task: AgentTask,
  userId: string,
): Promise<ActionResult> {
  // Mark approved
  await supabase
    .from("agent_tasks")
    .update({ status: "approved" })
    .eq("id", task.id);

  // Mark executing
  await supabase
    .from("agent_tasks")
    .update({ status: "executing" })
    .eq("id", task.id);

  const action: HufiAction = {
    type: taskTypeToActionType(task.type),
    payload: task.payload,
    requiresConfirmation: false, // already confirmed by user
    dsgvoRelevant: task.type === "send_message" || task.type === "create_invoice",
    explanation: task.explanation ?? "",
  };

  let result: ActionResult;
  try {
    result = await executeHufiAction(action, userId);
  } catch (err) {
    result = { success: false, message: (err as Error).message };
  }

  // Persist result
  await supabase
    .from("agent_tasks")
    .update({
      status: result.success ? "executed" : "failed",
      result: { success: result.success, message: result.message, data: result.data ?? null },
      executed_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  return result;
}
