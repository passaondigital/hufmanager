import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

type ReminderType = "evening_before" | "6_hours" | "1_hour";

interface ReminderInterval {
  type: ReminderType;
  label: string;
  checkFn: (appointmentDate: Date, appointmentTime: string | null, now: Date) => boolean;
}

const REMINDER_INTERVALS: ReminderInterval[] = [
  {
    type: "evening_before",
    label: "Am Vorabend",
    checkFn: (appointmentDate, _, now) => {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = appointmentDate.toDateString() === tomorrow.toDateString();
      const isEvening = now.getHours() >= 17 && now.getHours() < 19;
      return isTomorrow && isEvening;
    },
  },
  {
    type: "6_hours",
    label: "6 Stunden vorher",
    checkFn: (appointmentDate, appointmentTime, now) => {
      if (!appointmentTime) return false;
      const [hours, minutes] = appointmentTime.split(":").map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      const diffMs = appointmentDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > 5.5 && diffHours <= 6.5;
    },
  },
  {
    type: "1_hour",
    label: "1 Stunde vorher",
    checkFn: (appointmentDate, appointmentTime, now) => {
      if (!appointmentTime) return false;
      const [hours, minutes] = appointmentTime.split(":").map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      const diffMs = appointmentDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > 0.5 && diffHours <= 1.5;
    },
  },
];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting intelligent appointment reminder job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);

    // Fetch business settings for reminder preferences
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, phone, email, reminder_custom_text, reminder_intervals")
      .limit(1)
      .maybeSingle();

    const businessName = businessSettings?.business_name || "HufManager";
    const businessPhone = businessSettings?.phone || "";
    const businessEmail = businessSettings?.email || "";
    const customText = businessSettings?.reminder_custom_text || "";
    const enabledIntervals: ReminderType[] = businessSettings?.reminder_intervals || ["evening_before"];

    console.log(`Enabled reminder intervals: ${enabledIntervals.join(", ")}`);

    // Fetch upcoming appointments (today and tomorrow)
    const today = now.toISOString().split("T")[0];
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().split("T")[0];

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        service_type,
        location,
        confirmation_token,
        is_confirmed_by_client,
        provider_id,
        horses!inner (
          name,
          owner_id
        )
      `)
      .gte("date", today)
      .lt("date", endDate)
      .eq("status", "scheduled");

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} upcoming appointments`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to process", sent: 0 }),
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

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Fetch already sent reminders
    const appointmentIds = appointments.map((a) => a.id);
    const { data: sentReminders } = await supabase
      .from("appointment_reminders")
      .select("appointment_id, reminder_type, channel")
      .in("appointment_id", appointmentIds);

    const sentReminderSet = new Set(
      sentReminders?.map((r) => `${r.appointment_id}_${r.reminder_type}_${r.channel}`) || []
    );

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each appointment
    for (const appointment of appointments) {
      const horse = (appointment as any).horses;
      const owner = profileMap.get(horse.owner_id);
      const appointmentDate = new Date(appointment.date);

      if (!owner?.email) {
        console.log(`No email for owner of horse ${horse.name}, skipping...`);
        continue;
      }

      // Check which reminders should be sent
      for (const interval of REMINDER_INTERVALS) {
        // Skip if not enabled
        if (!enabledIntervals.includes(interval.type)) continue;

        // Skip if already sent
        const emailKey = `${appointment.id}_${interval.type}_email`;
        const inAppKey = `${appointment.id}_${interval.type}_in_app`;
        
        if (sentReminderSet.has(emailKey) && sentReminderSet.has(inAppKey)) {
          continue;
        }

        // Check if this reminder should be sent now
        if (!interval.checkFn(appointmentDate, appointment.time, now)) {
          continue;
        }

        console.log(`Sending ${interval.type} reminder for appointment ${appointment.id}`);

        // Send email if not already sent
        if (!sentReminderSet.has(emailKey)) {
          try {
            await sendReminderEmail(
              resend,
              owner,
              appointment,
              horse,
              businessName,
              businessPhone,
              businessEmail,
              customText,
              interval.label,
              supabaseUrl
            );

            // Log sent reminder
            await supabase.from("appointment_reminders").insert({
              appointment_id: appointment.id,
              reminder_type: interval.type,
              channel: "email",
            });

            sentCount++;
          } catch (emailError: any) {
            console.error(`Failed to send email:`, emailError);
            errors.push(`Email to ${owner.email}: ${emailError.message}`);
          }
        }

        // Create in-app notification if not already sent
        if (!sentReminderSet.has(inAppKey)) {
          try {
            await supabase.from("notifications").insert({
              user_id: horse.owner_id,
              title: "Terminerinnerung",
              message: `Ihr Termin für ${horse.name} steht bevor! ${interval.label}. Bitte bestätigen Sie den Termin.`,
              type: "reminder",
            });

            await supabase.from("appointment_reminders").insert({
              appointment_id: appointment.id,
              reminder_type: interval.type,
              channel: "in_app",
            });
          } catch (notifError: any) {
            console.error(`Failed to create notification:`, notifError);
          }
        }
      }
    }

    console.log(`Reminder job complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Appointment reminders processed",
        sent: sentCount,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendReminderEmail(
  resend: Resend,
  owner: { email: string; full_name: string | null },
  appointment: any,
  horse: { name: string },
  businessName: string,
  businessPhone: string,
  businessEmail: string,
  customText: string,
  intervalLabel: string,
  supabaseUrl: string
) {
  const timeStr = appointment.time
    ? appointment.time.substring(0, 5) + " Uhr"
    : "Termin ohne Uhrzeit";
  const locationStr = appointment.location || "Standort wird noch bekannt gegeben";
  const serviceStr = appointment.service_type || "Hufbearbeitung";
  const dateStr = new Date(appointment.date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  
  // Escape all user-controlled data to prevent XSS
  const safeOwnerName = escapeHtml(owner.full_name) || "Pferdebesitzer/in";
  const safeHorseName = escapeHtml(horse.name);
  const safeDateStr = escapeHtml(dateStr);
  const safeTimeStr = escapeHtml(timeStr);
  const safeServiceStr = escapeHtml(serviceStr);
  const safeLocationStr = escapeHtml(locationStr);
  const safeCustomText = escapeHtml(customText);
  const safeIntervalLabel = escapeHtml(intervalLabel);
  const safeBusinessName = escapeHtml(businessName);
  const safeBusinessPhone = escapeHtml(businessPhone);
  const safeBusinessEmail = escapeHtml(businessEmail);

  // Generate confirmation URL
  const confirmUrl = `${supabaseUrl}/functions/v1/confirm-appointment?token=${appointment.confirmation_token}`;
  const isConfirmed = appointment.is_confirmed_by_client;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #fff; padding: 30px; }
        .appointment-box { background: #f9f9f9; border-left: 4px solid #F47B20; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .detail { margin: 10px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; }
        .confirm-btn { 
          display: inline-block; 
          background: #22c55e; 
          color: white !important; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          margin: 20px 0;
        }
        .confirm-btn:hover { background: #16a34a; }
        .confirmed-badge {
          display: inline-block;
          background: #dcfce7;
          color: #166534;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin: 20px 0;
        }
        .custom-notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .horse-icon { font-size: 48px; margin-bottom: 10px; }
        .interval-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="horse-icon">🐴</div>
          <h1 style="margin: 0;">Terminerinnerung</h1>
          <p style="margin: 10px 0 0 0;"><span class="interval-badge">${safeIntervalLabel}</span></p>
        </div>
        <div class="content">
          <p>Hallo ${safeOwnerName},</p>
          <p>wir möchten Sie an Ihren bevorstehenden Termin für <strong>${safeHorseName}</strong> erinnern:</p>
          
          <div class="appointment-box">
            <div class="detail">
              <span class="label">📅 Datum:</span> 
              <span class="value">${safeDateStr}</span>
            </div>
            <div class="detail">
              <span class="label">🕐 Uhrzeit:</span> 
              <span class="value">${safeTimeStr}</span>
            </div>
            <div class="detail">
              <span class="label">🔧 Leistung:</span> 
              <span class="value">${safeServiceStr}</span>
            </div>
            <div class="detail">
              <span class="label">📍 Ort:</span> 
              <span class="value">${safeLocationStr}</span>
            </div>
          </div>
          
          ${isConfirmed ? `
            <div style="text-align: center;">
              <span class="confirmed-badge">✅ Termin bereits bestätigt</span>
            </div>
          ` : `
            <div style="text-align: center;">
              <p><strong>Bitte bestätigen Sie Ihren Termin:</strong></p>
              <a href="${confirmUrl}" class="confirm-btn">✅ Termin bestätigen</a>
            </div>
          `}
          
          ${safeCustomText ? `
            <div class="custom-notice">
              <strong>⚠️ Wichtiger Hinweis:</strong><br>
              ${safeCustomText}
            </div>
          ` : ""}
          
          <p>Bitte stellen Sie sicher, dass ${safeHorseName} zum vereinbarten Zeitpunkt bereitsteht.</p>
          
          <p>Mit freundlichen Grüßen,<br><strong>${safeBusinessName}</strong></p>
        </div>
        <div class="footer">
          ${safeBusinessPhone ? `📞 ${safeBusinessPhone}<br>` : ""}
          ${safeBusinessEmail ? `✉️ ${safeBusinessEmail}` : ""}
        </div>
      </div>
    </body>
    </html>
  `;

  return resend.emails.send({
    from: `${safeBusinessName} <onboarding@resend.dev>`,
    to: [owner.email],
    subject: `🐴 ${safeIntervalLabel}: Termin für ${safeHorseName} am ${safeDateStr}`,
    html: emailHtml,
  });
}
