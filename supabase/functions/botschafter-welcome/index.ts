import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[botschafter-welcome] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ sent: false, reason: "no_resend_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, first_name, bid, referral_code, type } = await req.json();

    if (!email || !first_name || !referral_code) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bidDisplay = (bid || "").toString().slice(0, 8).toUpperCase() || "PENDING";
    const referralLink = `https://hufmanager.de/pferdeakte?ref=${referral_code}`;

    const typeLabels: Record<string, string> = {
      creator: "Creator / Influencer",
      profi: "Pferdeprofi",
      unternehmen: "Unternehmen / Verband",
    };

    const resend = new Resend(RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: "HufManager <info@hufmanager.de>",
      to: [email],
      subject: `Willkommen als HufManager Botschafter, ${first_name}!`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
      <!-- Header -->
      <div style="background:#0a0a0a;padding:24px;text-align:center">
        <h1 style="color:#fff;font-size:20px;margin:0 0 4px">HufManager</h1>
        <span style="display:inline-block;background:rgba(249,115,22,.15);color:#f97316;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.5px">Botschafter-Programm</span>
      </div>
      
      <!-- Content -->
      <div style="padding:32px 24px">
        <h2 style="font-size:18px;margin:0 0 16px;color:#0a0a0a">Hallo ${first_name},</h2>
        
        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
          deine Botschafter-Registrierung als <strong>${typeLabels[type] || type}</strong> ist eingegangen!
        </p>

        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 16px">
          <p style="font-size:12px;color:#9ca3af;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px">Deine Botschafter-ID</p>
          <p style="font-family:monospace;font-size:16px;font-weight:700;margin:0;color:#0a0a0a">BID-${bidDisplay}</p>
        </div>

        <div style="background:#fff7ed;border-radius:12px;padding:16px;margin:0 0 16px;border:1px solid rgba(249,115,22,.2)">
          <p style="font-size:12px;color:#ea580c;margin:0 0 6px;font-weight:600">Dein Referral-Link</p>
          <p style="font-family:monospace;font-size:13px;margin:0;word-break:break-all;color:#0a0a0a">${referralLink}</p>
        </div>

        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
          Pascal prüft deine Anfrage persönlich und schaltet dich in der Regel innerhalb von 24 Stunden frei.
        </p>
        
        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
          Sobald du freigeschaltet bist, erhältst du eine weitere E-Mail mit dem Link zu deinem Dashboard.
        </p>

        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
          Bis dahin kannst du deinen Referral-Link bereits teilen — alle Anmeldungen über deinen Link werden dir gutgeschrieben.
        </p>

        <a href="${referralLink}" style="display:inline-block;background:#f97316;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none">
          Referral-Link teilen →
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">Dein HufManager Team</p>
        <p style="color:#d1d5db;font-size:11px;margin:4px 0 0">© 2026 HufManager · Barhufservice Schmid</p>
      </div>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    if (emailError) {
      console.error("[botschafter-welcome] Resend error:", emailError);
      return new Response(
        JSON.stringify({ sent: false, error: emailError }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[botschafter-welcome] Email sent to ${email}`);
    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[botschafter-welcome] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
