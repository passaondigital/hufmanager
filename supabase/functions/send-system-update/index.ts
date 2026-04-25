import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const testEmail = body.test_email || null;

    // Fetch all users with email (providers, partners, clients)
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .not("email", "is", null)
      .in("role", ["provider", "partner", "client"]);

    if (pErr) throw pErr;

    const recipients = testEmail
      ? [{ email: testEmail, full_name: "Test User", role: "provider" }]
      : (profiles || []).filter((p: any) => p.email);

    console.log(`[system-update-mail] ${recipients.length} recipients (dryRun=${dryRun})`);

    const today = new Date().toLocaleDateString("de-DE", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const providerUpdates = `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">🏛️ Rechtsform & Steuerdaten</strong><br/>
        <span style="color:#555;">Du kannst jetzt deine <strong>Rechtsform</strong> (Einzelunternehmen, GbR, GmbH, UG, Freiberufler, etc. – 28 Formen für DE/AT/CH), <strong>Steuerdaten</strong> (USt-IdNr, Steuernummer, Finanzamt), <strong>Steuerberater-Kontakt</strong> und <strong>DATEV-Mandantennummer</strong> hinterlegen.</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">💰 Netto / Brutto konfigurierbar</strong><br/>
        <span style="color:#555;">Neu: Wähle ob du Preise als <strong>Netto</strong> oder <strong>Brutto</strong> eingibst. Das System rechnet automatisch um und zeigt die korrekten Hinweise auf Rechnungen, Landingpages und im Kalender.</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">📋 Kleinunternehmer-Regelung</strong><br/>
        <span style="color:#555;">Kleinunternehmer (§19 UStG / AT / CH) werden jetzt systemweit korrekt behandelt. Aktiviere die Einstellung und alle Preise werden ohne MwSt angezeigt.</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">🔧 Preishinweise überall</strong><br/>
        <span style="color:#555;">Alle Preis-Eingabefelder (Leistungen, Angebote, Rechnungen, Gruppenpreise) zeigen jetzt klar an, ob Netto oder Brutto erwartet wird.</span>
      </td></tr>
    `;

    const partnerUpdates = `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">🏛️ Steuer- & Rechtsform-Einstellungen</strong><br/>
        <span style="color:#555;">Auch für Partner verfügbar: Hinterlege deine Rechtsform, Steuerdaten und Steuerberater-Kontakt in den Einstellungen.</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">💰 Netto/Brutto auf Rechnungen</strong><br/>
        <span style="color:#555;">Rechnungs-Positionen zeigen jetzt klar „Netto €" an. Die MwSt-Berechnung passt sich automatisch an deine Einstellungen an.</span>
      </td></tr>
    `;

    const clientUpdates = `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">📊 Transparente Preisanzeige</strong><br/>
        <span style="color:#555;">Preise auf Landingpages und in Buchungen zeigen jetzt klar an, ob sie Netto oder Brutto sind – abhängig von deinem Dienstleister.</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <strong style="color:#F5970A;">📱 Verbesserte Service-Übersicht</strong><br/>
        <span style="color:#555;">Die Service-Karten und Preislisten auf Provider-Seiten zeigen jetzt zusätzliche Preis-Informationen.</span>
      </td></tr>
    `;

    const getUpdatesForRole = (role: string) => {
      switch (role) {
        case "provider": return providerUpdates;
        case "partner": return partnerUpdates;
        case "client": return clientUpdates;
        default: return providerUpdates;
      }
    };

    const getRoleLabel = (role: string) => {
      switch (role) {
        case "provider": return "Hufbearbeiter";
        case "partner": return "Fachpartner";
        case "client": return "Pferdebesitzer";
        default: return "Nutzer";
      }
    };

    const buildHtml = (name: string, role: string) => `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#F5970A 0%,#e8850a 100%);border-radius:12px 12px 0 0;padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">🐴 HufManager System-Update</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${today}</p>
    </div>
    
    <!-- Body -->
    <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#333;font-size:16px;margin:0 0 5px;">Hallo ${name || getRoleLabel(role)},</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        hier sind die wichtigsten Neuerungen der letzten Tage für dich als <strong>${getRoleLabel(role)}</strong>:
      </p>

      <!-- Updates Table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
        <tbody>
          ${getUpdatesForRole(role)}
        </tbody>
      </table>

      <!-- CTA -->
      <div style="text-align:center;margin:30px 0 20px;">
        <a href="https://hufiapp.de/home" style="display:inline-block;background:#F5970A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Jetzt einloggen & Einstellungen prüfen
        </a>
      </div>

      <!-- Haftungshinweis -->
      <div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#9A3412;font-size:13px;font-weight:600;margin:0 0 6px;">⚠️ Wichtiger Hinweis zur Eigenverantwortung</p>
        <p style="color:#9A3412;font-size:12px;line-height:1.5;margin:0;">
          Jeder Nutzer ist <strong>selbst für die Richtigkeit seiner Angaben verantwortlich</strong>. 
          HufManager stellt die technische Infrastruktur zur Verfügung – die korrekte Eingabe von 
          Rechtsform, Steuerdaten, MwSt-Sätzen und Preisen liegt in deiner Verantwortung. 
          Bei Unsicherheiten wende dich bitte an deinen Steuerberater.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;border-radius:0 0 12px 12px;padding:20px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        HufManager – Die Nr. 1 Software für Hufbearbeiter<br/>
        © ${new Date().getFullYear()} HufManager · <a href="https://www.hufmanager.de/datenschutz" style="color:#9ca3af;">Datenschutz</a> · <a href="https://www.hufmanager.de/impressum" style="color:#9ca3af;">Impressum</a>
      </p>
      <p style="color:#d1d5db;font-size:10px;margin:8px 0 0;">
        Du erhältst diese E-Mail weil du bei HufManager registriert bist.
      </p>
    </div>
  </div>
</body>
</html>`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          total_recipients: recipients.length,
          breakdown: {
            provider: recipients.filter((r: any) => r.role === "provider").length,
            partner: recipients.filter((r: any) => r.role === "partner").length,
            client: recipients.filter((r: any) => r.role === "client").length,
          },
          sample_html: buildHtml("Max Mustermann", "provider"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails in batches of 5
    for (let i = 0; i < recipients.length; i += 5) {
      const batch = recipients.slice(i, i + 5);

      await Promise.allSettled(
        batch.map(async (user: any) => {
          try {
            await resend.emails.send({
              from: "HufManager <info@hufmanager.de>",
              to: [user.email],
              subject: "🐴 HufManager Update – Neue Steuer- & Rechtsform-Einstellungen",
              html: buildHtml(user.full_name, user.role),
            });
            sent++;
          } catch (e: any) {
            failed++;
            errors.push(`${user.email}: ${e.message}`);
            console.error(`[system-update-mail] Failed for ${user.email}:`, e.message);
          }
        })
      );

      // Small delay between batches
      if (i + 5 < recipients.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`[system-update-mail] Done: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ sent, failed, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[system-update-mail] Error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
