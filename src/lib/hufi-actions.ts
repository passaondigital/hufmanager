import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { updateHufiMemory } from "./hufi-brain";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HufiAction {
  type:
    | "create_appointment"
    | "send_invoice"
    | "notify_client"
    | "request_permission"
    | "remind_dsgvo"
    | "escalate_emergency";
  payload: Record<string, unknown>;
  requiresConfirmation: boolean;
  dsgvoRelevant: boolean;
  explanation: string; // EU AI Act: always state WHY
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ── Factory helpers ───────────────────────────────────────────────────────────

export function makeAppointmentAction(payload: {
  date: string;
  time?: string;
  horse_name?: string;
  horse_id?: string;
  client_id?: string;
  service_type?: string;
}): HufiAction {
  return {
    type: "create_appointment",
    payload,
    requiresConfirmation: true,
    dsgvoRelevant: false,
    explanation: `Ich schlage das vor weil: ${payload.horse_name ? `${payload.horse_name} benötigt einen neuen Termin` : "ein neuer Termin geplant werden soll"}`,
  };
}

export function makeInvoiceAction(payload: {
  horse_name?: string;
  horse_id?: string;
  client_id?: string;
  amount: number;
  notes?: string;
}): HufiAction {
  return {
    type: "send_invoice",
    payload,
    requiresConfirmation: true,
    dsgvoRelevant: true,
    explanation: `Ich schlage das vor weil: Eine Rechnung über €${payload.amount} für die erbrachte Leistung erstellt werden sollte`,
  };
}

export function makeNotifyAction(payload: {
  client_id?: string;
  client_name?: string;
  message: string;
}): HufiAction {
  return {
    type: "notify_client",
    payload,
    requiresConfirmation: true,
    dsgvoRelevant: true,
    explanation: `Ich schlage das vor weil: ${payload.client_name ?? "Der Kunde"} über die durchgeführte Maßnahme informiert werden sollte`,
  };
}

export function makeEmergencyAction(description: string): HufiAction {
  return {
    type: "escalate_emergency",
    payload: { description },
    requiresConfirmation: false,
    dsgvoRelevant: false,
    explanation: "Notfall-Situation erkannt — sofortige Protokollierung ohne Bestätigung",
  };
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeHufiAction(
  action: HufiAction,
  userId: string,
): Promise<ActionResult> {
  // Log every AI action for EU AI Act compliance
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);
    await from("hufi_context_log").insert({
      user_id: userId,
      session_id: crypto.randomUUID(),
      trigger: "ai_action",
      context_snapshot: {
        action_type: action.type,
        payload: action.payload,
        explanation: action.explanation,
        dsgvo_relevant: action.dsgvoRelevant,
      },
      action_taken: `${action.type}: ${JSON.stringify(action.payload).slice(0, 200)}`,
    });
  } catch {
    // Non-blocking — log failure doesn't stop action
  }

  switch (action.type) {
    case "create_appointment":  return _createAppointment(action.payload, userId);
    case "send_invoice":        return _createInvoice(action.payload, userId);
    case "notify_client":       return _notifyClient(action.payload, userId);
    case "request_permission":  return _requestPermission(action.payload, userId);
    case "remind_dsgvo":        return _setReminder(action.payload, userId);
    case "escalate_emergency":  return _escalateEmergency(action.payload, userId);
    default:                    return { success: false, message: "Unbekannte Aktion" };
  }
}

// ── Individual action implementations ────────────────────────────────────────

async function _createAppointment(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("appointments").insert({
      provider_id: userId,
      horse_id: payload.horse_id ?? null,
      date: payload.date as string,
      time: payload.time ?? null,
      service_type: payload.service_type ?? "Hufpflege",
      notes: payload.notes ?? null,
      status: "scheduled",
    });
    if (error) throw error;
    return {
      success: true,
      message: `✅ Termin am ${payload.date}${payload.time ? ` um ${(payload.time as string).slice(0, 5)}` : ""} eingetragen!`,
    };
  } catch (err) {
    return { success: false, message: `Termin konnte nicht angelegt werden: ${(err as Error).message}` };
  }
}

async function _createInvoice(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        provider_id: userId,
        client_id: payload.client_id ?? null,
        horse_id: payload.horse_id ?? null,
        invoice_number: `HF-${Date.now().toString(36).toUpperCase()}`,
        issue_date: today,
        total_amount: payload.amount ?? 0,
        status: "draft",
        payment_status: null,
        customer_type: "client",
        notes: payload.notes ?? (payload.horse_name ? `Hufpflege: ${payload.horse_name}` : null),
      })
      .select("id")
      .single();
    if (error) throw error;
    return {
      success: true,
      message: `🧾 Rechnungsentwurf erstellt (€${payload.amount}). Bitte in Rechnungen vervollständigen.`,
      data: { invoice_id: (data as { id: string }).id },
    };
  } catch (err) {
    return { success: false, message: `Rechnung konnte nicht erstellt werden: ${(err as Error).message}` };
  }
}

async function _notifyClient(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    await updateHufiMemory(
      userId,
      "alert",
      `notify_${payload.client_id ?? "client"}_${Date.now()}`,
      {
        active: false, // informational, not a pending alert
        message: `Benachrichtigung an ${payload.client_name ?? "Kunde"}: ${payload.message ?? "Befund verfügbar"}`,
        client_id: payload.client_id,
        sent_at: new Date().toISOString(),
      },
      "system",
    );
    return {
      success: true,
      message: `💬 ${payload.client_name ?? "Kunde"} wird benachrichtigt.`,
    };
  } catch {
    return { success: false, message: "Benachrichtigung fehlgeschlagen." };
  }
}

async function _requestPermission(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    await updateHufiMemory(
      userId,
      "permission",
      `requested_${payload.resource_type}_${Date.now()}`,
      { ...payload, requested_at: new Date().toISOString() },
      "system",
    );
    return { success: true, message: `🔒 Freigabeanfrage gesendet.` };
  } catch {
    return { success: false, message: "Freigabeanfrage fehlgeschlagen." };
  }
}

async function _setReminder(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    await updateHufiMemory(
      userId,
      "alert",
      (payload.key as string) ?? `reminder_${Date.now()}`,
      { active: true, ...payload },
      "system",
    );
    return { success: true, message: `🔔 Erinnerung gesetzt.` };
  } catch {
    return { success: false, message: "Erinnerung konnte nicht gesetzt werden." };
  }
}

async function _escalateEmergency(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    await updateHufiMemory(
      userId,
      "alert",
      `emergency_${Date.now()}`,
      {
        active: true,
        message: `🚨 NOTFALL: ${payload.description ?? "Tierärztliche Notversorgung erforderlich"}`,
        severity: "emergency",
        timestamp: new Date().toISOString(),
      },
      "system",
    );
    return {
      success: true,
      message: `🚨 Notfall geloggt. Bitte sofort Tierarzt kontaktieren!`,
    };
  } catch {
    return { success: false, message: "Notfall-Log fehlgeschlagen." };
  }
}
