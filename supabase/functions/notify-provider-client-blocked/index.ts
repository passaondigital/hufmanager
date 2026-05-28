import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerEmail, clientEmail } = await req.json() as {
      providerEmail: string;
      clientEmail?: string;
    };

    if (!providerEmail || !providerEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "Ungültige Provider-E-Mail" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeProviderEmail = escapeHtml(providerEmail);
    const safeClientEmail = escapeHtml(clientEmail || "");
    const upgradeUrl = "https://www.copecart.com/products/1996da6f/checkout?utm_source=app&utm_medium=provider-notify&utm_campaign=client-blocked";

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 28px; text-align: center; }
    .content { background: #fff; padding: 28px; }
    .cta-btn {
      display: inline-block; background: #F47B20; color: white !important;
      padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;
    }
    .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:40px;margin-bottom:8px">🐴</div>
      <h1 style="margin:0;font-size:20px">Dein Kunde möchte die App nutzen</h1>
    </div>
    <div class="content">
      <p>Hallo,</p>
      ${safeClientEmail
        ? `<p><strong>${safeClientEmail}</strong> hat versucht, sich in der HufManager Kunden-App einzuloggen.</p>`
        : `<p>Ein Kunde hat versucht, sich in der HufManager Kunden-App einzuloggen.</p>`
      }
      <p>Die Kunden-App ist in <strong>HufManager Pro</strong> enthalten. Upgrade jetzt und gib deinen Kunden Zugriff auf:</p>
      <ul>
        <li>Ihre Termine & Pferdeakten</li>
        <li>Behandlungsberichte & Fotos</li>
        <li>Direkten Chat mit dir</li>
        <li>Rechnungen & Zahlungshistorie</li>
      </ul>
      <div style="text-align:center">
        <a href="${upgradeUrl}" class="cta-btn">Jetzt auf Pro upgraden →</a>
      </div>
      <p style="font-size:13px;color:#888">Fragen? Schreib uns: info@hufiapp.de</p>
    </div>
    <div class="footer">HufManager · info@hufiapp.de</div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: "HufManager <info@hufiapp.de>",
      to: [providerEmail],
      subject: "🐴 Dein Kunde möchte die App nutzen — jetzt upgraden",
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("notify-provider-client-blocked error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
