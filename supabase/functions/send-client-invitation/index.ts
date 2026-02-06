import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape helper to prevent XSS
function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface InvitationRequest {
  profileId: string;
  email: string;
  fullName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting client invitation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is a provider
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Ungültiger Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is a provider
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userRole?.role !== "provider") {
      return new Response(
        JSON.stringify({ error: "Nur Provider können Einladungen senden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { profileId, email, fullName }: InvitationRequest = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: "E-Mail und Name sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending invitation to ${email} for profile ${profileId}`);

    // Fetch provider's business settings
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, phone, email, logo_url")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch provider's profile
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const businessName = businessSettings?.business_name || providerProfile?.full_name || "HufManager";
    const businessPhone = businessSettings?.phone || "";
    const businessEmail = businessSettings?.email || "";

    // Debug logging to verify sender name
    console.log("=== SENDER NAME DEBUG ===");
    console.log("Provider user.id:", user.id);
    console.log("businessSettings.business_name:", businessSettings?.business_name);
    console.log("providerProfile.full_name:", providerProfile?.full_name);
    console.log("Final businessName used:", businessName);
    console.log("=========================");

    // Generate app URL (use origin from request or fallback)
    const origin = req.headers.get("origin") || "https://hufmanager.de";
    const loginUrl = `${origin}/auth`;

    // Escape all user-controlled data
    const safeFullName = escapeHtml(fullName);
    const safeBusinessName = escapeHtml(businessName);
    const safeBusinessPhone = escapeHtml(businessPhone);
    const safeBusinessEmail = escapeHtml(businessEmail);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #fff; padding: 30px; }
          .cta-btn { 
            display: inline-block; 
            background: #F47B20; 
            color: white !important; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            margin: 20px 0;
          }
          .cta-btn:hover { background: #e06b10; }
          .feature-list { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { margin: 10px 0; padding-left: 24px; position: relative; }
          .feature-item::before { content: "✓"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .horse-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="horse-icon">🐴</div>
            <h1 style="margin: 0;">Willkommen bei HufManager!</h1>
          </div>
          <div class="content">
            <p>Hallo ${safeFullName},</p>
            <p><strong>${safeBusinessName}</strong> hat Sie zur HufManager KundenApp eingeladen!</p>
            
            <p>Mit der KundenApp haben Sie folgende Vorteile:</p>
            
            <div class="feature-list">
              <div class="feature-item">Alle Termine für Ihre Pferde im Überblick</div>
              <div class="feature-item">Huffotos und Behandlungshistorie einsehen</div>
              <div class="feature-item">Termine einfach bestätigen</div>
              <div class="feature-item">Rechnungen digital abrufen</div>
              <div class="feature-item">Direkt mit Ihrem Hufbearbeiter kommunizieren</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="cta-btn">🔐 Jetzt registrieren</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Klicken Sie auf den Button oben und erstellen Sie Ihr Konto mit dieser E-Mail-Adresse: <strong>${escapeHtml(email)}</strong>
            </p>
            
            <p>Mit freundlichen Grüßen,<br><strong>${safeBusinessName}</strong></p>
          </div>
          <div class="footer">
            ${safeBusinessPhone ? `📞 ${safeBusinessPhone}<br>` : ""}
            ${safeBusinessEmail ? `✉️ ${safeBusinessEmail}` : ""}
            <p style="margin-top: 15px; font-size: 12px;">
              Diese E-Mail wurde über HufManager gesendet.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send invitation email
    console.log("Sende Email via Resend an:", email);
    const emailResponse = await resend.emails.send({
      from: `HufManager <info@hufmanager.de>`,
      to: [email],
      subject: `🐴 ${safeBusinessName} lädt Sie zur HufManager KundenApp ein`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update the profile with invitation timestamp
    if (profileId) {
      await supabase
        .from("profiles")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", profileId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Einladung erfolgreich gesendet"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-client-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
