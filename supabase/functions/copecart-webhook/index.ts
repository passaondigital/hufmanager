import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  CANCELLATION_EVENTS,
  constantTimeCompare,
  FAILURE_EVENTS,
  hmacSha256Base64,
  PAYMENT_EVENTS,
} from "../_shared/copecart-contract.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map legacy CopeCart product IDs to legacy subscription plans.
// New launch products are intentionally config-gated until Pascal creates the
// real CopeCart products:
// - HufManager Slim: 19,95 €/month, 14d in-app trial before checkout
// - HufiApp: 29,95 €/month, no trial
// Do not repurpose legacy IDs and never default unknown IDs to a paid plan.
const PRODUCT_PLAN_MAP: Record<string, string> = {
  // Legacy Early Bird product retained only for existing subscriptions.
  "0a0921ba": "pro",
  // Legacy product IDs (keep for existing subscriptions)
  "8ef10f74": "starter",
  "1996da6f": "pro",
  "953da638": "duo",
  "badae7d2": "team",
  "9bb65569": "starter",
  "ec500b5e": "pro",
  "483bbb5b": "pro",
};

const PRODUCT_PLAN_OVERRIDE_MAP: Record<string, string> = {
  "0a0921ba": "copecart_pro",
  // Legacy
  "8ef10f74": "copecart_starter",
  "1996da6f": "copecart_pro",
  "953da638": "copecart_duo",
  "badae7d2": "copecart_team",
  "9bb65569": "copecart_starter",
  "ec500b5e": "copecart_pro",
  "483bbb5b": "copecart_pro",
};

interface NewSaasProductMeta {
  product: "HUFMANAGER" | "HUFIAPP";
  plan: "HUFMANAGER_SLIM" | "HUFIAPP_PREMIUM";
  priceMonthlyEur: "19.95" | "29.95";
  trialDays: 14 | 0;
}

const NEW_SAAS_PRODUCT_MAP: Record<string, NewSaasProductMeta> = {
  // CONFIG_REQUIRED after manual CopeCart product creation:
  // "HUFMANAGER_SLIM_PRODUCT_ID": {
  //   product: "HUFMANAGER",
  //   plan: "HUFMANAGER_SLIM",
  //   priceMonthlyEur: "19.95",
  //   trialDays: 14,
  // },
  // "HUFIAPP_STANDARD_PRODUCT_ID": {
  //   product: "HUFIAPP",
  //   plan: "HUFIAPP_PREMIUM",
  //   priceMonthlyEur: "29.95",
  //   trialDays: 0,
  // },
};

// Plan → feature_statuses mapping for auto-provisioning
const PLAN_FEATURE_MAP: Record<string, Record<string, string>> = {
  starter: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "disabled",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "disabled",
    autoflow_reminders: "disabled",
    autoflow_invoicing: "disabled",
    autoflow_scheduling: "disabled",
    autoflow_feedback: "disabled",
    autoflow_checkin: "disabled",
    beta_features: "disabled",
  },
  pro: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "disabled",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "disabled",
  },
  duo: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "public",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "disabled",
  },
  team: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "public",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "public",
  },
  // Keep legacy "advanced" mapping for backward compat
  advanced: {
    module_invoicing: "public",
    module_chat: "public",
    module_maps: "public",
    module_academy: "public",
    module_hufanalyse: "public",
    module_network: "public",
    module_analytics: "public",
    module_office: "public",
    module_lager: "public",
    module_team: "disabled",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "disabled",
    autoflow_feedback: "public",
    autoflow_checkin: "disabled",
    beta_features: "disabled",
  },
};

// ─── CopeCart-Ereignisse (Doku IPN_CopeCart_v_1.6.7, "IPN Events") ──────────
// Die bisherigen Namen (order_created, payment_completed, purchase, sale …)
// gibt es bei CopeCart nicht — damit landete jeder echte Kauf im default-Zweig.
// payment.pending wird bewusst nicht behandelt: noch nicht verarbeitet,
// weder freischalten noch sperren.

function getPlanFromProductId(productId: string): string | null {
  return PRODUCT_PLAN_MAP[productId] ?? null;
}

function getPlanOverrideFromProductId(productId: string): string | null {
  return PRODUCT_PLAN_OVERRIDE_MAP[productId] || null;
}

function getNewSaasProductMeta(productId: string): NewSaasProductMeta | null {
  return NEW_SAAS_PRODUCT_MAP[productId] ?? null;
}

// ─── Pferdeakte Tresor (Vault) products ─────────────────────────────────────
// Standalone subscription for the document vault. Separate monetisation from
// the HufManager provider plans above. Add the real CopeCart product IDs once
// the products are created in CopeCart. Until then this map is empty and the
// frontend (TresorPricing) shows a waitlist instead of a checkout link.
type VaultPlanTier = 'light' | 'pro' | 'gestuet' | 'unlimited';
type VaultBillingCycle = 'monthly' | 'yearly';

interface VaultProductMeta {
  plan: VaultPlanTier;
  cycle: VaultBillingCycle;
}

const VAULT_PRODUCT_MAP: Record<string, VaultProductMeta> = {
  // Example shape — uncomment and replace with real CopeCart product IDs:
  // "abcd1234": { plan: "light",     cycle: "monthly" },
  // "abcd1235": { plan: "light",     cycle: "yearly"  },
  // "abcd1236": { plan: "pro",       cycle: "monthly" },
  // "abcd1237": { plan: "pro",       cycle: "yearly"  },
  // "abcd1238": { plan: "gestuet",   cycle: "monthly" },
  // "abcd1239": { plan: "gestuet",   cycle: "yearly"  },
  // "abcd1240": { plan: "unlimited", cycle: "monthly" },
  // "abcd1241": { plan: "unlimited", cycle: "yearly"  },
};

function isVaultProduct(productId: string): boolean {
  return productId !== "" && productId in VAULT_PRODUCT_MAP;
}

function getVaultProductMeta(productId: string): VaultProductMeta | null {
  return VAULT_PRODUCT_MAP[productId] ?? null;
}

// ─── Voice-Guthaben-Produkte ────────────────────────────────────────────────
// 1 Einheit = 1 Cent = 1 Sekunde Premium-Voice (siehe consume_hufi_voice_credit
// in der Migration 20260717120000_hufi_voice_credits.sql). Die Cent-Beträge
// hier entsprechen also direkt dem Kaufpreis in Euro-Cent, nicht 1:1 den
// tatsächlichen ElevenLabs-Kosten.
const VOICE_CREDIT_PRODUCT_MAP: Record<string, number> = {
  "d0cdf68a": 500,   // 5€ Guthaben
  "023890f8": 1000,  // 10€ Guthaben
  "2556cac0": 2500,  // 25€ Guthaben
};

function getVoiceCreditAmountCents(productId: string): number | null {
  return VOICE_CREDIT_PRODUCT_MAP[productId] ?? null;
}

// ─── BHS Balance Produkte ─────────────────────────────────────────────────────
// Pro-Pferd Abo: 3 Intervalle × 2 Zonen = 6 Varianten
// TODO: Platzhalter-IDs durch echte CopeCart-Produkt-IDs ersetzen
//       nach Anlage der Produkte im CopeCart-Dashboard.
interface BhsProductMeta {
  intervalWeeks: number; // 4 | 6 | 8
  zone: number;          // 1 | 2
  monthlyPrice: number;
  variant: string;       // z.B. "BHS_4W_Z1"
}

const BHS_PRODUCT_MAP: Record<string, BhsProductMeta> = {
  // TODO: Echte CopeCart-Produkt-IDs nach Produktanlage eintragen
  "BHS_4W_Z1": { intervalWeeks: 4, zone: 1, monthlyPrice: 71.10, variant: "BHS_4W_Z1" },
  "BHS_4W_Z2": { intervalWeeks: 4, zone: 2, monthlyPrice: 87.48, variant: "BHS_4W_Z2" },
  "BHS_6W_Z1": { intervalWeeks: 6, zone: 1, monthlyPrice: 53.44, variant: "BHS_6W_Z1" },
  "BHS_6W_Z2": { intervalWeeks: 6, zone: 2, monthlyPrice: 60.56, variant: "BHS_6W_Z2" },
  "BHS_8W_Z1": { intervalWeeks: 8, zone: 1, monthlyPrice: 41.56, variant: "BHS_8W_Z1" },
  "BHS_8W_Z2": { intervalWeeks: 8, zone: 2, monthlyPrice: 47.10, variant: "BHS_8W_Z2" },
};

function isBhsProduct(productId: string): boolean {
  return productId !== "" && productId in BHS_PRODUCT_MAP;
}

function getBhsProductMeta(productId: string): BhsProductMeta | null {
  return BHS_PRODUCT_MAP[productId] ?? null;
}

// Generiert eine Pferde-ID im Format EQ-XXXXXXXX
function generateEqid(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `EQ-${hex}`;
}

// Sendet die BHS-Welcome-Email an den neuen Kunden
async function sendBhsWelcomeEmail(
  resend: InstanceType<typeof Resend>,
  to: string,
  clientName: string,
  horseName: string,
  intervalWeeks: number,
  zone: number,
  monthlyPrice: number,
  tempPassword: string | null,
): Promise<void> {
  const zoneLabel = zone === 1 ? "Zone 1 (bis 25 km)" : zone === 2 ? "Zone 2 (25–50 km)" : `Zone ${zone}`;
  const priceFormatted = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(monthlyPrice);
  const loginHint = tempPassword
    ? `\n\nIhr Zugang zu HufiApp: https://hufiapp.de\nE-Mail: ${to}\nTemporäres Passwort: ${tempPassword}\n(Bitte beim ersten Login ändern)`
    : "";

  const plainText =
    `Willkommen beim BHS Balance Abo!\n\n` +
    `Guten Tag ${clientName},\n\n` +
    `vielen Dank für Ihr Vertrauen. Ihr BHS Balance Abo für ${horseName} ist jetzt aktiv.\n\n` +
    `Abo-Details:\n` +
    `  Pferd: ${horseName}\n` +
    `  Intervall: alle ${intervalWeeks} Wochen\n` +
    `  Zone: ${zoneLabel}\n` +
    `  Monatlicher Beitrag: ${priceFormatted}\n` +
    `  Kündigung: jederzeit mit 4 Wochen Frist möglich\n` +
    loginHint +
    `\n\nBei Fragen stehe ich Ihnen jederzeit zur Verfügung.\n\n` +
    `Mit freundlichen Grüßen\nPascal Schmid – Barhufservice Schmid`;

  try {
    await resend.emails.send({
      from: "Barhufservice Schmid <info@hufmanager.de>",
      to: [to],
      subject: `🐴 Ihr BHS Balance Abo für ${horseName} ist aktiv`,
      text: plainText,
      html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="color:#92400e;">🐴 Willkommen beim BHS Balance Abo</h2>
  <p>Guten Tag ${escapeHtml(clientName)},</p>
  <p>vielen Dank für Ihr Vertrauen. Ihr BHS Balance Abo für <strong>${escapeHtml(horseName)}</strong> ist jetzt aktiv.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;">Pferd</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${escapeHtml(horseName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;">Intervall</td><td style="padding:8px;border:1px solid #e5e7eb;">alle ${intervalWeeks} Wochen</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;">Zone</td><td style="padding:8px;border:1px solid #e5e7eb;">${zoneLabel}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;">Monatlicher Beitrag</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${priceFormatted}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;color:#6b7280;">Kündigung</td><td style="padding:8px;border:1px solid #e5e7eb;">4 Wochen Frist</td></tr>
  </table>
  ${tempPassword ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 8px;font-weight:600;">Ihr HufiApp-Zugang</p>
    <p style="margin:0;">E-Mail: ${escapeHtml(to)}<br>Temporäres Passwort: <strong>${escapeHtml(tempPassword)}</strong></p>
    <p style="margin:8px 0 0;font-size:12px;color:#92400e;">Bitte beim ersten Login unter <a href="https://hufiapp.de">hufiapp.de</a> ändern.</p>
  </div>` : ""}
  <p>Bei Fragen stehe ich Ihnen jederzeit zur Verfügung.</p>
  <p>Mit freundlichen Grüßen<br><strong>Pascal Schmid – Barhufservice Schmid</strong></p>
</body></html>`,
    });
    console.log("[copecart][bhs] Welcome email sent to:", to);
  } catch (err) {
    console.error("[copecart][bhs] Welcome email failed:", err);
  }
}

// Hilfsfunktion escapeHtml (aus invite-client-with-password übernommen)
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(
  resend: InstanceType<typeof Resend>,
  to: string,
  recipientName: string,
  invoiceNumber: string,
  amount: number,
  providerName: string,
  isProvider: boolean
): Promise<void> {
  const formattedAmount = formatCurrency(amount);
  
  const subject = isProvider 
    ? `✅ Zahlung erhalten: Rechnung ${invoiceNumber}`
    : `✅ Zahlung bestätigt: Rechnung ${invoiceNumber}`;
  
  const bodyText = isProvider
    ? `Die Zahlung für Rechnung <strong>${invoiceNumber}</strong> über <strong style="color: #16a34a;">${formattedAmount}</strong> wurde erfolgreich über CopeCart empfangen.`
    : `Ihre Zahlung für Rechnung <strong>${invoiceNumber}</strong> über <strong style="color: #16a34a;">${formattedAmount}</strong> bei ${providerName} wurde erfolgreich verarbeitet.`;

  try {
    await resend.emails.send({
      from: `HufManager <info@hufmanager.de>`,
      to: [to],
      subject,
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        ✅ Zahlung erfolgreich
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                        Guten Tag ${recipientName},
                      </h2>
                      
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        ${bodyText}
                      </p>
                      
                      <!-- Payment Card -->
                      <table role="presentation" style="width: 100%; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" style="width: 100%;">
                              <tr>
                                <td style="padding-bottom: 12px;">
                                  <span style="color: #6b7280; font-size: 14px;">Rechnungsnummer</span><br>
                                  <span style="color: #111827; font-size: 16px; font-weight: 600;">${invoiceNumber}</span>
                                </td>
                                <td style="padding-bottom: 12px; text-align: right;">
                                  <span style="color: #6b7280; font-size: 14px;">Betrag</span><br>
                                  <span style="color: #16a34a; font-size: 20px; font-weight: 700;">${formattedAmount}</span>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2">
                                  <span style="color: #6b7280; font-size: 14px;">Status</span><br>
                                  <span style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 600;">Bezahlt</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        ${isProvider ? "Die Rechnung wurde automatisch als bezahlt markiert." : "Vielen Dank für Ihre Zahlung!"}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                        Diese E-Mail wurde automatisch über HufManager versendet.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`[copecart] Payment confirmation email sent to ${isProvider ? 'provider' : 'client'}: ${to}`);
  } catch (error) {
    console.error(`[copecart] Failed to send email to ${to}:`, error);
  }
}

// Send push notification for payment confirmation
async function sendPaymentPushNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  invoiceNumber: string,
  amount: number,
  isProvider: boolean
): Promise<void> {
  const formattedAmount = formatCurrency(amount);
  
  const title = isProvider 
    ? "💰 Zahlung erhalten"
    : "✅ Zahlung bestätigt";
  
  const body = isProvider
    ? `Rechnung ${invoiceNumber}: ${formattedAmount} via CopeCart erhalten`
    : `Ihre Zahlung über ${formattedAmount} wurde erfolgreich verarbeitet`;
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        url: isProvider ? "/rechnungen" : "/meine-rechnungen",
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`[copecart] Push notification sent to ${isProvider ? 'provider' : 'client'}: ${result.sent} delivered`);
    } else {
      console.error(`[copecart] Push notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error(`[copecart] Failed to send push notification:`, error);
  }
}

// CopeCart wertet eine IPN NUR als zugestellt, wenn der Antwort-Body exakt
// "OK" ist (Doku, Abschnitt "IPN failures"). Alles andere gilt als Fehlschlag
// und wird 10× über 3 Stunden wiederholt. Bisher antwortete der Webhook mit
// JSON — jede Meldung wäre also neunmal zusätzlich gekommen.
function okResponse(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain", ...corsHeaders },
  });
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Copecart webhook received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Signaturprüfung nach CopeCart-Spec ────────────────────────────────
    // CopeCart schickt kein Passwort im Body, sondern eine HMAC-SHA256-
    // Signatur über den Roh-Body im Header 'X-Copecart-Signature'. Der alte
    // Code las payload.password — dieses Feld gibt es nicht, deshalb endete
    // JEDE echte IPN in einem 401.
    // Wichtig: req.text() vor JSON.parse. Über einen re-serialisierten Body
    // stimmt die Signatur nicht (Reihenfolge/Formatierung ändern sich).
    const rawBody = await req.text();
    const receivedSignature = req.headers.get("x-copecart-signature") ?? "";
    const sharedSecret = Deno.env.get("COPECART_IPN_PASSWORD");

    if (!sharedSecret) {
      console.error("COPECART_IPN_PASSWORD not configured");
      return new Response("Server configuration error", {
        status: 500,
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    }

    const expectedSignature = await hmacSha256Base64(sharedSecret, rawBody);

    if (!constantTimeCompare(receivedSignature, expectedSignature)) {
      // Diagnose OHNE Klartext: nur welche Header und Felder ankamen, keine
      // Werte. Reicht, um bei einem echten (Test-)Kauf zu sehen, ob die
      // Feldnamen stimmen — ohne Käuferdaten oder Secrets ins Log zu schreiben.
      let bodyKeys: string[] = [];
      try { bodyKeys = Object.keys(JSON.parse(rawBody) ?? {}); } catch { /* kein JSON */ }
      console.error("[copecart] Signatur ungültig.", JSON.stringify({
        signatur_header_da: receivedSignature !== "",
        header: [...req.headers.keys()],
        body_felder: bodyKeys,
        body_laenge: rawBody.length,
      }));
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    }

    const payload = JSON.parse(rawBody);
    console.log("[copecart] Signatur gültig | Felder:", Object.keys(payload).join(","));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Create service role client for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Initialize Resend for email notifications
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // ─── Feldnamen laut Doku, Abschnitt "IPN Parameters" ───────────────────
    // Vorher wurden die Namen geraten (payload.email, payload.buyer.name,
    // payload.amount …). Echte Namen zuerst, alte als Fallback.
    const eventType = payload.event_type || payload.event || payload.type;
    const customerEmail = (payload.buyer_email || payload.email || "").toLowerCase().trim();
    const customerName = [payload.buyer_firstname, payload.buyer_lastname]
      .filter(Boolean).join(" ").trim() || payload.buyer_name || "";
    // order_id bleibt über alle Zahlungen eines Abos gleich → Abo-Kennung.
    const subscriptionId = payload.order_id || payload.subscription_id;
    // transaction_id ist pro Zahlung eindeutig → Schlüssel gegen Doppelbuchung
    // bei den 10 Wiederholungen, die CopeCart bei Fehlschlag schickt.
    const transactionId = payload.transaction_id || payload.order_id;
    const productId = payload.product_id || "";
    // Testbestellungen: payment_status ist dann test_paid / test_trial /
    // test_successed_refunded (Doku, "IPN Parameters"). Die Freischaltung soll
    // laufen — sonst könnte man nichts prüfen —, aber Umsatzlog und
    // Admin-Rechnung dürfen keine erfundenen Einnahmen in die Bücher schreiben.
    const isTestOrder = typeof payload.payment_status === "string"
      && payload.payment_status.startsWith("test");
    // Gezahlter Betrag dieser Position.
    const paidAmountRaw = payload.line_item_amount ?? payload.first_payment ?? payload.amount;
    const paidAmount = typeof paidAmountRaw === "string" ? parseFloat(paidAmountRaw) : paidAmountRaw;
    // Freies Verkäuferfeld heißt bei CopeCart 'metadata' (String) — dort liegt
    // bei Rechnungs-Zahlungen die Rechnungs-UUID.
    const customField = (typeof payload.metadata === "string" ? payload.metadata : "") || payload.custom || "";

    console.log("[copecart] Event:", eventType, "| Produkt:", productId, "| Betrag:", paidAmount, "| metadata gesetzt:", !!customField);

    // Check if this is an invoice payment (custom field contains invoice ID)
    const isInvoicePayment = customField && customField.length > 10; // UUID length check
    
    if (isInvoicePayment) {
      console.log("[copecart] Processing invoice payment for invoice ID:", customField);
      
      // Fetch the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total_amount,
          status,
          payment_status,
          payment_external_id,
          client_id,
          provider_id
        `)
        .eq("id", customField)
        .maybeSingle();
      
      if (invoiceError) {
        console.error("[copecart] Invoice lookup error:", invoiceError.message);
      }
      
      if (invoice) {
        console.log("[copecart] Invoice found:", invoice.invoice_number);
        
        // Check if it's a successful payment event
        const isSuccessfulPayment = PAYMENT_EVENTS.includes(eventType);
        
        if (isSuccessfulPayment) {
          const invoicePaymentId = transactionId || subscriptionId;
          if (invoicePaymentId && invoice.payment_external_id === invoicePaymentId) {
            console.log("[copecart] Duplicate invoice payment acknowledged", { invoiceId: invoice.id, transactionId: invoicePaymentId });
            return okResponse();
          }
          // Betragsabgleich. Der Feldname line_item_amount ist aus der Doku
          // belegt, deshalb ein echter Riegel: ohne ihn würde ein falsch
          // konfigurierter Checkout (5€-Guthabenprodukt mit Rechnungs-UUID
          // in metadata) eine 500€-Rechnung tilgen.
          if (typeof paidAmount !== "number" || Number.isNaN(paidAmount)) {
            console.error("[copecart] Kein Betrag im Payload — Rechnung NICHT als bezahlt markiert:", invoice.invoice_number);
            return okResponse();
          }
          if (paidAmount + 0.01 < Number(invoice.total_amount)) {
            console.error("[copecart] BETRAGS-ABWEICHUNG bei Rechnung", invoice.invoice_number,
              "— erwartet:", invoice.total_amount, "gezahlt:", paidAmount, "→ NICHT als bezahlt markiert");
            return okResponse();
          }

          // Update invoice status to paid
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              payment_external_id: invoicePaymentId,
            })
            .eq("id", invoice.id);
          
          if (updateError) {
            console.error("[copecart] Failed to update invoice:", updateError.message);
          } else {
            console.log("[copecart] Invoice marked as paid:", invoice.invoice_number);
            
            // Send email notifications if Resend is configured
            if (resend) {
              // Fetch client and provider info for emails
              const { data: clientProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", invoice.client_id)
                .maybeSingle();
              
              const { data: providerProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", invoice.provider_id)
                .maybeSingle();
              
              const { data: businessSettings } = await supabase
                .from("business_settings")
                .select("business_name, owner_name, email")
                .eq("user_id", invoice.provider_id)
                .maybeSingle();
              
              const providerName = businessSettings?.business_name || businessSettings?.owner_name || providerProfile?.full_name || "Ihr Hufbearbeiter";
              const providerEmail = businessSettings?.email || providerProfile?.email;
              const clientName = clientProfile?.full_name || customerName || "Kunde";
              const clientEmail = clientProfile?.email || customerEmail;
              
              // Send notification to provider
              if (providerEmail) {
                await sendPaymentConfirmationEmail(
                  resend,
                  providerEmail,
                  providerName,
                  invoice.invoice_number || invoice.id.slice(0, 8),
                  invoice.total_amount,
                  providerName,
                  true // isProvider
                );
              }
              
              // Send notification to client
              if (clientEmail) {
                await sendPaymentConfirmationEmail(
                  resend,
                  clientEmail,
                  clientName,
                  invoice.invoice_number || invoice.id.slice(0, 8),
                  invoice.total_amount,
                  providerName,
                  false // isProvider
                );
              }
            } else {
              console.log("[copecart] Resend not configured, skipping email notifications");
            }
            
            // Send push notifications (works independently of email)
            // Push to provider
            if (invoice.provider_id) {
              await sendPaymentPushNotification(
                supabaseUrl,
                supabaseServiceKey,
                invoice.provider_id,
                invoice.invoice_number || invoice.id.slice(0, 8),
                invoice.total_amount,
                true // isProvider
              );
            }
            
            // Push to client
            if (invoice.client_id) {
              await sendPaymentPushNotification(
                supabaseUrl,
                supabaseServiceKey,
                invoice.client_id,
                invoice.invoice_number || invoice.id.slice(0, 8),
                invoice.total_amount,
                false // isProvider
              );
            }
          }
        }
        
        // Return success for invoice payment processing
        return okResponse();
      } else {
        console.log("[copecart] Invoice not found for ID:", customField);
      }
    }

    // Continue with subscription processing if no invoice payment
    if (!customerEmail) {
      console.error("No customer email found in payload");
      return new Response(JSON.stringify({ error: "No customer email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, subscription_status, subscription_plan")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      console.error("[copecart] Profile lookup failed:", profileError.message);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine plan from product
    const subscriptionPlan = getPlanFromProductId(productId);
    const planOverride = getPlanOverrideFromProductId(productId);
    const newSaasMeta = getNewSaasProductMeta(productId);
    const vaultMeta = getVaultProductMeta(productId);

    // Handle payment/order events - these are when we should create users
    const isPaymentEvent = PAYMENT_EVENTS.includes(eventType);
    const isCancellationEvent = CANCELLATION_EVENTS.includes(eventType);
    const isPaymentFailureEvent = FAILURE_EVENTS.includes(eventType);

    // ─── VAULT PRODUCT BRANCH ──────────────────────────────────────────────
    // Standalone Tresor subscription. Touches only the vault_* columns and
    // leaves HufManager subscription_plan / plan_override untouched. We do not
    // auto-create user accounts for vault purchases — the user must already
    // exist as a registered owner. If not, we acknowledge the webhook and
    // log a warning so support can reach out.
    if (vaultMeta) {
      if (!profile) {
        console.warn("[copecart][vault] No profile found for vault purchase", { productId });
        return okResponse();
      }

      let vaultUpdate: {
        vault_plan?: VaultPlanTier | null;
        vault_plan_status?: string | null;
        vault_subscription_id?: string | null;
        vault_billing_cycle?: VaultBillingCycle | null;
      } = {};

      if (isPaymentEvent) {
        vaultUpdate = {
          vault_plan: vaultMeta.plan,
          vault_plan_status: "active",
          vault_subscription_id: subscriptionId,
          vault_billing_cycle: vaultMeta.cycle,
        };
      } else if (isPaymentFailureEvent) {
        vaultUpdate = { vault_plan_status: "past_due" };
      } else if (isCancellationEvent) {
        vaultUpdate = { vault_plan_status: "cancelled" };
      } else {
        console.log("[copecart][vault] Unhandled event type for vault product:", eventType);
        return okResponse();
      }

      const { error: vaultErr } = await supabase
        .from("profiles")
        .update(vaultUpdate)
        .eq("id", profile.id);

      if (vaultErr) {
        console.error("[copecart][vault] Profile update failed:", vaultErr.message);
        return new Response(JSON.stringify({ error: "Vault update failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("[copecart][vault] Profile updated:", profile.id, vaultUpdate);
      return okResponse();
    }

    // ─── VOICE-GUTHABEN BRANCH ──────────────────────────────────────────────
    // Einmalkauf von Zusatz-Guthaben (5€/10€/25€). Berührt weder
    // subscription_plan noch plan_override — reines Add-on. Nutzer muss
    // bereits registriert sein (kein Auto-Signup für einen Guthaben-Kauf).
    const voiceCreditAmount = getVoiceCreditAmountCents(productId);
    if (voiceCreditAmount !== null) {
      if (!profile) {
        console.warn("[copecart][voice-credit] No profile found", { productId });
        return okResponse();
      }

      if (!isPaymentEvent) {
        console.log("[copecart][voice-credit] Unhandled event type for credit product:", eventType);
        return okResponse();
      }

      const { error: creditErr } = await supabase.rpc("add_purchased_voice_credits", {
        p_user_id: profile.id,
        p_amount_cents: voiceCreditAmount,
        p_copecart_order_id: transactionId ?? null,  // pro Zahlung eindeutig → schützt vor den 10 Retries
        p_description: `Guthaben-Kauf (${(voiceCreditAmount / 100).toFixed(2)}€)`,
      });

      if (creditErr) {
        console.error("[copecart][voice-credit] Gutschrift fehlgeschlagen:", creditErr.message);
        return new Response(JSON.stringify({ error: "Voice-Guthaben-Gutschrift fehlgeschlagen" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("[copecart][voice-credit] Gutgeschrieben:", profile.id, voiceCreditAmount, "Cent");
      return okResponse();
    }

    // ─── BHS BALANCE BRANCH ──────────────────────────────────────────────────
    // Pro-Pferd Abo für Barhufbearbeiter-Kunden.
    // Legt Client-Account + Pferd + Abo-Eintrag an; berührt keine Provider-Logik.
    const bhsMeta = getBhsProductMeta(productId);
    if (bhsMeta) {
      console.log("[copecart][bhs] BHS Balance purchase detected:", productId);

      // Provider-ID: aus Env-Var (Pascal = Alleinbetreiber in Phase 1)
      // TODO: Wenn Mehrprovider-Support benötigt, aus payload.metadata.provider_id lesen
      const bhsProviderId = Deno.env.get("BHS_DEFAULT_PROVIDER_ID") ?? null;
      if (!bhsProviderId) {
        console.error("[copecart][bhs] BHS_DEFAULT_PROVIDER_ID not configured");
        return new Response(JSON.stringify({ error: "BHS provider not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Pferdename aus CopeCart Custom Fields (buyer füllt bei Kauf aus)
      const horseName: string =
        payload.custom_field_1 ||
        payload.metadata?.horse_name ||
        payload.custom?.horse_name ||
        "Pferd";

      // Kündigung via CopeCart
      if (isCancellationEvent) {
        if (subscriptionId) {
          const { error: cancelErr } = await supabase
            .from("bhs_horse_subscriptions")
            .update({
              status: "cancelled",
              cancelled_by: "client",
              cancelled_at: new Date().toISOString(),
              cancellation_reason: "CopeCart-Kündigung",
            })
            .eq("copecart_subscription_id", subscriptionId)
            .eq("provider_id", bhsProviderId);

          if (cancelErr) {
            console.error("[copecart][bhs] Cancellation update failed:", cancelErr.message);
          } else {
            console.log("[copecart][bhs] Subscription cancelled:", subscriptionId);

            // Push an Provider
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({
                user_id: bhsProviderId,
                title: "BHS Balance gekündigt",
                body: `Ein BHS Balance Abo wurde vom Kunden gekündigt (${subscriptionId.slice(0, 8)})`,
                url: "/bhs-balance",
              }),
            }).catch((e) => console.error("[copecart][bhs] Provider push failed:", e));
          }
        }
        return okResponse();
      }

      // Nur Kaufereignisse weiter verarbeiten
      if (!isPaymentEvent) {
        console.log("[copecart][bhs] Unhandled event type:", eventType);
        return okResponse();
      }

      if (!subscriptionId) {
        console.error("[copecart][bhs] Payment without an order identifier");
        return new Response(JSON.stringify({ error: "Missing order identifier" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // CopeCart retries and recurring payments reuse the subscription id.
      // Once it exists, never create another horse, account or welcome email.
      const { data: existingBhsSubscription, error: existingBhsError } = await supabase
        .from("bhs_horse_subscriptions")
        .select("id")
        .eq("copecart_subscription_id", subscriptionId)
        .eq("provider_id", bhsProviderId)
        .maybeSingle();
      if (existingBhsError) {
        console.error("[copecart][bhs] Existing subscription lookup failed:", existingBhsError.message);
        return new Response(JSON.stringify({ error: "BHS subscription lookup failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (existingBhsSubscription) {
        console.log("[copecart][bhs] Duplicate delivery acknowledged", { subscriptionId });
        return okResponse();
      }

      // 1. Client-Account: vorhanden oder neu anlegen
      let clientId: string;
      let tempPassword: string | null = null;

      if (profile) {
        clientId = profile.id;
        console.log("[copecart][bhs] Existing client found:", clientId);
      } else {
        // Neuen Client anlegen mit zufälligem Passwort
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((b) => chars[b % chars.length])
          .join("");

        const nameParts = customerName.trim().split(/\s+/);
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: customerName || "Neuer Kunde",
            role: "client",
          },
        });

        if (createErr) {
          // Schon registriert → trotzdem fortfahren
          if (createErr.message.includes("already been registered") || createErr.message.includes("already registered")) {
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customerEmail)
              .maybeSingle();
            if (!existingProfile) {
              console.error("[copecart][bhs] Cannot find or create client:", createErr.message);
              return new Response(JSON.stringify({ error: "Client creation failed" }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
            clientId = existingProfile.id;
            tempPassword = null;
            console.log("[copecart][bhs] Existing user found via fallback:", clientId);
          } else {
            console.error("[copecart][bhs] createUser error:", createErr.message);
            return new Response(JSON.stringify({ error: "Client creation failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        } else {
          clientId = newUser!.user.id;
          // Kurz warten bis Trigger die Profile-Zeile angelegt hat
          await new Promise((r) => setTimeout(r, 800));
          await supabase.from("profiles").update({
            full_name: customerName || nameParts[0] || "Neuer Kunde",
          }).eq("id", clientId);
          await supabase.from("user_roles").upsert(
            { user_id: clientId, role: "client" },
            { onConflict: "user_id,role" },
          );
          console.log("[copecart][bhs] New client account created:", clientId);
        }
      }

      // 2. Pferd anlegen
      const eqid = generateEqid();
      const { data: horse, error: horseErr } = await supabase
        .from("horses")
        .insert({
          owner_id: clientId,
          name: horseName,
          eqid,
        })
        .select("id")
        .single();

      if (horseErr) {
        console.error("[copecart][bhs] Horse creation failed:", horseErr.message);
        return new Response(JSON.stringify({ error: "Horse creation failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      console.log("[copecart][bhs] Horse created:", horse.id, eqid);

      // 3. bhs_horse_subscriptions anlegen
      const startedAt = new Date();
      const nextServiceDate = new Date(startedAt);
      nextServiceDate.setDate(nextServiceDate.getDate() + bhsMeta.intervalWeeks * 7);

      const { error: subErr } = await supabase
        .from("bhs_horse_subscriptions")
        .insert({
          horse_id: horse.id,
          provider_id: bhsProviderId,
          client_id: clientId,
          interval_weeks: bhsMeta.intervalWeeks,
          zone: bhsMeta.zone,
          monthly_price: bhsMeta.monthlyPrice,
          product_variant: bhsMeta.variant,
          copecart_subscription_id: subscriptionId,
          status: "active",
          started_at: startedAt.toISOString(),
          next_service_date: nextServiceDate.toISOString().split("T")[0],
        });

      if (subErr) {
        console.error("[copecart][bhs] Subscription insert failed:", subErr.message);
      } else {
        console.log("[copecart][bhs] Subscription created for horse:", horse.id);
      }

      // 4. Welcome-Email an Client
      if (resend) {
        await sendBhsWelcomeEmail(
          resend,
          customerEmail,
          customerName || "Kunde",
          horseName,
          bhsMeta.intervalWeeks,
          bhsMeta.zone,
          bhsMeta.monthlyPrice,
          tempPassword,
        );
      } else {
        console.log("[copecart][bhs] Resend not configured, skipping welcome email");
      }

      // 5. Push-Notification an Provider
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          user_id: bhsProviderId,
          title: "🐴 Neues BHS Balance Abo",
          body: `${customerName || customerEmail} – ${horseName} (${bhsMeta.intervalWeeks}W, Zone ${bhsMeta.zone}, ${bhsMeta.monthlyPrice}€/Monat)`,
          url: "/bhs-balance",
        }),
      }).catch((e) => console.error("[copecart][bhs] Provider push failed:", e));

      return okResponse();
    }
    // ─── Ende BHS BALANCE BRANCH ─────────────────────────────────────────────

    // ─── NEW SAAS PRODUCT BRANCH ────────────────────────────────────────────
    // Product-specific SaaS entitlements for HufManager Slim / HufiApp.
    // This branch is inactive until the real CopeCart product IDs are entered
    // in NEW_SAAS_PRODUCT_MAP after manual product creation.
    if (newSaasMeta) {
      if (!profile) {
        console.warn("[copecart][saas] No profile found for SaaS purchase", {
          product: newSaasMeta.product,
          plan: newSaasMeta.plan,
        });
        return okResponse();
      }

      if (isPaymentEvent) {
        const eventId = transactionId || subscriptionId || `${eventType}:${productId}:${profile.id}`;
        const { error: eventErr } = await supabase
          .from("saas_billing_events")
          .insert({
            provider: "copecart",
            event_id: eventId,
            product: newSaasMeta.product,
            plan: newSaasMeta.plan,
            user_id: profile.id,
            event_type: eventType,
            transition_status: "READY",
            billing_status: "VERIFIED_PAID",
            sanitized_payload: {
              product_id_present: productId !== "",
              transaction_id_present: !!transactionId,
              subscription_id_present: !!subscriptionId,
              is_test_order: isTestOrder,
            },
          });

        if (eventErr && !eventErr.message.includes("duplicate key")) {
          console.error("[copecart][saas] Billing event insert failed:", eventErr.message);
          return new Response(JSON.stringify({ error: "SaaS billing event failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (eventErr?.message.includes("duplicate key")) {
          console.log("[copecart][saas] Duplicate payment event acknowledged", { eventId });
          return okResponse();
        }

        await supabase
          .from("product_memberships")
          .upsert({
            user_id: profile.id,
            product: newSaasMeta.product,
            status: "ACTIVE",
            selected_at: new Date().toISOString(),
            source: "SYSTEM_MIGRATION",
            migration_version: "hufmanager-slim-pricing-v1",
          }, { onConflict: "user_id,product" });

        const { error: entitlementErr } = await supabase
          .from("product_entitlements")
          .upsert({
            user_id: profile.id,
            product: newSaasMeta.product,
            plan: newSaasMeta.plan,
            status: "ACTIVE",
            trial_status: "NONE",
            billing_status: "VERIFIED_PAID",
            billing_provider: "copecart",
            external_subscription_id: subscriptionId || null,
            source: "COPECART",
            migration_version: "hufmanager-slim-pricing-v1",
            metadata: {
              price_monthly_eur: newSaasMeta.priceMonthlyEur,
              trial_days: newSaasMeta.trialDays,
              transaction_id_present: !!transactionId,
            },
          }, { onConflict: "user_id,product,plan" });

        if (entitlementErr) {
          console.error("[copecart][saas] Entitlement update failed:", entitlementErr.message);
          return new Response(JSON.stringify({ error: "SaaS entitlement update failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        console.log("[copecart][saas] Product entitlement activated", {
          product: newSaasMeta.product,
          plan: newSaasMeta.plan,
          userId: profile.id,
        });
        return okResponse();
      }

      if (isPaymentFailureEvent || isCancellationEvent) {
        const status = isPaymentFailureEvent ? "PAST_DUE" : "CANCELLED";
        const billingStatus = isPaymentFailureEvent ? "PAST_DUE" : "CANCELLED";
        const { error: entitlementErr } = await supabase
          .from("product_entitlements")
          .update({
            status,
            billing_status: billingStatus,
          })
          .eq("user_id", profile.id)
          .eq("product", newSaasMeta.product)
          .eq("plan", newSaasMeta.plan);

        if (entitlementErr) {
          console.error("[copecart][saas] Entitlement cancellation/failure update failed:", entitlementErr.message);
          return new Response(JSON.stringify({ error: "SaaS entitlement status update failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return okResponse();
      }

      console.log("[copecart][saas] Unhandled event type for SaaS product:", eventType);
      return okResponse();
    }

    // Unbekannte Produkt-ID bei einem Zahlungsevent: NICHT stillschweigend
    // "pro" vergeben. Legacy IDs bleiben erhalten; neue SaaS IDs werden erst
    // nach CopeCart-Anlage explizit in NEW_SAAS_PRODUCT_MAP eingetragen.
    // Kündigungen/Refunds für unbekannte Produkte laufen bewusst weiter.
    if (isPaymentEvent && !subscriptionPlan) {
      console.error("[copecart] Zahlung für unbekannte Produkt-ID — kein Plan vergeben", { productId });
      return okResponse();
    }

    // If user doesn't exist and this is a payment event, create the user
    if (!profile && isPaymentEvent) {
      console.log("[copecart] User not found, creating new provider account...");
      
      // Parse name into first and last name
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Neuer";
      const lastName = nameParts.slice(1).join(" ") || "Provider";
      
      // Create user with invite (sends magic link email)
      const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(
        customerEmail,
        {
          data: {
            full_name: customerName || `${firstName} ${lastName}`,
            role: "provider",
          },
          redirectTo: "https://hufiapp.de/auth",
        }
      );

      if (createError) {
        console.error("[copecart] Error creating user:", createError.message);
        // If user already exists in auth but not in profiles, try to continue
        if (!createError.message.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "Failed to create user" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      if (newUser?.user) {
        const userId = newUser.user.id;
        console.log("[copecart] User created:", userId);

        // Wait a moment for the profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the profile with subscription data
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: customerName || `${firstName} ${lastName}`,
            subscription_status: "active",
            subscription_plan: subscriptionPlan,
            plan_override: planOverride,
            copecart_subscription_id: subscriptionId,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("[copecart] Error updating new profile:", updateError.message);
        }

        // Assign provider role
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: "provider",
          }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error("[copecart] Error assigning role:", roleError.message);
        }

        // Create default business_settings
        const { error: bsError } = await supabase
          .from("business_settings")
          .upsert({
            user_id: userId,
            business_name: customerName || null,
          }, { onConflict: "user_id" });

        if (bsError) {
          console.error("[copecart] Error creating business settings:", bsError.message);
        }

        // Auto-provision feature_statuses — same logic as for existing users below
        const featureMapNew = subscriptionPlan ? PLAN_FEATURE_MAP[subscriptionPlan] : null;
        if (featureMapNew) {
          const { error: featureErrorNew } = await supabase
            .from("profiles")
            .update({ feature_statuses: featureMapNew })
            .eq("id", userId);
          if (featureErrorNew) {
            console.error("[copecart] Feature flags update failed for new user:", featureErrorNew.message);
          } else {
            console.log("[copecart] Feature flags auto-provisioned for new user, plan:", subscriptionPlan);
          }
        }

        console.log("[copecart] New provider account created and configured successfully");

        return okResponse();
      }
    }

    // If still no profile found after creation attempt, acknowledge but don't fail
    if (!profile && !isPaymentEvent) {
      console.log("[copecart] No matching user found for non-payment event");
      return okResponse();
    }

    // Existing user - update their subscription
    if (profile) {
      console.log("[copecart] Profile found, updating subscription...");

      let updateData: {
        subscription_status?: string;
        subscription_plan?: string;
        plan_override?: string | null;
        copecart_subscription_id?: string;
      } = {};

      // Ereignis-Zuordnung über die zentralen Listen (echte CopeCart-Namen).
      // Vorher ein switch auf erfundene Namen — jeder Kauf fiel in default.
      if (isPaymentEvent) {
        console.log("[copecart] Zahlung erfolgreich:", eventType);
        updateData = {
          subscription_status: "active",
          subscription_plan: subscriptionPlan ?? undefined,
          plan_override: planOverride,
          copecart_subscription_id: subscriptionId,
        };
      } else if (isPaymentFailureEvent) {
        console.log("[copecart] Zahlung fehlgeschlagen:", eventType);
        updateData = { subscription_status: "past_due" };
      } else if (eventType === "payment.recurring.cancelled") {
        // Kündigung: Zugang läuft bis Periodenende weiter, deshalb nur den
        // Status setzen und den Plan NICHT herunterstufen.
        console.log("[copecart] Kündigung:", eventType);
        updateData = { subscription_status: "cancelled" };
      } else if (isCancellationEvent) {
        // Rückerstattung/Rückbuchung: Geld ist zurück, Zugang endet sofort.
        console.log("[copecart] Rückerstattung/Rückbuchung:", eventType);
        updateData = {
          subscription_status: "cancelled",
          subscription_plan: "starter",
          plan_override: null,
        };
      } else {
        console.log("[copecart] Ereignis nicht behandelt:", eventType);
        return okResponse();
      }

      // CopeCart retries must not create a second revenue event or admin
      // invoice. transaction_id is unique per payment; order_id is only the
      // recurring subscription key.
      if (!isTestOrder && transactionId) {
        const { data: processedRevenue, error: processedRevenueError } = await supabase
          .from("admin_revenue_log")
          .select("id")
          .eq("transaction_id", transactionId)
          .eq("event_type", eventType)
          .limit(1);
        if (processedRevenueError) {
          console.error("[copecart] Replay lookup failed:", processedRevenueError.message);
          return new Response(JSON.stringify({ error: "Replay lookup failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (processedRevenue && processedRevenue.length > 0) {
          console.log("[copecart] Duplicate delivery acknowledged", { eventType, transactionId });
          return okResponse();
        }
      }

      // Update the user's subscription status
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", profile.id);

        if (updateError) {
          console.error("[copecart] Update failed:", updateError.message);
          return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        console.log("[copecart] Subscription updated successfully");

        // Auto-provision feature_statuses based on plan
        const featureMap = subscriptionPlan ? PLAN_FEATURE_MAP[subscriptionPlan] : null;
        if (featureMap && updateData.subscription_status === "active") {
          const { error: featureError } = await supabase
            .from("profiles")
            .update({ feature_statuses: featureMap })
            .eq("id", profile.id);

          if (featureError) {
            console.error("[copecart] Feature flags update failed:", featureError.message);
          } else {
            console.log("[copecart] Feature flags auto-provisioned for plan:", subscriptionPlan);
          }
        }

        if (isTestOrder) {
          console.log("[copecart] TESTBESTELLUNG erkannt (payment_status:", payload.payment_status,
            ") — Freischaltung ausgeführt, aber kein Umsatzlog und keine Admin-Rechnung.");
          return okResponse();
        }

        // Log to admin_revenue_log
        // line_item_amount statt geratener Feldnamen — sonst stand hier
        // immer 0, und es wurde nie eine admin_invoice erzeugt.
        const parsedAmount = typeof paidAmount === "number" && !Number.isNaN(paidAmount) ? paidAmount : 0;
        const { error: logError } = await supabase
          .from("admin_revenue_log")
          .insert({
            event_type: eventType,
            amount: parsedAmount,
            currency: "EUR",
            plan_name: subscriptionPlan,
            provider_id: profile.id,
            customer_email: customerEmail,
            customer_name: customerName,
            transaction_id: transactionId || null,
          });

        if (logError) {
          console.error("[copecart] Revenue log failed:", logError.message);
        } else {
          console.log("[copecart] Revenue logged successfully");
        }

        // Auto-create admin_invoice for subscription payment
        if (updateData.subscription_status === "active" && parsedAmount > 0) {
          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
          const dueDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split("T")[0];

          // Check if admin_invoice already exists for this period+provider
          const { data: existingInv } = await supabase
            .from("admin_invoices")
            .select("id")
            .eq("provider_id", profile.id)
            .gte("period_start", periodStart)
            .lte("period_end", periodEnd)
            .limit(1);

          if (!existingInv || existingInv.length === 0) {
            const PLAN_ITEMS: Record<string, { description: string; price: number }> = {
              starter: { description: "HufManager Starter – Monatslizenz", price: 9.90 },
              pro: { description: "HufManager Pro – Monatslizenz", price: 29.00 },
              duo: { description: "HufManager Duo – Monatslizenz", price: 49.00 },
              team: { description: "HufManager Team – Monatslizenz", price: 79.00 },
            };
            const planItem = PLAN_ITEMS[subscriptionPlan] || PLAN_ITEMS.starter;

            // Fetch readable_id for provider_pid
            const { data: provProfile } = await supabase
              .from("profiles")
              .select("full_name, email, readable_id")
              .eq("id", profile.id)
              .maybeSingle();

            const { data: adminInv, error: adminInvErr } = await supabase
              .from("admin_invoices")
              .insert({
                invoice_number: "",
                provider_id: profile.id,
                provider_pid: provProfile?.readable_id || null,
                provider_name: provProfile?.full_name || customerName || "Unbekannt",
                provider_email: provProfile?.email || customerEmail,
                plan: subscriptionPlan,
                period_start: periodStart,
                period_end: periodEnd,
                subtotal: parsedAmount,
                total: parsedAmount,
                kleinunternehmer: true,
                payment_method: "copecart",
                payment_source: "copecart_webhook",
                status: "paid",
                paid_at: now.toISOString(),
                due_date: dueDate,
              })
              .select("id, invoice_number")
              .single();

            if (adminInvErr) {
              console.error("[copecart] Admin invoice creation failed:", adminInvErr.message);
            } else {
              console.log("[copecart] Admin invoice created:", adminInv.invoice_number);
              // Create invoice line item
              await supabase.from("admin_invoice_items").insert({
                invoice_id: adminInv.id,
                position: 1,
                description: planItem.description,
                quantity: 1,
                unit: "Monat",
                unit_price: parsedAmount,
                total: parsedAmount,
              });
            }
          } else {
            console.log("[copecart] Admin invoice already exists for this period, skipping");
          }
        }
      }
    }

    return okResponse();
  } catch (error: any) {
    console.error("[copecart] Error:", error?.message || error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
