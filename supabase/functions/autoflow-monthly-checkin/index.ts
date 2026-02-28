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
    console.log("[autoflow-monthly-checkin] Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all providers with monthly check-in enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("autoflow_settings")
      .select("*")
      .eq("monthly_checkin_enabled", true);

    if (settingsError) throw settingsError;

    if (!allSettings || allSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No check-ins due", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    let sent = 0;

    for (const settings of allSettings) {
      try {
        // Check if check-in is due
        const nextCheckin = settings.next_checkin_at ? new Date(settings.next_checkin_at) : null;

        if (nextCheckin && nextCheckin > now) {
          continue; // Not yet due
        }

        // Get provider stats for the check-in summary
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().split("T")[0];

        const { data: monthlyAppointments } = await supabase
          .from("appointments")
          .select("id, status")
          .eq("provider_id", settings.provider_id)
          .gte("date", lastMonthStr)
          .lte("date", now.toISOString().split("T")[0]);

        const totalAppointments = monthlyAppointments?.length || 0;
        const completedAppointments = monthlyAppointments?.filter((a) => a.status === "completed").length || 0;

        const { count: leadsCount } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", settings.provider_id)
          .gte("created_at", lastMonth.toISOString());

        const { count: invoiceCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", settings.provider_id)
          .gte("created_at", lastMonth.toISOString());

        // Build summary
        const enabledFeatures = [];
        if (settings.auto_schedule_enabled) enabledFeatures.push("Lead→Termin");
        if (settings.auto_invoice_enabled) enabledFeatures.push("Auto-Rechnung");
        if (settings.auto_feedback_enabled) enabledFeatures.push("Feedback");
        if (settings.auto_reminder_enabled) enabledFeatures.push("Erinnerungen");

        const summaryParts = [
          `Letzter Monat: ${totalAppointments} Termine (${completedAppointments} erledigt)`,
          `${leadsCount || 0} neue Anfragen`,
          `${invoiceCount || 0} Rechnungen`,
          `Aktive Module: ${enabledFeatures.join(", ") || "Keine"}`,
        ];

        // Create check-in notification
        await supabase.from("notifications").insert({
          user_id: settings.provider_id,
          title: "🔄 AutoFlow Monatlicher Check-In",
          message: `${summaryParts.join(" · ")}. Passen deine Einstellungen noch? Überprüfe sie jetzt.`,
          type: "autoflow_checkin",
          link: "/autoflow",
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
              user_id: settings.provider_id,
              title: "🔄 AutoFlow Check-In",
              body: "Monatlicher System-Check: Passen deine AutoFlow-Einstellungen noch?",
              url: "/autoflow",
            }),
          });
        } catch (e) {
          console.error("[autoflow-monthly-checkin] Push failed:", e);
        }

        // Update next check-in date (next month)
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First of next month
        nextMonth.setHours(9, 0, 0, 0);

        await supabase
          .from("autoflow_settings")
          .update({
            last_checkin_at: now.toISOString(),
            next_checkin_at: nextMonth.toISOString(),
          })
          .eq("id", settings.id);

        // Log the action
        await supabase.from("autoflow_log").insert({
          provider_id: settings.provider_id,
          action_type: "checkin_sent",
          entity_type: "provider",
          entity_id: settings.provider_id,
          status: "success",
          details: {
            appointments: totalAppointments,
            completed: completedAppointments,
            leads: leadsCount || 0,
            invoices: invoiceCount || 0,
            enabled_features: enabledFeatures,
          },
        });

        sent++;
      } catch (providerError: any) {
        console.error(`[autoflow-monthly-checkin] Error for provider ${settings.provider_id}:`, providerError.message);
      }
    }

    console.log(`[autoflow-monthly-checkin] Done. Sent: ${sent}`);

    return new Response(
      JSON.stringify({ message: "Monthly check-ins processed", sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[autoflow-monthly-checkin] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Monthly check-in failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
