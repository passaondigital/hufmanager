import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendAdminInvoiceRequest {
  invoice_id: string;
  recipient_email: string;
  recipient_name: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  payment_method: string;
  pdf_base64: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendAdminInvoiceRequest = await req.json();
    const {
      invoice_id,
      recipient_email,
      recipient_name,
      invoice_number,
      total_amount,
      due_date,
      payment_method,
      pdf_base64,
    } = body;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);

    const formatEur = (v: number) =>
      v.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";

    const bankSection = payment_method === "bank_transfer"
      ? `
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-top:16px;">
          <p style="font-weight:600;margin:0 0 8px;">Bankverbindung</p>
          <p style="margin:0;font-size:14px;">IBAN: DE66 2020 2080 0002 8383 704<br/>
          BIC: SXPYDEHH<br/>
          Kontoinhaber: Pascal Christian Schmid<br/>
          Verwendungszweck: ${invoice_number}</p>
        </div>
      `
      : "";

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#ffffff;margin:0;padding:20px;">
        <div style="max-width:600px;margin:0 auto;">
          <div style="text-align:center;padding:24px 0;border-bottom:2px solid #e5e7eb;">
            <h1 style="margin:0;font-size:24px;color:#1a1a1a;">HufManager</h1>
          </div>
          
          <div style="padding:24px 0;">
            <p style="font-size:16px;">Hallo ${recipient_name},</p>
            <p>anbei erhalten Sie Ihre Rechnung von HufManager.</p>
            
            <div style="background:#f0f9ff;padding:20px;border-radius:8px;border-left:4px solid #3b82f6;margin:20px 0;">
              <table style="width:100%;font-size:14px;">
                <tr><td style="padding:4px 0;color:#6b7280;">Rechnungsnr.</td><td style="padding:4px 0;font-weight:600;">${invoice_number}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Betrag</td><td style="padding:4px 0;font-weight:600;font-size:18px;">${formatEur(total_amount)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Zahlungsziel</td><td style="padding:4px 0;font-weight:600;">${due_date}</td></tr>
              </table>
            </div>

            ${bankSection}

            <p style="margin-top:24px;font-size:14px;color:#6b7280;">
              Die Rechnung finden Sie als PDF im Anhang dieser E-Mail.
            </p>

            <div style="text-align:center;margin-top:24px;">
              <a href="https://hufiapp.de/home" 
                 style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Rechnung im Profil einsehen
              </a>
            </div>
          </div>

          <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              HufManager | support@hufmanager.de | hufmanager.de<br/>
              Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailPayload: any = {
      from: "HufManager <support@hufmanager.de>",
      to: [recipient_email],
      cc: ["support@hufmanager.de"],
      subject: `Ihre Rechnung von HufManager – Nr. ${invoice_number}`,
      html: htmlBody,
    };

    // Attach PDF if available
    if (pdf_base64) {
      emailPayload.attachments = [
        {
          filename: `${invoice_number}.pdf`,
          content: pdf_base64,
        },
      ];
    }

    const { error: sendError } = await resend.emails.send(emailPayload);
    if (sendError) {
      console.error("[send-admin-invoice] Resend error:", sendError);
      throw new Error(`Email send failed: ${JSON.stringify(sendError)}`);
    }

    // Update invoice status
    await supabase
      .from("admin_invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoice_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-admin-invoice] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
