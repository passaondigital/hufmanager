import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting unconfirmed appointment escalation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Find appointments within the next 48 hours that are NOT confirmed
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const in48hStr = in48h.toISOString().split("T")[0];

    const { data: unconfirmed, error } = await supabase
      .from("appointments")
      .select(`
        id, date, time, provider_id, confirmation_token,
        horses!inner (name, owner_id)
      `)
      .eq("status", "scheduled")
      .eq("is_confirmed_by_client", false)
      .gte("date", todayStr)
      .lte("date", in48hStr);

    if (error) {
      console.error("Error fetching unconfirmed:", error);
      throw error;
    }

    if (!unconfirmed || unconfirmed.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unconfirmed appointments to escalate", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${unconfirmed.length} unconfirmed appointments within 48h`);

    // Check which escalations have already been sent
    const appointmentIds = unconfirmed.map(a => a.id);
    const { data: sentReminders } = await supabase
      .from("appointment_reminders")
      .select("appointment_id, reminder_type")
      .in("appointment_id", appointmentIds)
      .eq("reminder_type", "escalation_48h");

    const alreadyEscalated = new Set(sentReminders?.map(r => r.appointment_id) || []);

    let clientNotifications = 0;
    let providerNotifications = 0;

    for (const apt of unconfirmed) {
      if (alreadyEscalated.has(apt.id)) continue;

      const horse = (apt as any).horses;
      const dateStr = new Date(apt.date).toLocaleDateString("de-DE", {
        weekday: "short", day: "numeric", month: "short",
      });
      const timeStr = apt.time ? apt.time.substring(0, 5) + " Uhr" : "";

      // 1. Notify the client (re-remind)
      await supabase.from("notifications").insert({
        user_id: horse.owner_id,
        title: "⚠️ Terminbestätigung ausstehend",
        message: `Dein Termin für ${horse.name} am ${dateStr} ${timeStr} ist noch nicht bestätigt. Bitte bestätige zeitnah!`,
        type: "escalation",
        link: "/client-home",
      });

      // Push to client
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: horse.owner_id,
            title: "⚠️ Bitte Termin bestätigen",
            body: `${horse.name} am ${dateStr} ${timeStr} – noch nicht bestätigt!`,
            url: "/client-home",
          }),
        });
        clientNotifications++;
      } catch (_) { /* push optional */ }

      // 2. Notify the provider
      await supabase.from("notifications").insert({
        user_id: apt.provider_id,
        title: "🔴 Unbestätigter Termin",
        message: `Termin für ${horse.name} am ${dateStr} ${timeStr} wurde vom Kunden noch nicht bestätigt.`,
        type: "escalation",
        link: "/calendar",
      });

      // Push to provider
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: apt.provider_id,
            title: "🔴 Unbestätigter Termin",
            body: `${horse.name} am ${dateStr} – nicht bestätigt!`,
            url: "/calendar",
          }),
        });
        providerNotifications++;
      } catch (_) { /* push optional */ }

      // Mark as escalated
      await supabase.from("appointment_reminders").insert({
        appointment_id: apt.id,
        reminder_type: "escalation_48h",
        channel: "in_app",
      });
    }

    console.log(`Escalation complete. Client: ${clientNotifications}, Provider: ${providerNotifications}`);

    return new Response(
      JSON.stringify({
        message: "Escalation complete",
        clientNotifications,
        providerNotifications,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Escalation error:", error);
    return new Response(
      JSON.stringify({ error: "Escalation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
