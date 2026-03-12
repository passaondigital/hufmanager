import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auto reminders are enabled
    const { data: setting } = await supabase
      .from("admin_settings").select("value").eq("key", "auto_legal_reminders").maybeSingle();
    if (setting && setting.value === false) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all pending confirmations
    const { data: pending } = await supabase
      .from("legal_change_confirmations")
      .select("id, provider_id, notification_id, reminder_count, created_at")
      .eq("action", "pending");

    if (!pending?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    let remindersSent = 0;
    let escalations = 0;

    for (const conf of pending) {
      const ageDays = (now - new Date(conf.created_at).getTime()) / (1000 * 60 * 60 * 24);

      // Load notification details
      const { data: notif } = await supabase
        .from("legal_change_notifications")
        .select("title, type, effective_date")
        .eq("id", conf.notification_id)
        .maybeSingle();

      if (!notif) continue;

      // 7+ days: send reminder push
      if (ageDays >= 7 && conf.reminder_count < 5) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: conf.provider_id,
              title: "Erinnerung: Bestätigung ausstehend 📋",
              body: `"${notif.title}" – bitte bestätige die Änderung.`,
              url: "/management/abo",
            },
          });
        } catch (e) {
          console.error("Push reminder failed:", e);
        }

        await supabase.from("legal_change_confirmations")
          .update({ reminder_count: conf.reminder_count + 1 })
          .eq("id", conf.id);

        remindersSent++;
      }

      // 30+ days: escalate to admin
      if (ageDays >= 30) {
        // Get provider name for notification
        const { data: profile } = await supabase
          .from("profiles").select("full_name, readable_id").eq("id", conf.provider_id).maybeSingle();

        const providerName = profile?.full_name || profile?.readable_id || conf.provider_id;

        // Create admin notification
        await supabase.from("notifications").insert({
          user_id: conf.provider_id, // Will be overridden to admins below
          title: "⚠️ Compliance-Eskalation",
          message: `${providerName} hat nach 30+ Tagen nicht auf "${notif.title}" reagiert.`,
          type: "admin_alert",
          link: "/admin?tab=compliance",
        });

        // Notify all admins
        const { data: admins } = await supabase
          .from("user_roles").select("user_id").eq("role", "admin");
        for (const admin of (admins || [])) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "⚠️ Compliance-Eskalation",
            message: `${providerName} hat nach 30+ Tagen nicht auf "${notif.title}" reagiert.`,
            type: "admin_alert",
            link: "/admin?tab=compliance",
          });
        }

        escalations++;
      }
    }

    return new Response(JSON.stringify({
      processed: pending.length,
      reminders_sent: remindersSent,
      escalations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[legal-change-reminders] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
