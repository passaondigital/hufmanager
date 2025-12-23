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
  invoiceId: string;
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  totalAmount: number;
  providerName: string;
  providerEmail?: string;
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
    const { invoiceId, recipientEmail, recipientName, invoiceNumber, totalAmount, providerName, providerEmail } = body;

    if (!invoiceId || !recipientEmail || !recipientName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format currency
    const formattedAmount = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(totalAmount);

    // Send email to client
    const emailResponse = await resend.emails.send({
      from: "HufManager <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Rechnung ${invoiceNumber || ""}`.trim(),
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rechnung</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Neue Rechnung</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin-top: 0;">Hallo ${recipientName},</p>
            
            <p>Sie haben eine neue Rechnung von <strong>${providerName}</strong> erhalten.</p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Rechnungsnummer:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoiceNumber || "-"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Betrag:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 18px; color: #d97706;">${formattedAmount}</td>
                </tr>
              </table>
            </div>
            
            <p>Sie können die Rechnung in Ihrer HufManager-App einsehen und herunterladen.</p>
            
            <p style="margin-bottom: 0;">Mit freundlichen Grüßen,<br><strong>${providerName}</strong></p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Diese E-Mail wurde über HufManager versendet.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);