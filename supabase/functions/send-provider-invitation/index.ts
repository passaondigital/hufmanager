import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

interface ProviderInvitationRequest {
  userId: string;
  email: string;
  fullName: string;
  businessName?: string | null;
  planName?: string | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting provider invitation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Ungültiger Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Nur Admins können Provider-Einladungen senden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { userId, email, fullName, businessName, planName }: ProviderInvitationRequest = await req.json();

    if (!userId || !email || !fullName) {
      return new Response(
        JSON.stringify({ error: "userId, email und fullName sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending provider invitation to ${email} for user ${userId}`);

    // Generate a password reset link (this acts as the invitation link)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: "https://hufmanager.de/auth",
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Erstellen des Login-Links" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The magic link URL
    const magicLinkUrl = linkData.properties?.action_link || "https://hufmanager.de/auth";
    console.log("Generated magic link for provider invitation");

    // Determine plan display name
    const planDisplayName = getPlanDisplayName(planName);

    // Escape all user-controlled data
    const safeFullName = escapeHtml(fullName);
    const safeBusinessName = escapeHtml(businessName);
    const safeEmail = escapeHtml(email);
    const safePlanName = escapeHtml(planDisplayName);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
          .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 40px 30px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin-bottom: 10px; }
          .content { background: #fff; padding: 40px 30px; }
          .welcome-badge { 
            display: inline-block; 
            background: #22c55e; 
            color: white; 
            padding: 6px 16px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: 600;
            margin-bottom: 20px;
          }
          .plan-badge { 
            display: inline-block; 
            background: #F47B20; 
            color: white; 
            padding: 6px 16px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: 600;
            margin-left: 8px;
          }
          .cta-btn { 
            display: inline-block; 
            background: #F47B20; 
            color: white !important; 
            padding: 18px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            margin: 25px 0;
          }
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
          .feature-item { 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 8px;
            border-left: 3px solid #F47B20;
          }
          .feature-icon { font-size: 24px; margin-bottom: 5px; }
          .feature-title { font-weight: 600; color: #333; }
          .footer { background: #1a1a1a; padding: 25px; text-align: center; font-size: 14px; color: #999; }
          .highlight-box {
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            border: 1px solid #F47B20;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HUFMANAGER</div>
            <p style="margin: 0; opacity: 0.9;">Professionelle Software für Hufbearbeiter</p>
          </div>
          <div class="content">
            <span class="welcome-badge">🎉 Willkommen!</span>
            ${safePlanName ? `<span class="plan-badge">📦 ${safePlanName}</span>` : ''}
            
            <h1 style="margin-top: 20px; color: #1a1a1a;">Hallo ${safeFullName}!</h1>
            
            <p style="font-size: 18px;">
              Dein HufManager-Account wurde erfolgreich eingerichtet${safeBusinessName ? ` für <strong>${safeBusinessName}</strong>` : ''}.
            </p>
            
            <div class="highlight-box">
              <p style="margin: 0;"><strong>🔐 Dein nächster Schritt:</strong></p>
              <p style="margin: 10px 0 0 0;">Klicke auf den Button unten um dich einzuloggen und dein Passwort festzulegen.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${magicLinkUrl}" class="cta-btn">Jetzt loslegen →</a>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Dieser Link ist 24 Stunden gültig.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-weight: 600; margin-bottom: 15px;">Was dich erwartet:</p>
            
            <div class="feature-grid">
              <div class="feature-item">
                <div class="feature-icon">📅</div>
                <div class="feature-title">Terminverwaltung</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🐴</div>
                <div class="feature-title">Pferde-Datenbank</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📊</div>
                <div class="feature-title">Hufanalyse</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🧾</div>
                <div class="feature-title">Rechnungen</div>
              </div>
            </div>
            
            <p style="color: #666;">
              Bei Fragen erreichst du uns unter <a href="mailto:support@hufmanager.de" style="color: #F47B20;">support@hufmanager.de</a>
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© 2026 HufManager. Alle Rechte vorbehalten.</p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
              Diese E-Mail wurde an ${safeEmail} gesendet.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send invitation email via Resend
    console.log("Sending provider invitation email via Resend to:", email);
    const emailResponse = await resend.emails.send({
      from: "HufManager <info@hufmanager.de>",
      to: [email],
      subject: `🐴 Willkommen bei HufManager – Dein Account ist bereit!`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update the profile with invitation timestamp
    await supabaseAdmin
      .from("profiles")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Provider-Einladung erfolgreich gesendet"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-provider-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getPlanDisplayName(planOverride: string | null | undefined): string {
  if (!planOverride) return "";
  
  const planNames: Record<string, string> = {
    "copecart_anfaenger": "Anfänger",
    "copecart_fortgeschritten": "Fortgeschritten", 
    "copecart_profi": "Profi",
    "lifetime_grant": "Lifetime",
    "manual_cash_1y": "1 Jahr",
    "beta_tester": "Beta Tester",
    "employee": "Mitarbeiter",
  };
  
  return planNames[planOverride] || planOverride;
}
