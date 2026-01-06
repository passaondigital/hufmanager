import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  invoice_id: string;
  recipient_email: string;
  recipient_name: string;
  invoice_number: string;
  total_amount: number;
  provider_name: string;
  provider_email?: string;
  pdf_base64?: string; // Base64 encoded PDF
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendInvoiceRequest = await req.json();
    const { 
      invoice_id, 
      recipient_email, 
      recipient_name, 
      invoice_number, 
      total_amount, 
      provider_name, 
      provider_email,
      pdf_base64 
    } = body;

    if (!recipient_email || !recipient_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format currency
    const formattedAmount = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(total_amount);

    // Get provider business settings for additional branding
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, owner_name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const businessName = provider_name || businessSettings?.business_name || businessSettings?.owner_name || "Ihr Hufbearbeiter";
    
    // Build email options
    const emailOptions: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: { filename: string; content: Uint8Array }[];
    } = {
      from: `${businessName} <onboarding@resend.dev>`,
      to: [recipient_email],
      subject: `Rechnung ${invoice_number || ""}`.trim() + ` von ${businessName}`,
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
                    <td style="background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        ${businessName}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                        Guten Tag ${recipient_name},
                      </h2>
                      
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        anbei erhalten Sie Ihre Rechnung <strong style="color: #111827;">${invoice_number || "-"}</strong> 
                        über <strong style="color: #F47B20;">${formattedAmount}</strong>.
                      </p>
                      
                      <!-- Invoice Card -->
                      <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 24px;">
                            <table role="presentation" style="width: 100%;">
                              <tr>
                                <td style="padding-bottom: 12px;">
                                  <span style="color: #6b7280; font-size: 14px;">Rechnungsnummer</span><br>
                                  <span style="color: #111827; font-size: 16px; font-weight: 600;">${invoice_number || "-"}</span>
                                </td>
                                <td style="padding-bottom: 12px; text-align: right;">
                                  <span style="color: #6b7280; font-size: 14px;">Betrag</span><br>
                                  <span style="color: #F47B20; font-size: 20px; font-weight: 700;">${formattedAmount}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${pdf_base64 ? `
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        📎 Die Rechnung finden Sie als PDF im Anhang dieser E-Mail.
                      </p>
                      ` : `
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        Sie können die Rechnung in Ihrer HufManager-App einsehen und herunterladen.
                      </p>
                      `}
                      
                      <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.
                      </p>
                      
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        Bei Fragen stehen wir Ihnen gerne zur Verfügung.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                        ${businessName}${businessSettings?.phone ? ` • ${businessSettings.phone}` : ""}${businessSettings?.email ? ` • ${businessSettings.email}` : ""}
                      </p>
                      <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
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
    };

    // Add PDF attachment if provided
    if (pdf_base64) {
      // Decode base64 to Uint8Array
      const binaryString = atob(pdf_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      emailOptions.attachments = [
        {
          filename: `Rechnung_${invoice_number || invoice_id || "Rechnung"}.pdf`,
          content: bytes,
        },
      ];
    }

    // Send email
    const emailResponse = await resend.emails.send(emailOptions);

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
