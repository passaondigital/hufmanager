import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentWithDetails {
  id: string;
  date: string;
  time: string;
  service_type: string;
  location: string;
  horse: {
    name: string;
    owner_id: string;
  };
  client: {
    email: string;
    full_name: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting appointment reminder job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Fetching appointments for: ${tomorrowStr}`);

    // Fetch appointments for tomorrow with horse and owner details
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        service_type,
        location,
        horse_id,
        horses!inner (
          name,
          owner_id
        )
      `)
      .eq("date", tomorrowStr)
      .eq("status", "scheduled");

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} appointments for tomorrow`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to remind", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique owner IDs
    const ownerIds = [...new Set(appointments.map((a: any) => a.horses.owner_id))];

    // Fetch owner profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ownerIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Create a map of owner profiles
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Fetch business settings for branding
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, phone, email")
      .limit(1)
      .single();

    const businessName = businessSettings?.business_name || "HufManager";
    const businessPhone = businessSettings?.phone || "";
    const businessEmail = businessSettings?.email || "";

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Send reminder emails
    for (const appointment of appointments) {
      const horse = (appointment as any).horses;
      const owner = profileMap.get(horse.owner_id);

      if (!owner?.email) {
        console.log(`No email for owner of horse ${horse.name}, skipping...`);
        continue;
      }

      const timeStr = appointment.time 
        ? appointment.time.substring(0, 5) + " Uhr" 
        : "Termin ohne Uhrzeit";
      
      const locationStr = appointment.location || "Standort wird noch bekannt gegeben";
      const serviceStr = appointment.service_type || "Hufbearbeitung";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .appointment-box { background: #f9f9f9; border-left: 4px solid #F47B20; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .detail { margin: 10px 0; }
            .label { font-weight: 600; color: #666; }
            .value { color: #333; }
            .footer { background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; color: #666; }
            .horse-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="horse-icon">🐴</div>
              <h1 style="margin: 0;">Terminerinnerung</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Morgen ist es soweit!</p>
            </div>
            <div class="content">
              <p>Hallo ${owner.full_name || "Pferdebesitzer/in"},</p>
              <p>wir möchten Sie daran erinnern, dass morgen ein Termin für <strong>${horse.name}</strong> ansteht:</p>
              
              <div class="appointment-box">
                <div class="detail">
                  <span class="label">📅 Datum:</span> 
                  <span class="value">${new Date(appointment.date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div class="detail">
                  <span class="label">🕐 Uhrzeit:</span> 
                  <span class="value">${timeStr}</span>
                </div>
                <div class="detail">
                  <span class="label">🔧 Leistung:</span> 
                  <span class="value">${serviceStr}</span>
                </div>
                <div class="detail">
                  <span class="label">📍 Ort:</span> 
                  <span class="value">${locationStr}</span>
                </div>
              </div>
              
              <p>Bitte stellen Sie sicher, dass ${horse.name} zum vereinbarten Zeitpunkt bereitsteht.</p>
              
              <p>Bei Fragen oder falls Sie den Termin verschieben müssen, kontaktieren Sie uns bitte rechtzeitig.</p>
              
              <p>Mit freundlichen Grüßen,<br><strong>${businessName}</strong></p>
            </div>
            <div class="footer">
              ${businessPhone ? `📞 ${businessPhone}<br>` : ""}
              ${businessEmail ? `✉️ ${businessEmail}` : ""}
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: `${businessName} <onboarding@resend.dev>`,
          to: [owner.email],
          subject: `🐴 Terminerinnerung: ${horse.name} morgen um ${timeStr}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${owner.email} for horse ${horse.name}:`, emailResponse);
        sentCount++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${owner.email}:`, emailError);
        errorCount++;
        errors.push(`${owner.email}: ${emailError.message}`);
      }
    }

    console.log(`Reminder job complete. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: "Appointment reminders processed",
        sent: sentCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
