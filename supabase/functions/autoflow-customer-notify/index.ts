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
    // Auth guard: only allow service_role key (cron jobs use service_role)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (token !== supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[autoflow-customer-notify] Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { type, provider_id, appointment_id, data: notifyData } = body;

    if (!type) {
      return new Response(
        JSON.stringify({ error: "type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle "all" providers for cron-based calls
    if (provider_id === "all" && type === "feedback_request") {
      const { data: allSettings } = await supabase
        .from("autoflow_settings")
        .select("provider_id")
        .eq("auto_feedback_enabled", true);

      let totalSent = 0;
      for (const s of allSettings || []) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/autoflow-customer-notify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ type: "feedback_request", provider_id: s.provider_id }),
          });
          const result = await res.json();
          totalSent += result.sent || 0;
        } catch (e) {
          console.error(`[autoflow-customer-notify] Failed for provider ${s.provider_id}:`, e);
        }
      }
      return new Response(
        JSON.stringify({ message: "All providers processed", sent: totalSent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!provider_id) {
      return new Response(
        JSON.stringify({ error: "provider_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check AutoFlow settings
    const { data: settings } = await supabase
      .from("autoflow_settings")
      .select("autoflow_mode, auto_reminder_enabled, auto_feedback_enabled, feedback_delay_hours, feedback_channel")
      .eq("provider_id", provider_id)
      .maybeSingle();

    const mode = settings?.autoflow_mode || "basis";
    let sent = 0;

    switch (type) {
      case "tour_eta": {
        // Notify clients about provider ETA during tour
        if (!appointment_id) break;

        const { data: appointment } = await supabase
          .from("appointments")
          .select("id, date, time, horses!inner(name, owner_id)")
          .eq("id", appointment_id)
          .single();

        if (!appointment) break;

        const horse = appointment.horses as any;
        const eta = notifyData?.eta_minutes || 30;

        await supabase.from("notifications").insert({
          user_id: horse.owner_id,
          title: "🚗 Ihr Hufbearbeiter ist unterwegs",
          message: `Geschätzte Ankunft in ca. ${eta} Minuten für ${horse.name}.`,
          type: "tour_eta",
          link: "/client-home",
        });

        // Send push notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: horse.owner_id,
              title: "🚗 Ihr Hufbearbeiter ist unterwegs",
              body: `Ankunft in ca. ${eta} Min. für ${horse.name}`,
              url: "/client-home",
            }),
          });
        } catch (e) {
          console.error("[autoflow-customer-notify] Push failed:", e);
        }

        sent++;
        break;
      }

      case "feedback_request": {
        // Send feedback request after appointment completion
        if (!settings?.auto_feedback_enabled) break;

        const { data: completedAppts } = await supabase
          .from("appointments")
          .select("id, completed_at, horses!inner(name, owner_id), provider_id")
          .eq("provider_id", provider_id)
          .eq("status", "completed")
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10);

        if (!completedAppts) break;

        const delayMs = (settings.feedback_delay_hours || 24) * 60 * 60 * 1000;

        for (const appt of completedAppts) {
          const completedAt = new Date(appt.completed_at!).getTime();
          const now = Date.now();
          const elapsed = now - completedAt;

          // Within the feedback window (delay ± 1 hour)
          if (elapsed >= delayMs && elapsed <= delayMs + 3600000) {
            // Check if feedback already sent
            const { data: existingLog } = await supabase
              .from("autoflow_log")
              .select("id")
              .eq("action_type", "feedback_sent")
              .eq("entity_id", appt.id)
              .eq("status", "success")
              .maybeSingle();

            if (existingLog) continue;

            const horse = appt.horses as any;

            // Check if feedback already exists
            const { data: existingFeedback } = await supabase
              .from("feedbacks")
              .select("id")
              .eq("appointment_id", appt.id)
              .maybeSingle();

            if (existingFeedback) continue;

            // Get provider name
            const { data: providerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", provider_id)
              .single();

            // Send notification
            await supabase.from("notifications").insert({
              user_id: horse.owner_id,
              title: "⭐ Wie war der Termin?",
              message: `Bitte bewerten Sie den Termin für ${horse.name} bei ${providerProfile?.full_name || "Ihrem Hufbearbeiter"}.`,
              type: "feedback_request",
              link: "/client-home",
            });

            // Send push
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  user_id: horse.owner_id,
                  title: "⭐ Wie war der Termin?",
                  body: `Bitte bewerten Sie den Termin für ${horse.name}.`,
                  url: "/client-home",
                }),
              });
            } catch (e) {
              console.error("[autoflow-customer-notify] Push failed:", e);
            }

            await logAction(supabase, provider_id, "feedback_sent", "appointment", appt.id, "success", {
              horse: horse.name, owner_id: horse.owner_id,
            });

            sent++;
          }
        }
        break;
      }

      case "appointment_upcoming": {
        // Notify client about upcoming appointment (auto-mode)
        if (!appointment_id) break;

        const { data: appt } = await supabase
          .from("appointments")
          .select("id, date, time, service_type, location, horses!inner(name, owner_id)")
          .eq("id", appointment_id)
          .single();

        if (!appt) break;

        const horse = appt.horses as any;
        const dateStr = new Date(appt.date).toLocaleDateString("de-DE", {
          weekday: "short", day: "numeric", month: "long",
        });
        const timeStr = appt.time?.substring(0, 5) || "";

        await supabase.from("notifications").insert({
          user_id: horse.owner_id,
          title: "📅 Termin steht bevor",
          message: `${appt.service_type || "Hufbearbeitung"} für ${horse.name} am ${dateStr}${timeStr ? ` um ${timeStr} Uhr` : ""}.`,
          type: "appointment_reminder",
          link: "/client-home",
        });

        sent++;
        break;
      }

      default:
        console.log(`[autoflow-customer-notify] Unknown type: ${type}`);
    }

    console.log(`[autoflow-customer-notify] Sent: ${sent}`);

    return new Response(
      JSON.stringify({ message: "Notifications processed", sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[autoflow-customer-notify] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Notification processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logAction(
  supabase: any,
  providerId: string,
  actionType: string,
  entityType: string,
  entityId: string,
  status: string,
  details: Record<string, any>
) {
  try {
    await supabase.from("autoflow_log").insert({
      provider_id: providerId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      status,
      details,
    });
  } catch (e) {
    console.error("[autoflow-log] Failed:", e);
  }
}
