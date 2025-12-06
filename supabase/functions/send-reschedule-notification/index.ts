import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RescheduleRequest {
  appointmentId: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointmentId, oldDate, oldTime, newDate, newTime }: RescheduleRequest = await req.json();

    console.log(`Processing reschedule notification for appointment: ${appointmentId}`);

    // Fetch appointment with horse and owner info
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        provider_id,
        horses:horse_id (
          name,
          owner_id
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      console.error("Appointment fetch error:", aptError);
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is the provider of this appointment
    if (appointment.provider_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const horseArray = appointment.horses as unknown as Array<{ name: string; owner_id: string }> | null;
    const horseData = horseArray && horseArray.length > 0 ? horseArray[0] : null;
    if (!horseData?.owner_id) {
      console.log("No horse owner found, skipping notification");
      return new Response(JSON.stringify({ sent: false, reason: "No owner" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch owner's email
    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", horseData.owner_id)
      .single();

    if (ownerError || !ownerProfile?.email) {
      console.log("No owner email found, skipping notification");
      return new Response(JSON.stringify({ sent: false, reason: "No email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch provider info for email
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Fetch business settings for branding
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name")
      .eq("user_id", user.id)
      .single();

    const providerName = providerProfile?.full_name || "Ihr Hufbearbeiter";
    const businessName = businessSettings?.business_name || "HufManager";
    const horseName = horseData.name;
    const ownerName = ownerProfile.full_name || "Kunde";

    // Format dates for German locale
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F47B20, #FFB347); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
          .change-box { background: #FFF8F0; border: 2px solid #F47B20; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .old-date { color: #999; text-decoration: line-through; }
          .new-date { color: #F47B20; font-weight: bold; font-size: 18px; }
          .arrow { color: #F47B20; font-size: 24px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .horse-emoji { font-size: 32px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Terminänderung</h1>
          </div>
          <div class="content">
            <p>Hallo ${ownerName},</p>
            
            <p>Ihr Termin für <strong>🐴 ${horseName}</strong> wurde verschoben:</p>
            
            <div class="change-box">
              <div class="old-date">
                ${formatDate(oldDate)} um ${oldTime} Uhr
              </div>
              <div class="arrow">↓</div>
              <div class="new-date">
                ${formatDate(newDate)} um ${newTime} Uhr
              </div>
            </div>
            
            <p><strong>Service:</strong> ${appointment.service_type || "Hufbearbeitung"}</p>
            
            <p>Falls Sie Fragen haben oder der neue Termin nicht passt, kontaktieren Sie bitte ${providerName}.</p>
            
            <p>Mit freundlichen Grüßen,<br>${providerName}<br>${businessName}</p>
          </div>
          <div class="footer">
            Diese E-Mail wurde automatisch über HufManager versendet.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${businessName} <noreply@hufmanager.de>`,
      to: [ownerProfile.email],
      subject: `📅 Terminänderung für ${horseName}`,
      html: emailHtml,
    });

    console.log("Reschedule notification sent:", emailResponse);

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: horseData.owner_id,
      title: "Termin verschoben",
      message: `Ihr Termin für ${horseName} wurde auf ${formatDate(newDate)} um ${newTime} Uhr verschoben.`,
      type: "appointment",
    });

    return new Response(JSON.stringify({ sent: true, emailId: (emailResponse as any).id || "sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending reschedule notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
