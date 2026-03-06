import { supabase } from "@/integrations/supabase/client";

/**
 * Send a push notification to a specific user via the send-push-notification edge function.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: { user_id: userId, title, body, url },
    });

    if (error) {
      console.error("Push notification error:", error);
      return false;
    }

    return data?.success === true;
  } catch (e) {
    console.error("Push notification failed:", e);
    return false;
  }
}

// ── Dynamic name resolver ──────────────────────────────────

export async function resolveProviderDisplayName(providerId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", providerId)
    .maybeSingle();
  if (profile?.full_name) return profile.full_name;

  const { data: bs } = await supabase
    .from("business_settings")
    .select("business_name")
    .eq("user_id", providerId)
    .maybeSingle();
  return bs?.business_name || "Dein Hufpfleger";
}

// ── Typed notification types ───────────────────────────────

export type PushNotificationType =
  | "provider_on_way"
  | "provider_arriving"
  | "provider_arrived"
  | "appointment_reminder"
  | "appointment_delay"
  | "appointment_cancelled"
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_declined";

interface PushTemplateInput {
  providerName: string;
  horseName?: string;
  time?: string;
  delayMinutes?: number;
  etaMinutes?: number;
}

function buildPushContent(type: PushNotificationType, input: PushTemplateInput): { title: string; body: string } {
  const { providerName, horseName, time, delayMinutes, etaMinutes } = input;

  switch (type) {
    case "provider_on_way":
      return {
        title: `${providerName} ist unterwegs 🚗`,
        body: time
          ? `Dein Termin heute um ${time} Uhr`
          : "Dein Termin steht heute an!",
      };
    case "provider_arriving":
      return {
        title: `${providerName} ist gleich da ⏱`,
        body: etaMinutes
          ? `Ankunft in ca. ${etaMinutes} Minuten`
          : "Ankunft in wenigen Minuten",
      };
    case "provider_arrived":
      return {
        title: `${providerName} ist angekommen! 🐴`,
        body: horseName
          ? `Dein Termin bei ${horseName} beginnt`
          : "Dein Termin beginnt jetzt",
      };
    case "appointment_reminder":
      return {
        title: `Termin morgen 🗓`,
        body: time
          ? `${providerName} kommt morgen um ${time} Uhr`
          : `${providerName} kommt morgen`,
      };
    case "appointment_delay":
      return {
        title: `Kleine Verspätung ⚠️`,
        body: `${providerName} verspätet sich um ca. ${delayMinutes || 0} Min.`,
      };
    case "appointment_cancelled":
      return {
        title: `Termin abgesagt ❌`,
        body: `Bitte kontaktiere ${providerName} für einen neuen Termin`,
      };
    case "appointment_created":
      return {
        title: `Neuer Termin 📅`,
        body: horseName && time
          ? `${providerName} kommt am ${time} zu ${horseName}`
          : `${providerName} hat einen neuen Termin erstellt`,
      };
    case "appointment_confirmed":
      return {
        title: `Termin bestätigt ✅`,
        body: horseName
          ? `Der Termin für ${horseName} wurde bestätigt`
          : "Ein Termin wurde bestätigt",
      };
    case "appointment_declined":
      return {
        title: `Termin abgelehnt ❌`,
        body: horseName
          ? `Der Termin für ${horseName} wurde abgesagt`
          : "Ein Termin wurde abgesagt",
      };
  }
}

/**
 * Send a typed push notification with dynamic names.
 */
export async function sendTypedPush(
  userId: string,
  type: PushNotificationType,
  input: PushTemplateInput,
  url = "/client-home"
): Promise<boolean> {
  const { title, body } = buildPushContent(type, input);
  return sendPushToUser(userId, title, body, url);
}

/**
 * Send push notifications to all clients with appointments today for a given provider.
 */
export async function notifyTodayClients(
  providerId: string,
  type: "tour_start" | "delay" | "arrived",
  extraData?: { clientId?: string; delayMinutes?: number; providerName?: string }
): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, horse_id, time, horses!inner(owner_id, name)")
    .eq("provider_id", providerId)
    .eq("date", today)
    .neq("status", "cancelled");

  if (!appointments?.length) return 0;

  const resolvedName = extraData?.providerName || await resolveProviderDisplayName(providerId);

  let sentCount = 0;
  const clientNotifications = new Map<string, { title: string; body: string; url: string }>();

  for (const appt of appointments) {
    const horse = appt.horses as any;
    if (!horse?.owner_id) continue;
    const ownerId = horse.owner_id;

    if (extraData?.clientId && ownerId !== extraData.clientId) continue;
    if (clientNotifications.has(ownerId)) continue;

    let pushType: PushNotificationType;
    switch (type) {
      case "tour_start": pushType = "provider_on_way"; break;
      case "delay": pushType = "appointment_delay"; break;
      case "arrived": pushType = "provider_arrived"; break;
    }

    const { title, body } = buildPushContent(pushType, {
      providerName: resolvedName,
      horseName: horse.name || undefined,
      time: appt.time ? (appt.time as string).slice(0, 5) : undefined,
      delayMinutes: extraData?.delayMinutes,
    });

    clientNotifications.set(ownerId, { title, body, url: "/client-home" });
  }

  for (const [clientId, notification] of clientNotifications) {
    const success = await sendPushToUser(clientId, notification.title, notification.body, notification.url);
    if (success) sentCount++;
  }

  return sentCount;
}
