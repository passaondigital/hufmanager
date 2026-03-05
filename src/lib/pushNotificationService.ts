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

/**
 * Send push notifications to all clients with appointments today for a given provider.
 */
export async function notifyTodayClients(
  providerId: string,
  type: "tour_start" | "delay" | "arrived",
  extraData?: { clientId?: string; delayMinutes?: number; providerName?: string }
): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  // Get today's appointments with horse owners
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, horse_id, time, horses!inner(owner_id, name)")
    .eq("provider_id", providerId)
    .eq("date", today)
    .neq("status", "cancelled");

  if (!appointments?.length) return 0;

  const providerName = extraData?.providerName || "Dein Hufpfleger";

  // If no name was provided, try to resolve it
  let resolvedName = providerName;
  if (resolvedName === "Dein Hufpfleger") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", providerId)
      .maybeSingle();
    if (profile?.full_name) {
      resolvedName = profile.full_name;
    } else {
      const { data: bs } = await supabase
        .from("business_settings")
        .select("business_name")
        .eq("user_id", providerId)
        .maybeSingle();
      resolvedName = bs?.business_name || "Dein Hufpfleger";
    }
  }
  let sentCount = 0;

  // Collect unique client IDs
  const clientNotifications = new Map<string, { title: string; body: string; url: string }>();

  for (const appt of appointments) {
    const horse = appt.horses as any;
    if (!horse?.owner_id) continue;
    const ownerId = horse.owner_id;

    // Skip if targeting a specific client and this isn't them
    if (extraData?.clientId && ownerId !== extraData.clientId) continue;

    // Skip if already queued for this client
    if (clientNotifications.has(ownerId)) continue;

    let title = "";
    let body = "";

    switch (type) {
      case "tour_start":
        title = `${resolvedName} ist unterwegs 🚗`;
        body = appt.time
          ? `Dein Termin ist um ${(appt.time as string).slice(0, 5)} Uhr geplant.`
          : "Dein Termin steht heute an!";
        break;
      case "delay":
        title = `Verzögerung ⚠️`;
        body = `${resolvedName} verspätet sich um ca. ${extraData?.delayMinutes || 0} Minuten.`;
        break;
      case "arrived":
        title = `${resolvedName} ist angekommen! 🐴`;
        body = `${resolvedName} ist jetzt bei ${horse.name || "deinem Pferd"}.`;
        break;
    }

    clientNotifications.set(ownerId, { title, body, url: "/client-home" });
  }

  // Send all notifications
  for (const [clientId, notification] of clientNotifications) {
    const success = await sendPushToUser(clientId, notification.title, notification.body, notification.url);
    if (success) sentCount++;
  }

  return sentCount;
}
