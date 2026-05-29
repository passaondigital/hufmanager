import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Copecart product IDs to subscription plans
// HufManager Copecart Products (NEW – March 2026):
// - Starter (9,90€): 8ef10f74
// - Pro (29€): 1996da6f
// - Duo (49€): 953da638
// - Team (79€): badae7d2
// Legacy IDs kept for backward compatibility:
const PRODUCT_PLAN_MAP: Record<string, string> = {
  // New product IDs
  "8ef10f74": "starter",      // Starter 9,90€/Monat
  "1996da6f": "pro",          // Pro 29€/Monat
  "953da638": "duo",          // Duo 49€/Monat
  "badae7d2": "team",         // Team 79€/Monat
  // Legacy product IDs (keep for existing subscriptions)
  "9bb65569": "starter",
  "ec500b5e": "pro",
  "483bbb5b": "pro",
};

const PRODUCT_PLAN_OVERRIDE_MAP: Record<string, string> = {
  "8ef10f74": "copecart_starter",
  "1996da6f": "copecart_pro",
  "953da638": "copecart_duo",
  "badae7d2": "copecart_team",
  // Legacy
  "9bb65569": "copecart_starter",
  "ec500b5e": "copecart_pro",
  "483bbb5b": "copecart_pro",
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

function getPlanFromProductId(productId: string): string {
  return PRODUCT_PLAN_MAP[productId] || 'pro';
}

function getPlanOverrideFromProductId(productId: string): string | null {
  return PRODUCT_PLAN_OVERRIDE_MAP[productId] || null;
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
      from: "Barhufservice Schmid <onboarding@resend.dev>",
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

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  const maxLength = Math.max(aBytes.length, bBytes.length, 1);
  let result = aBytes.length ^ bBytes.length;
  
  for (let i = 0; i < maxLength; i++) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    result |= aByte ^ bByte;
  }
  
  return result === 0;
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
      from: `HufManager <onboarding@resend.dev>`,
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Copecart webhook received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the webhook payload
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload, null, 2));

    // Verify IPN password
    const expectedPassword = Deno.env.get("COPECART_IPN_PASSWORD");
    const receivedPassword = payload.password || payload.ipn_password || payload.secret;
    
    if (!expectedPassword) {
      console.error("COPECART_IPN_PASSWORD not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!constantTimeCompare(receivedPassword || '', expectedPassword)) {
      console.error("Invalid IPN password received");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("IPN password verified successfully");

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

    // Copecart IPN fields - try multiple possible field names
    const eventType = payload.event || payload.type || payload.event_type;
    const customerEmail = (payload.customer?.email || payload.email || payload.buyer?.email || payload.buyer_email || "").toLowerCase().trim();
    const customerName = payload.customer?.name || payload.buyer?.name || payload.buyer_name || payload.name || "";
    const subscriptionId = payload.subscription_id || payload.id || payload.order_id;
    const productId = payload.product_id || payload.product?.id || "";
    
    // Check for custom field (invoice ID for payment links)
    const customField = payload.custom || payload.custom_field || payload.metadata?.custom || "";
    
    console.log("[copecart] Event:", eventType, "| Product:", productId, "| Email:", customerEmail, "| Custom:", customField);

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
        const isSuccessfulPayment = [
          "order_created",
          "order.created",
          "subscription_payment_succeeded",
          "subscription.payment.succeeded",
          "payment_completed",
          "payment.completed",
          "purchase",
          "sale",
        ].includes(eventType);
        
        if (isSuccessfulPayment) {
          // Update invoice status to paid
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              payment_external_id: subscriptionId || payload.transaction_id || payload.order_id,
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
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Invoice payment processed",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
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
    const vaultMeta = getVaultProductMeta(productId);

    // Handle payment/order events - these are when we should create users
    const isPaymentEvent = [
      "order_created",
      "order.created",
      "subscription_payment_succeeded",
      "subscription.payment.succeeded",
      "payment_completed",
      "payment.completed",
      "purchase",
      "sale",
    ].includes(eventType);

    const isCancellationEvent = [
      "subscription_cancelled",
      "subscription.cancelled",
      "subscription.canceled",
      "subscription_expired",
      "subscription.expired",
      "refund_created",
      "refund.created",
      "refund",
    ].includes(eventType);

    const isPaymentFailureEvent = [
      "payment_failed",
      "payment.failed",
      "subscription_payment_failed",
      "subscription.payment.failed",
    ].includes(eventType);

    // ─── VAULT PRODUCT BRANCH ──────────────────────────────────────────────
    // Standalone Tresor subscription. Touches only the vault_* columns and
    // leaves HufManager subscription_plan / plan_override untouched. We do not
    // auto-create user accounts for vault purchases — the user must already
    // exist as a registered owner. If not, we acknowledge the webhook and
    // log a warning so support can reach out.
    if (vaultMeta) {
      if (!profile) {
        console.warn("[copecart][vault] No profile found for vault purchase:", customerEmail, "| Product:", productId);
        return new Response(JSON.stringify({
          success: true,
          warning: "Vault product purchased but no matching user account found",
          email: customerEmail,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
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
        return new Response(JSON.stringify({ success: true, message: "Event type not handled" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
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
      return new Response(JSON.stringify({
        success: true,
        scope: "vault",
        plan: vaultMeta.plan,
        cycle: vaultMeta.cycle,
        status: vaultUpdate.vault_plan_status ?? null,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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
        return new Response(JSON.stringify({ success: true, scope: "bhs_balance", action: "cancelled" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Nur Kaufereignisse weiter verarbeiten
      if (!isPaymentEvent) {
        console.log("[copecart][bhs] Unhandled event type:", eventType);
        return new Response(JSON.stringify({ success: true, message: "Event type not handled" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
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

      return new Response(JSON.stringify({
        success: true,
        scope: "bhs_balance",
        clientId,
        horseId: horse.id,
        eqid,
        variant: bhsMeta.variant,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    // ─── Ende BHS BALANCE BRANCH ─────────────────────────────────────────────

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

        console.log("[copecart] New provider account created and configured successfully");
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "New provider account created",
          userId: userId,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // If still no profile found after creation attempt, acknowledge but don't fail
    if (!profile && !isPaymentEvent) {
      console.log("[copecart] No matching user found for non-payment event");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No matching user found, webhook acknowledged" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

      // Handle different event types
      switch (eventType) {
        case "order_created":
        case "order.created":
        case "subscription_payment_succeeded":
        case "subscription.payment.succeeded":
        case "payment_completed":
        case "payment.completed":
        case "purchase":
        case "sale":
          console.log("Processing successful payment/order");
          updateData = {
            subscription_status: "active",
            subscription_plan: subscriptionPlan,
            plan_override: planOverride,
            copecart_subscription_id: subscriptionId,
          };
          break;

        case "subscription_cancelled":
        case "subscription.cancelled":
        case "subscription.canceled":
          console.log("Processing subscription cancellation");
          updateData = {
            subscription_status: "cancelled",
          };
          break;

        case "payment_failed":
        case "payment.failed":
        case "subscription_payment_failed":
        case "subscription.payment.failed":
          console.log("Processing failed payment");
          updateData = {
            subscription_status: "past_due",
          };
          break;

        case "subscription_expired":
        case "subscription.expired":
          console.log("Processing subscription expiration");
          updateData = {
            subscription_status: "cancelled",
            subscription_plan: "starter",
            plan_override: null,
          };
          break;

        case "refund_created":
        case "refund.created":
        case "refund":
          console.log("Processing refund");
          updateData = {
            subscription_status: "cancelled",
            subscription_plan: "starter",
            plan_override: null,
          };
          break;

        default:
          console.log("Unknown event type, logging but not processing:", eventType);
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Event type not handled" 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
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
        const featureMap = PLAN_FEATURE_MAP[subscriptionPlan];
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

        // Log to admin_revenue_log
        const amount = payload.amount || payload.total || payload.price || 0;
        const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
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
            transaction_id: subscriptionId || payload.transaction_id || null,
            raw_payload: payload,
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[copecart] Error:", error?.message || error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
