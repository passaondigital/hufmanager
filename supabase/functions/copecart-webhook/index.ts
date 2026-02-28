import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Copecart product IDs to subscription plans
// HufManager Copecart Products:
// - Anfänger (19€): 9bb65569 → starter
// - Fortgeschritten (29€): ec500b5e → advanced
// - Profi (39€): 483bbb5b → pro
const PRODUCT_PLAN_MAP: Record<string, string> = {
  "9bb65569": "starter",      // Anfänger 19€/Monat
  "ec500b5e": "advanced",     // Fortgeschritten 29€/Monat
  "483bbb5b": "pro",          // Profi 39€/Monat
};

const PRODUCT_PLAN_OVERRIDE_MAP: Record<string, string> = {
  "9bb65569": "copecart_anfaenger",
  "ec500b5e": "copecart_fortgeschritten",
  "483bbb5b": "copecart_profi",
};

// Plan → feature_statuses mapping for auto-provisioning
const PLAN_FEATURE_MAP: Record<string, Record<string, string>> = {
  starter: {
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
    autoflow_reminders: "disabled",
    autoflow_invoicing: "disabled",
    autoflow_scheduling: "disabled",
    autoflow_feedback: "disabled",
    autoflow_checkin: "disabled",
    beta_features: "disabled",
  },
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
    module_team: "beta",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "disabled",
    autoflow_feedback: "public",
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
    module_team: "public",
    autoflow_reminders: "public",
    autoflow_invoicing: "public",
    autoflow_scheduling: "public",
    autoflow_feedback: "public",
    autoflow_checkin: "public",
    beta_features: "beta",
  },
};

function getPlanFromProductId(productId: string): string {
  return PRODUCT_PLAN_MAP[productId] || 'pro';
}

function getPlanOverrideFromProductId(productId: string): string | null {
  return PRODUCT_PLAN_OVERRIDE_MAP[productId] || null;
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
          redirectTo: "https://hufmanager.de/auth",
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
        const { error: logError } = await supabase
          .from("admin_revenue_log")
          .insert({
            event_type: eventType,
            amount: typeof amount === "string" ? parseFloat(amount) : amount,
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
