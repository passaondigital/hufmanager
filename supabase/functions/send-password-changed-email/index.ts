import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordChangedEmailRequest {
  email: string;
  userName?: string;
}

// HTML escape helper to prevent XSS in email clients
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-password-changed-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, userName }: PasswordChangedEmailRequest = await req.json();

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending password changed confirmation to: ${email}`);

    const displayName = escapeHtml(userName) || "Nutzer";
    const currentDate = new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailResponse = await resend.emails.send({
      from: "HufManager <noreply@hufmanager.de>",
      to: [email],
      subject: "Passwort erfolgreich geändert - HufManager",
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #121212;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #1E1E1E; border-radius: 16px; padding: 40px; border: 1px solid #2a2a2a;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background-color: #F47B20; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Passwort geändert</h1>
              </div>
              
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hallo ${displayName},
              </p>
              
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Ihr Passwort für Ihren HufManager-Account wurde erfolgreich geändert.
              </p>
              
              <div style="background-color: #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #a0a0a0; font-size: 14px; margin: 0;">
                  <strong style="color: #e0e0e0;">Zeitpunkt:</strong> ${currentDate}
                </p>
              </div>
              
              <div style="background-color: rgba(244, 123, 32, 0.1); border: 1px solid rgba(244, 123, 32, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #F47B20; font-size: 14px; margin: 0; font-weight: 500;">
                  ⚠️ Wenn Sie diese Änderung nicht vorgenommen haben, kontaktieren Sie uns bitte umgehend.
                </p>
              </div>
              
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                Mit freundlichen Grüßen,<br>
                <strong style="color: #F47B20;">Ihr HufManager Team</strong>
              </p>
            </div>
            
            <p style="color: #666666; font-size: 12px; text-align: center; margin-top: 24px;">
              Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese Nachricht.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password changed email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-password-changed-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
