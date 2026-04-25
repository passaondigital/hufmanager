import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_EMAILS = [
  "support@hufiapp.de",
  "teamhufmanager@gmail.com",
];

const ROLE_LABELS: Record<string, string> = {
  provider: "🔨 Hufbearbeiter",
  client: "🐴 Pferdebesitzer",
  partner: "🤝 Fachpartner",
  employee: "👤 Mitarbeiter",
  admin: "🛡️ Admin",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Validate caller (allow service_role or anon key from pg_net trigger)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (token !== serviceKey && token !== anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, role, email, full_name } = await req.json();

    if (!user_id || !role) {
      return new Response(JSON.stringify({ error: "Missing user_id or role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = ROLE_LABELS[role] || role;
    const now = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #F5970A; padding-bottom: 10px;">
          🆕 Neue Registrierung im HufManager
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555; width: 120px;">Name:</td>
            <td style="padding: 8px;">${full_name || "–"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">E-Mail:</td>
            <td style="padding: 8px;">${email ? `<a href="mailto:${email}">${email}</a>` : "–"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Rolle:</td>
            <td style="padding: 8px; font-size: 16px;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Zeitpunkt:</td>
            <td style="padding: 8px;">${now}</td>
          </tr>
        </table>
        <a href="https://app.hufiapp.de/admin/god-mode?view=registrations" 
           style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #F5970A; color: #0a0700; text-decoration: none; border-radius: 6px; font-weight: bold;">
          → Im God Mode öffnen
        </a>
        <p style="margin-top: 30px; color: #888; font-size: 12px;">
          Automatische Benachrichtigung von HufManager
        </p>
      </div>
    `;

    if (resendKey) {
      for (const notifyEmail of NOTIFY_EMAILS) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "HufManager <noreply@hufiapp.de>",
              to: [notifyEmail],
              subject: `🆕 Neue Registrierung: ${full_name || email || "Unbekannt"} (${roleLabel})`,
              html: emailHtml,
            }),
          });
          if (!res.ok) {
            console.error(`Email to ${notifyEmail} failed:`, await res.text());
          }
        } catch (e) {
          console.error(`Failed to send to ${notifyEmail}:`, e);
        }
      }
    } else {
      console.warn("RESEND_API_KEY not set — skipping email notifications");
    }

    // Also create in-app notifications for admin users
    const supabase = createClient(supabaseUrl, serviceKey);
    for (const adminEmail of NOTIFY_EMAILS) {
      try {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", adminEmail)
          .maybeSingle();

        if (adminProfile) {
          await supabase.from("notifications").insert({
            user_id: adminProfile.id,
            title: "Neue Registrierung",
            message: `${full_name || email || "Neuer Nutzer"} hat sich als ${roleLabel} registriert`,
            type: "new_registration",
            link: "/admin/god-mode?view=registrations",
          });
        }
      } catch (e) {
        console.error(`Notification for ${adminEmail} failed:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-new-registration:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
