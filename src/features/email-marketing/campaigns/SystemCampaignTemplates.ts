/**
 * Vorgefertigte Kampagnen-Templates für das Email-Marketing-Modul.
 * Können im CampaignEditor als Vorlage geladen werden.
 */

export interface SystemCampaignTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  description: string;
  contentHtml: string;
}

export const SYSTEM_CAMPAIGN_TEMPLATES: SystemCampaignTemplate[] = [
  {
    id: "import-info-2026",
    name: "📦 Datenimport & Datenschutz-Info",
    subject: "Wichtige Info: Neuer Datenimport & Datenschutz für deine Kunden",
    category: "system-update",
    description: "Informiert Provider, Partner, Portale & Reitbetriebe über den neuen Import-Prozess und Datenschutz-Maßnahmen.",
    contentHtml: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">

<!-- Header -->
<tr><td style="background:#F47B20;padding:32px 40px;text-align:center;">
  <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:bold;">📦 Neuer Datenimport verfügbar</h1>
  <p style="color:#fff8f0;font-size:14px;margin:8px 0 0;">Deine Kundendaten – sicher und effizient verwalten</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
    Hallo {{name}},
  </p>
  <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
    ab sofort steht dir unser <strong>neuer Import-Assistent</strong> zur Verfügung. Du kannst jetzt Kundendaten in verschiedenen Formaten importieren:
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="padding:4px 12px 4px 0;color:#F47B20;font-size:14px;">✅</td><td style="color:#333;font-size:14px;">CSV, Excel (.xlsx/.xls)</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#F47B20;font-size:14px;">✅</td><td style="color:#333;font-size:14px;">vCard (.vcf) Kontakte</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#F47B20;font-size:14px;">✅</td><td style="color:#333;font-size:14px;">JSON-Daten</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#F47B20;font-size:14px;">✅</td><td style="color:#333;font-size:14px;">Copy & Paste (Freitext)</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#F47B20;font-size:14px;">🤖</td><td style="color:#333;font-size:14px;">KI-Import-Agent (ab Pro-Plan)</td></tr>
  </table>

  <div style="background:#f0f7ff;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px;">
    <p style="color:#1e40af;font-size:14px;font-weight:bold;margin:0 0 8px;">🔒 Datenschutz & DSGVO</p>
    <p style="color:#333;font-size:13px;line-height:1.5;margin:0;">
      Alle importierten Daten werden <strong>DSGVO-konform</strong> verarbeitet. Deine Kunden werden automatisch über die Datenverarbeitung informiert und können:
    </p>
    <ul style="color:#333;font-size:13px;line-height:1.8;margin:8px 0 0;padding-left:20px;">
      <li>Transparente Infos zur Datennutzung einsehen</li>
      <li>Selbst entscheiden, ob sie die <strong>kostenlose Hufi KundenApp</strong> nutzen möchten</li>
      <li>Jederzeit ihre Einwilligung widerrufen</li>
    </ul>
  </div>

  <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px;">
    <p style="color:#92400e;font-size:14px;font-weight:bold;margin:0 0 8px;">📱 Hufi KundenApp</p>
    <p style="color:#333;font-size:13px;line-height:1.5;margin:0;">
      Die KundenApp ist <strong>dauerhaft kostenlos</strong> für alle Pferdebesitzer. Nach dem Import erhalten deine Kunden eine Einladung und können selbst entscheiden, ob sie die App nutzen möchten. Kein Zwang, volle Transparenz.
    </p>
  </div>

  <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px;">
    <p style="color:#166534;font-size:14px;font-weight:bold;margin:0 0 8px;">📋 Was passiert nach dem Import?</p>
    <ol style="color:#333;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
      <li>Daten werden validiert & Duplikate erkannt</li>
      <li>Du kannst Einladungen per <strong>WhatsApp, SMS oder E-Mail</strong> versenden</li>
      <li>Kunden erhalten Datenschutz-Info + Opt-in für KundenApp</li>
      <li>Wer die App nutzt, sieht sofort die digitale Pferdeakte</li>
    </ol>
  </div>

  <!-- CTA -->
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:8px 0 24px;">
      <a href="{{import_url}}" style="display:inline-block;background:#F47B20;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
        Jetzt Kunden importieren →
      </a>
    </td></tr>
  </table>

  <p style="color:#666;font-size:13px;line-height:1.5;margin:0;">
    Bei Fragen stehen wir dir jederzeit zur Verfügung. Antworte einfach auf diese E-Mail oder nutze den Support-Chat in deinem Dashboard.
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f5f5f5;padding:24px 40px;text-align:center;">
  <p style="color:#999;font-size:12px;margin:0;">
    © ${new Date().getFullYear()} Hufi – Deine digitale Praxisverwaltung<br/>
    <a href="{{unsubscribe_url}}" style="color:#999;text-decoration:underline;">Abmelden</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
    `.trim(),
  },
];
