import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape helper to prevent XSS
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing confirmation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing confirmation for token: ${token}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find appointment by confirmation token
    const { data: appointment, error: findError } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        is_confirmed_by_client,
        provider_id,
        horse_id,
        horses!inner (
          name,
          owner_id
        )
      `)
      .eq("confirmation_token", token)
      .maybeSingle();

    if (findError) {
      console.error("Error finding appointment:", findError);
      throw findError;
    }

    if (!appointment) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (appointment.is_confirmed_by_client) {
      // Already confirmed - return success page
      return new Response(
        generateHtmlPage("bereits bestätigt", appointment, true),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Update appointment as confirmed
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        is_confirmed_by_client: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      throw updateError;
    }

    // Create notification for the provider
    const horse = (appointment as any).horses;
    if (appointment.provider_id) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: appointment.provider_id,
          title: "Termin bestätigt",
          message: `Der Kunde hat den Termin für ${horse.name} am ${new Date(appointment.date).toLocaleDateString("de-DE")} bestätigt.`,
          type: "success",
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }
    }

    console.log(`Appointment ${appointment.id} confirmed successfully`);

    // Return success HTML page
    return new Response(
      generateHtmlPage("erfolgreich bestätigt", appointment, false),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );

  } catch (error: any) {
    console.error("Error in confirm-appointment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateHtmlPage(status: string, appointment: any, alreadyConfirmed: boolean): string {
  const horse = appointment.horses;
  const dateStr = new Date(appointment.date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = appointment.time ? appointment.time.substring(0, 5) + " Uhr" : "";
  
  // Escape user-controlled data to prevent XSS
  const safeHorseName = escapeHtml(horse.name);
  const safeDateStr = escapeHtml(dateStr);
  const safeTimeStr = escapeHtml(timeStr);
  const safeStatus = escapeHtml(status);

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Termin ${status}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #fff;
        }
        .container {
          background: #1e1e1e;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${alreadyConfirmed ? "#3b82f6" : "#22c55e"};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 8px;
          color: #fff;
        }
        .subtitle {
          color: #888;
          margin-bottom: 32px;
        }
        .details {
          background: #252525;
          border-radius: 12px;
          padding: 20px;
          text-align: left;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #333;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-icon { font-size: 20px; }
        .detail-text { color: #ccc; }
        .detail-text strong { color: #fff; display: block; }
        .footer {
          margin-top: 24px;
          color: #666;
          font-size: 14px;
        }
        .brand {
          color: #F47B20;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${alreadyConfirmed ? "ℹ️" : "✅"}</div>
        <h1>Termin ${safeStatus}!</h1>
        <p class="subtitle">${alreadyConfirmed ? "Dieser Termin wurde bereits bestätigt." : "Vielen Dank für Ihre Bestätigung."}</p>
        
        <div class="details">
          <div class="detail-row">
            <span class="detail-icon">🐴</span>
            <div class="detail-text">
              <strong>${safeHorseName}</strong>
              Pferd
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-icon">📅</span>
            <div class="detail-text">
              <strong>${safeDateStr}</strong>
              Datum
            </div>
          </div>
          ${safeTimeStr ? `
          <div class="detail-row">
            <span class="detail-icon">🕐</span>
            <div class="detail-text">
              <strong>${safeTimeStr}</strong>
              Uhrzeit
            </div>
          </div>
          ` : ""}
        </div>
        
        <p class="footer">Powered by <span class="brand">HufManager</span></p>
      </div>
    </body>
    </html>
  `;
}
