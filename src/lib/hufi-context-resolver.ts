import { supabase } from "@/integrations/supabase/client";
import type { IntentEntities } from "./hufi-intent";

export interface RelevantContext {
  horse?: {
    id: string;
    name: string;
    breed?: string;
    lastBefund?: string;
    lastBefundDate?: string;
    nextAppointment?: string;
  } | null;
  client?: {
    id: string;
    name: string;
    openInvoicesCount: number;
    totalOwed: number;
    lastVisitDate?: string;
    horses: string[];
  } | null;
  summary: string;
}

export async function fetchRelevantContext(
  entities: IntentEntities,
  userId: string,
): Promise<RelevantContext> {
  const result: RelevantContext = { summary: "" };
  const parts: string[] = [];

  if (entities.horseName) {
    const { data: horse } = await supabase
      .from("horses")
      .select("id, name, breed")
      .eq("provider_id", userId)
      .ilike("name", `%${entities.horseName}%`)
      .maybeSingle();

    if (horse) {
      const { data: befund } = await supabase
        .from("ai_befunde")
        .select("befund_text, massnahme, created_at")
        .eq("user_id", userId)
        .ilike("pferd_name", `%${horse.name}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const today = new Date().toISOString().split("T")[0];
      const { data: appt } = await supabase
        .from("appointments")
        .select("date, time")
        .eq("provider_id", userId)
        .eq("horse_id", horse.id)
        .gte("date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const befundDate = befund?.created_at?.split("T")[0];
      result.horse = {
        id: horse.id,
        name: horse.name,
        breed: horse.breed ?? undefined,
        lastBefund: befund?.befund_text ?? undefined,
        lastBefundDate: befundDate,
        nextAppointment: appt ? `${appt.date}${appt.time ? " " + appt.time.slice(0, 5) : ""}` : undefined,
      };

      parts.push(`Pferd: ${horse.name}${horse.breed ? ` (${horse.breed})` : ""}`);
      if (befund) {
        parts.push(`Letzter Befund (${befundDate}): ${(befund.befund_text ?? "").slice(0, 150)}`);
        if (befund.massnahme) parts.push(`Maßnahme: ${befund.massnahme}`);
      } else {
        parts.push("Noch kein Befund in der Akte.");
      }
      parts.push(appt ? `Nächster Termin: ${result.horse.nextAppointment}` : "Kein anstehender Termin.");
    } else {
      parts.push(`Pferd „${entities.horseName}" wurde nicht in der Datenbank gefunden.`);
    }
  }

  if (entities.clientName) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, full_name")
      .eq("provider_id", userId)
      .ilike("full_name", `%${entities.clientName}%`)
      .maybeSingle();

    if (contact) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, total_amount")
        .eq("provider_id", userId)
        .eq("contact_id", contact.id)
        .in("status", ["sent", "overdue"]);

      const totalOwed = (invoices ?? []).reduce(
        (s: number, inv: { total_amount?: number }) => s + (inv.total_amount ?? 0), 0
      );

      const { data: lastAppt } = await supabase
        .from("appointments")
        .select("date")
        .eq("provider_id", userId)
        .eq("contact_id", contact.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: horses } = await supabase
        .from("horses")
        .select("name")
        .eq("owner_contact_id", contact.id);

      result.client = {
        id: contact.id,
        name: contact.full_name,
        openInvoicesCount: (invoices ?? []).length,
        totalOwed,
        lastVisitDate: lastAppt?.date ?? undefined,
        horses: (horses ?? []).map((h: { name: string }) => h.name),
      };

      parts.push(`Kunde: ${contact.full_name}`);
      if ((invoices ?? []).length > 0) {
        parts.push(`Offene Rechnungen: ${(invoices ?? []).length} (Gesamt: €${totalOwed.toFixed(2)})`);
      } else {
        parts.push("Keine offenen Rechnungen.");
      }
      if (lastAppt) parts.push(`Letzter Besuch: ${lastAppt.date}`);
      if ((horses ?? []).length > 0) parts.push(`Pferde: ${result.client.horses.join(", ")}`);
    } else {
      parts.push(`Kunde „${entities.clientName}" wurde nicht gefunden.`);
    }
  }

  result.summary = parts.join("\n");
  return result;
}
