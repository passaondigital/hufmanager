/**
 * Centralized helper for logging account notes and document events.
 * Used across Mission Control to ensure consistent audit trails.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Account Notes ────────────────────────────────────────────────────

export async function createAccountNote(params: {
  accountId: string;
  accountType?: string;
  noteText: string;
  isSystem?: boolean;
  reminderAt?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("account_notes").insert({
    account_id: params.accountId,
    account_type: params.accountType || "provider",
    note_text: params.noteText,
    is_system: params.isSystem ?? false,
    created_by: user?.id || null,
    reminder_at: params.reminderAt || null,
  } as any);
}

export async function resolveAccountNote(noteId: string) {
  return supabase
    .from("account_notes")
    .update({ resolved_at: new Date().toISOString() } as any)
    .eq("id", noteId);
}

export async function fetchAccountNotes(accountId: string, limit = 50) {
  const { data, error } = await supabase
    .from("account_notes")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── Document Events ──────────────────────────────────────────────────

export async function logDocumentEvent(params: {
  documentId: string;
  documentType: "invoice" | "contract";
  eventType: string;
  eventData?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("document_events").insert({
    document_id: params.documentId,
    document_type: params.documentType,
    event_type: params.eventType,
    event_data: params.eventData || null,
    created_by: user?.id || null,
  } as any);
}

export async function fetchDocumentEvents(documentId: string) {
  const { data, error } = await supabase
    .from("document_events")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Recent Activity Feed ─────────────────────────────────────────────

export async function fetchRecentActivity(limit = 20, filter?: string) {
  let query = supabase
    .from("account_notes")
    .select("*")
    .eq("is_system", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "invoices") {
    query = query.ilike("note_text", "%Rechnung%");
  } else if (filter === "contracts") {
    query = query.or("note_text.ilike.%Vertrag%,note_text.ilike.%Nachtrag%");
  } else if (filter === "plans") {
    query = query.ilike("note_text", "%Plan%");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ── Pending Reminders ────────────────────────────────────────────────

export async function fetchPendingReminders() {
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const { data, error } = await supabase
    .from("account_notes")
    .select("*")
    .not("reminder_at", "is", null)
    .is("resolved_at", null)
    .lte("reminder_at", endOfWeek.toISOString())
    .order("reminder_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  return data || [];
}
