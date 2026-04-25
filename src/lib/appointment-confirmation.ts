import { supabase } from "@/integrations/supabase/client";
import { updateHufiMemory } from "./hufi-brain";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmationData {
  appointmentId: string;
  date: string;
  time?: string | null;
  horseName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  providerName?: string | null;
  location?: string | null;
}

export interface ConfirmationResult {
  sent: boolean;
  channel: "edge_function" | "notification" | "fallback";
  message: string;
}

// ── fetchConfirmationData ─────────────────────────────────────────────────────

async function fetchConfirmationData(appointmentId: string): Promise<ConfirmationData | null> {
  try {
    const { data } = await supabase
      .from("appointments")
      .select(
        "id, date, time, location, horses(name), client:profiles!client_id(full_name, email), provider:profiles!provider_id(full_name)",
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (!data) return null;

    type Raw = typeof data & { horses: unknown; client: unknown; provider: unknown };
    const raw = data as Raw;
    const horseName =
      Array.isArray(raw.horses)
        ? (raw.horses[0] as { name?: string })?.name
        : (raw.horses as { name?: string } | null)?.name;
    const clientName = (raw.client as { full_name?: string } | null)?.full_name;
    const clientEmail = (raw.client as { email?: string } | null)?.email;
    const providerName = (raw.provider as { full_name?: string } | null)?.full_name;

    return {
      appointmentId,
      date: raw.date as string,
      time: raw.time as string | null,
      horseName: horseName ?? null,
      clientName: clientName ?? null,
      clientEmail: clientEmail ?? null,
      providerName: providerName ?? null,
      location: raw.location as string | null,
    };
  } catch {
    return null;
  }
}

// ── sendViaEdgeFunction ───────────────────────────────────────────────────────

async function sendViaEdgeFunction(data: ConfirmationData): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("send-appointment-confirmation", {
      body: {
        appointmentId: data.appointmentId,
        recipientEmail: data.clientEmail,
        recipientName: data.clientName,
        horseName: data.horseName,
        date: data.date,
        time: data.time,
        location: data.location,
        providerName: data.providerName,
      },
    });
    return !error;
  } catch {
    return false;
  }
}

// ── storeAsNotification ───────────────────────────────────────────────────────

async function storeAsNotification(
  data: ConfirmationData,
  recipientId: string,
  recipientType: "client" | "provider",
): Promise<void> {
  const timeStr = data.time ? ` um ${data.time.slice(0, 5)} Uhr` : "";
  const dateFormatted = data.date
    ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        new Date(data.date),
      )
    : data.date;

  const messageText =
    recipientType === "client"
      ? `✅ Terminbestätigung für ${data.horseName ?? "dein Pferd"}\n📅 ${dateFormatted}${timeStr}${data.location ? `\n📍 ${data.location}` : ""}${data.providerName ? `\n👤 ${data.providerName}` : ""}`
      : `📩 Neuer Termin bestätigt: ${data.horseName ?? "Pferd"} · ${dateFormatted}${timeStr}${data.clientName ? ` · Kunde: ${data.clientName}` : ""}`;

  await updateHufiMemory(
    recipientId,
    "alert",
    `appt_confirm_${data.appointmentId}`,
    {
      active: true,
      message: messageText,
      appointment_id: data.appointmentId,
      timestamp: new Date().toISOString(),
    },
    "system",
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function sendAppointmentConfirmation(
  appointmentId: string,
  recipientType: "client" | "provider",
  recipientUserId?: string,
): Promise<ConfirmationResult> {
  const data = await fetchConfirmationData(appointmentId);
  if (!data) {
    return { sent: false, channel: "fallback", message: "Termin nicht gefunden." };
  }

  // Try Edge Function first (real email)
  if (data.clientEmail && recipientType === "client") {
    const sent = await sendViaEdgeFunction(data);
    if (sent) {
      return {
        sent: true,
        channel: "edge_function",
        message: `Bestätigung an ${data.clientName ?? data.clientEmail} gesendet ✅`,
      };
    }
  }

  // Fallback: store as in-app notification
  if (recipientUserId) {
    await storeAsNotification(data, recipientUserId, recipientType);
    const who = recipientType === "client" ? (data.clientName ?? "Kunden") : (data.providerName ?? "Provider");
    return {
      sent: true,
      channel: "notification",
      message: `Bestätigung an ${who} gesendet ✅`,
    };
  }

  return { sent: false, channel: "fallback", message: "Kein Empfänger verfügbar." };
}

// ── Convenience: send to both parties ────────────────────────────────────────

export async function sendBothConfirmations(
  appointmentId: string,
  clientUserId?: string,
  providerUserId?: string,
): Promise<string> {
  const [clientResult] = await Promise.allSettled([
    clientUserId
      ? sendAppointmentConfirmation(appointmentId, "client", clientUserId)
      : Promise.resolve(null),
    providerUserId
      ? sendAppointmentConfirmation(appointmentId, "provider", providerUserId)
      : Promise.resolve(null),
  ]);

  if (clientResult.status === "fulfilled" && clientResult.value?.sent) {
    return clientResult.value.message;
  }
  return "Termin gespeichert.";
}
