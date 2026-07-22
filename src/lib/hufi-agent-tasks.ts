import type { HufiAction } from "./hufi-actions";

// ── Types ─────────────────────────────────────────────────────────────────────
//
// Einzelaktionen, die der Agent vorschlägt (z.B. "Rechnung erstellen"), laufen
// seit der Konsolidierung als Ein-Schritt-Task über hufi_task_queue
// (siehe hufi-task-engine.ts: createActionTask / execute_agent_action).
// Dieses Modul enthält nur noch die reinen Typ-/Label-Mappings.

export type AgentTaskType =
  | "create_appointment"
  | "update_appointment"
  | "create_invoice"
  | "send_message"
  | "set_reminder"
  | "create_note"
  | "set_price_group"
  | "add_expense"
  | "delete"
  | "generic_action";

// ── Human-readable labels ─────────────────────────────────────────────────────

export function taskTypeLabel(type: AgentTaskType): string {
  switch (type) {
    case "create_appointment": return "Termin anlegen";
    case "update_appointment": return "Termin ändern";
    case "create_invoice":     return "Rechnung erstellen";
    case "send_message":       return "Nachricht senden";
    case "set_reminder":       return "Erinnerung setzen";
    case "create_note":        return "Notiz erstellen";
    case "set_price_group":    return "Preisgruppe setzen";
    case "add_expense":        return "Ausgabe erfassen";
    case "delete":             return "Löschen";
    case "generic_action":     return "Aktion";
  }
}

export function taskTypeIcon(type: AgentTaskType): string {
  switch (type) {
    case "create_appointment": return "📅";
    case "update_appointment": return "📅";
    case "create_invoice":     return "🧾";
    case "send_message":       return "💬";
    case "set_reminder":       return "🔔";
    case "create_note":        return "📝";
    case "set_price_group":    return "🏷";
    case "add_expense":        return "💸";
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
    case "add_expense":        return "add_expense";
    case "set_price_group":    return "set_price_group";
    case "delete":             return "delete";
    default:                   return "generic_action";
  }
}

// Map AgentTaskType → HufiAction.type for executeHufiAction
export function taskTypeToActionType(type: AgentTaskType): HufiAction["type"] {
  switch (type) {
    case "create_appointment": return "create_appointment";
    case "update_appointment": return "update_appointment";
    case "create_invoice":     return "send_invoice";
    case "send_message":       return "notify_client";
    case "set_reminder":       return "remind_dsgvo";
    case "create_note":        return "create_note";
    case "set_price_group":    return "set_price_group";
    case "add_expense":        return "add_expense";
    // "delete" heißt heute konkret: Termin stornieren (kein echtes DELETE,
    // siehe AGENT_ANALYSE.md Etappe 1, Entscheidung B). Andere Lösch-Ziele
    // (Rechnung, Notiz) sind hier bewusst nicht abgedeckt -- das ACTION_KW
    // "lösche"/"storniere" wird aktuell nur für Termine ausgeführt.
    case "delete":             return "cancel_appointment";
    case "generic_action":     return "remind_dsgvo";
  }
}
