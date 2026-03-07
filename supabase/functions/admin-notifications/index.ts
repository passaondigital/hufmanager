import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = [
  "support@hufmanager.de",
  "teamhufmanager@gmail.com",
];

type NotificationType =
  | "new_user"
  | "plan_change"
  | "account_deleted"
  | "edge_function_error";

interface NotificationPayload {
  type: NotificationType;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  user_plan?: string;
  old_plan?: string;
  new_plan?: string;
  function_name?: string;
  error_message?: string;
  timestamp?: string;
}

function buildSubject(payload: NotificationPayload): string {
  switch (payload.type) {
    case "new_user":
      return `🆕 Neuer User: ${payload.user_name || payload.user_email}`;
    case "plan_change":
      return `📊 Plan-Änderung: ${payload.user_name || payload.user_email} → ${payload.new_plan}`;
    case "account_deleted":
      return `🗑️ Account gelöscht: ${payload.user_email}`;
    case "edge_function_error":
      return `🚨 Fehler in Edge Function: ${payload.function_name}`;
    default:
      return "⚡ HufManager Admin-Benachrichtigung";
  }
}

function buildHtml(payload: NotificationPayload): string {
  const timestamp = payload.timestamp || new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  let content = "";

  switch (payload.type) {
    case "new_user":
      content = `
        <h2 style="color: #F47B20; margin: 0 0 16px 0;">Neuer User registriert</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">Name:</td><td style="padding: 8px 0; color: #fff;">${payload.user_name || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">E-Mail:</td><td style="padding: 8px 0; color: #fff;">${payload.user_email || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Rolle:</td><td style="padding: 8px 0; color: #fff;">${payload.user_role || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Plan:</td><td style="padding: 8px 0; color: #fff;">${payload.user_plan || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Datum:</td><td style="padding: 8px 0; color: #fff;">${timestamp}</td></tr>
        </table>`;
      break;

    case "plan_change":
      content = `
        <h2 style="color: #F47B20; margin: 0 0 16px 0;">Plan-Änderung</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">Name:</td><td style="padding: 8px 0; color: #fff;">${payload.user_name || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">E-Mail:</td><td style="padding: 8px 0; color: #fff;">${payload.user_email || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Alter Plan:</td><td style="padding: 8px 0; color: #fff;">${payload.old_plan || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Neuer Plan:</td><td style="padding: 8px 0; color: #F47B20; font-weight: bold;">${payload.new_plan || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Datum:</td><td style="padding: 8px 0; color: #fff;">${timestamp}</td></tr>
        </table>`;
      break;

    case "account_deleted":
      content = `
        <h2 style="color: #ef4444; margin: 0 0 16px 0;">Account gelöscht</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">E-Mail:</td><td style="padding: 8px 0; color: #fff;">${payload.user_email || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Name:</td><td style="padding: 8px 0; color: #fff;">${payload.user_name || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Datum:</td><td style="padding: 8px 0; color: #fff;">${timestamp}</td></tr>
        </table>`;
      break;

    case "edge_function_error":
      content = `
        <h2 style="color: #ef4444; margin: 0 0 16px 0;">Edge Function Fehler</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">Funktion:</td><td style="padding: 8px 0; color: #fff; font-weight: bold;">${payload.function_name || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Fehler:</td><td style="padding: 8px 0; color: #ef4444;">${payload.error_message || "–"}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Datum:</td><td style="padding: 8px 0; color: #fff;">${timestamp}</td></tr>
        </table>`;
      break;
  }

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #1E1E1E; border-radius: 16px; padding: 32px; border: 1px solid #2a2a2a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 700; color: #F47B20;">HufManager</span>
            <span style="color: #666; font-size: 14px; display: block; margin-top: 4px;">Admin-Benachrichtigung</span>
          </div>
          ${content}
        </div>
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 24px;">
          Diese E-Mail wurde automatisch vom HufManager-System gesendet.
        </p>
      </div>
    </body>
    </html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept calls from other edge functions (service_role) or database webhooks
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // For database webhooks, verify service role key
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== supabaseServiceKey && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
        // Validate JWT if it's not the service key
        const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body = await req.json();

    // Handle database webhook format (INSERT/UPDATE/DELETE on profiles)
    let payload: NotificationPayload;

    if (body.type === "INSERT" && body.record) {
      // New user registered
      payload = {
        type: "new_user",
        user_name: body.record.full_name || body.record.email,
        user_email: body.record.email,
        user_role: body.record.role || "unknown",
        user_plan: body.record.plan || "–",
        timestamp: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      };
    } else if (body.type === "UPDATE" && body.record && body.old_record) {
      // Check if plan changed
      if (body.record.plan !== body.old_record.plan) {
        payload = {
          type: "plan_change",
          user_name: body.record.full_name || body.record.email,
          user_email: body.record.email,
          old_plan: body.old_record.plan || "–",
          new_plan: body.record.plan || "–",
          timestamp: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
        };
      } else {
        // Not a plan change, skip
        return new Response(JSON.stringify({ skipped: true, reason: "no_plan_change" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (body.type === "DELETE" && body.old_record) {
      payload = {
        type: "account_deleted",
        user_email: body.old_record.email,
        user_name: body.old_record.full_name,
        timestamp: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      };
    } else if (body.type && ["new_user", "plan_change", "account_deleted", "edge_function_error"].includes(body.type)) {
      // Direct API call format
      payload = body as NotificationPayload;
    } else {
      return new Response(JSON.stringify({ error: "Unknown event type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[admin-notifications] RESEND_API_KEY not configured");
      // Fallback: log to admin_activity_log
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin.from("admin_activity_log").insert({
        admin_id: "00000000-0000-0000-0000-000000000000",
        admin_email: "system",
        action_type: `notification_${payload.type}`,
        target_type: "system",
        details: payload as unknown as Record<string, unknown>,
      });
      return new Response(JSON.stringify({ sent: false, reason: "no_resend_key", logged: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = buildSubject(payload);
    const html = buildHtml(payload);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HufManager System <info@hufmanager.de>",
        to: ADMIN_EMAILS,
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log(`[admin-notifications] Sent ${payload.type}:`, emailResult);

    return new Response(JSON.stringify({ sent: true, type: payload.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin-notifications] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
