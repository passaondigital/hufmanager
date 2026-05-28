import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { updateHufiMemory } from "./hufi-brain";
import { extractLineItems } from "./hufi-tool-definitions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HufiAction {
  type:
    | "create_appointment"
    | "send_invoice"
    | "notify_client"
    | "create_note"
    | "request_permission"
    | "remind_dsgvo"
    | "escalate_emergency"
    | "set_price_group"
    | "add_expense";
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
    case "create_note":         return _createNote(action.payload, userId);
    case "request_permission":  return _requestPermission(action.payload, userId);
    case "remind_dsgvo":        return _setReminder(action.payload, userId);
    case "escalate_emergency":  return _escalateEmergency(action.payload, userId);
    case "set_price_group":     return _setPriceGroup(action.payload, userId);
    case "add_expense":         return _addExpense(action.payload, userId);
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
    const lineItems = extractLineItems(payload);
    const totalNetto = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const invoiceNumber = `HF-${Date.now().toString(36).toUpperCase()}`;
    const notesDefault = payload.horse_name
      ? `${payload.service_type ?? "Hufpflege"}: ${payload.horse_name}`
      : null;

    // Rechnungs-Kopf anlegen
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        provider_id:    userId,
        client_id:      (payload.client_id as string | null) ?? null,
        horse_id:       (payload.horse_id  as string | null) ?? null,
        invoice_number: invoiceNumber,
        issue_date:     today,
        total_amount:   totalNetto > 0 ? totalNetto : ((payload.amount as number) ?? 0),
        status:         "draft",
        payment_status: null,
        customer_type:  "client",
        notes:          (payload.notes as string | null) ?? notesDefault,
      })
      .select("id")
      .single();
    if (invErr) throw invErr;
    const invoiceId = (inv as { id: string }).id;

    // Rechnungspositionen anlegen
    if (lineItems.length > 0) {
      const itemRows = lineItems.map((li) => ({
        invoice_id:        invoiceId,
        inventory_item_id: li.inventory_item_id ?? null,
        title:             li.title,
        quantity:          li.quantity,
        unit_price:        li.unit_price,
        total_price:       li.quantity * li.unit_price,
      }));
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemRows);
      if (itemsErr) console.error("[invoice] items insert error:", itemsErr.message);
    }

    // Lagerbestand abziehen
    const stockDeductions = lineItems.filter((li) => li.inventory_item_id);
    for (const li of stockDeductions) {
      const { data: inv } = await supabase
        .from("inventory_items")
        .select("current_stock")
        .eq("id", li.inventory_item_id!)
        .eq("user_id", userId)
        .maybeSingle();
      if (inv) {
        const newStock = Math.max(0, (inv as { current_stock: number }).current_stock - li.quantity);
        await supabase
          .from("inventory_items")
          .update({ current_stock: newStock })
          .eq("id", li.inventory_item_id!)
          .eq("user_id", userId);
      }
    }

    const sym = "€";
    const posText = lineItems.length > 0
      ? ` (${lineItems.length} Pos., Netto: ${totalNetto.toFixed(2)} ${sym})`
      : (payload.amount ? ` (${payload.amount} ${sym})` : "");
    const deductText = stockDeductions.length > 0
      ? ` — ${stockDeductions.length} Lagerartikel abgezogen`
      : "";

    return {
      success: true,
      message: `🧾 Rechnung ${invoiceNumber}${posText} angelegt${deductText}. Öffne Rechnungen zum Finalisieren.`,
      data: { invoice_id: invoiceId, invoice_number: invoiceNumber, total: totalNetto },
    };
  } catch (err) {
    return { success: false, message: `Rechnung konnte nicht erstellt werden: ${(err as Error).message}` };
  }
}

async function _notifyClient(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const clientId = payload.client_id as string | null;
  const clientName = (payload.client_name as string | null) ?? "Kunde";
  const message = (payload.message as string | null) ?? "Dein Hufbearbeiter hat dir eine Nachricht hinterlassen.";
  const horseName = payload.horse_name as string | null;

  const title = horseName ? `Nachricht zu ${horseName}` : "Nachricht von deinem Hufbearbeiter";

  try {
    // Push-Benachrichtigung an Client
    if (clientId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: clientId,
            title,
            body: message,
            url: "/client-horses",
          }),
        }).catch(() => null);
      }
    }

    // In Hufi Memory loggen
    await updateHufiMemory(
      userId,
      "alert",
      `notify_${clientId ?? "client"}_${Date.now()}`,
      {
        active: false,
        message: `Benachrichtigung an ${clientName}: ${message}`,
        client_id: clientId,
        sent_at: new Date().toISOString(),
      },
      "system",
    );

    return {
      success: true,
      message: `💬 ${clientName} wurde benachrichtigt.`,
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

async function _createNote(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    const key = `note_${payload.horse_name ? String(payload.horse_name).toLowerCase().replace(/\s+/g, "_") : "allgemein"}_${Date.now()}`;
    await updateHufiMemory(
      userId,
      "preference",
      key,
      {
        note_text:   payload.note_text,
        horse_name:  payload.horse_name ?? null,
        client_name: payload.client_name ?? null,
        created_at:  new Date().toISOString(),
      },
      "system",
    );
    return {
      success: true,
      message: `📝 Notiz gespeichert${payload.horse_name ? ` für ${payload.horse_name}` : ""}.`,
    };
  } catch (err) {
    return { success: false, message: `Notiz konnte nicht gespeichert werden: ${(err as Error).message}` };
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

async function _addExpense(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  try {
    const amount = payload.amount as number | undefined;
    const description = payload.description as string | undefined;
    const category = (payload.category as string | undefined) ?? "sonstiges";
    const expenseDate = (payload.date as string | undefined) ?? format(new Date(), "yyyy-MM-dd");

    if (!amount || amount <= 0) {
      return { success: false, message: "Bitte gib einen gültigen Betrag an." };
    }
    if (!description) {
      return { success: false, message: "Bitte beschreibe die Ausgabe kurz." };
    }

    const { error } = await supabase.from("expenses").insert({
      user_id:      userId,
      amount,
      category,
      description,
      expense_date: expenseDate,
      is_recurring: false,
    });

    if (error) throw error;

    const dateLabel = expenseDate === format(new Date(), "yyyy-MM-dd") ? "heute" : expenseDate;
    return {
      success: true,
      message: `Ausgabe von ${amount.toFixed(2)} € (${description}) für ${dateLabel} erfasst.`,
    };
  } catch (err: unknown) {
    return { success: false, message: (err as Error).message ?? "Ausgabe konnte nicht gespeichert werden." };
  }
}

async function _setPriceGroup(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const clientName = payload.client_name as string | undefined;
  const priceGroup = payload.price_group as string | undefined;
  const validGroups = ["standard", "vip", "grossstall", "individuell"];

  if (!clientName) return { success: false, message: "Kein Kundenname angegeben." };
  if (!priceGroup || !validGroups.includes(priceGroup)) {
    return { success: false, message: `Ungültige Preisgruppe: ${priceGroup}. Erlaubt: ${validGroups.join(", ")}` };
  }

  try {
    // Kunde anhand des Namens suchen (case-insensitive, fuzzy über ilike)
    const { data: matches, error: searchErr } = await supabase
      .from("profiles")
      .select("id, full_name, price_group")
      .eq("provider_id", userId)
      .ilike("full_name", `%${clientName}%`)
      .limit(1);

    if (searchErr) throw searchErr;
    if (!matches || matches.length === 0) {
      return { success: false, message: `Kunde "${clientName}" nicht gefunden. Bitte genauen Namen prüfen.` };
    }

    const customer = matches[0] as { id: string; full_name: string; price_group: string | null };

    const groupLabels: Record<string, string> = {
      standard: "Standard", vip: "VIP", grossstall: "Großstall", individuell: "Individuell",
    };

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ price_group: priceGroup, price_group_label: groupLabels[priceGroup] ?? priceGroup })
      .eq("id", customer.id)
      .eq("provider_id", userId);

    if (updateErr) throw updateErr;

    return {
      success: true,
      message: `✅ ${customer.full_name} ist jetzt in der Preisgruppe "${groupLabels[priceGroup]}". Zukünftige Termine verwenden automatisch die richtigen Preise.`,
    };
  } catch (err) {
    return { success: false, message: `Preisgruppe konnte nicht gesetzt werden: ${(err as Error).message}` };
  }
}
