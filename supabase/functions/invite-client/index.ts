import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 8; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

interface InviteClientRequest {
  email: string;
  fullName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated provider
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Check role = provider
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    if (roleData?.role !== "provider") {
      return new Response(
        JSON.stringify({ error: "Nur Provider können Kunden einladen" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Pro subscription
    const { data: providerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, subscription_plan, plan_override, access_valid_until")
      .eq("id", callerUser.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const isValidUntil = providerProfile?.access_valid_until
      ? providerProfile.access_valid_until > now
      : false;
    const isPro =
      providerProfile?.plan_override === "pro" ||
      (providerProfile?.subscription_plan === "pro" && isValidUntil);

    if (!isPro) {
      return new Response(
        JSON.stringify({ error: "Diese Funktion erfordert ein Pro-Abo" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName }: InviteClientRequest = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: "E-Mail und Name sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Ein Konto mit dieser E-Mail existiert bereits" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate one-time password
    const temporaryPassword = generatePassword();

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "client",
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Fehler beim Erstellen des Kontos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // Wait for trigger to create profile
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Update profile: set force_password_reset + link to provider
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        email: email,
        force_password_reset: true,
        created_by_provider_id: callerUser.id,
        invited_at: new Date().toISOString(),
        has_logged_in: false,
      })
      .eq("id", newUserId);

    // Create access_grants entry
    await supabaseAdmin.from("access_grants").insert({
      provider_id: callerUser.id,
      client_id: newUserId,
      is_active: true,
      can_view_basic: true,
      can_view_medical: true,
      can_create_appointments: true,
    });

    // Send invitation email with credentials
    const resend = new Resend(resendApiKey);
    const providerName = providerProfile?.full_name || "Dein Hufbearbeiter";
    const loginUrl = "https://app.hufmanager.de/auth";

    const safeFullName = escapeHtml(fullName);
    const safeProviderName = escapeHtml(providerName);
    const safeEmail = escapeHtml(email);

    await resend.emails.send({
      from: "HufManager <info@hufmanager.de>",
      to: [email],
      subject: `🐴 ${safeProviderName} hat dein HufManager-Konto erstellt`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #fff; padding: 30px; }
          .credentials { background: #f9f9f9; border: 2px dashed #F47B20; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .password { font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #F47B20; font-family: monospace; }
          .cta-btn { display: inline-block; background: #F47B20; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
        </head>
        <body>
        <div class="container">
          <div class="header">
            <div style="font-size:48px;margin-bottom:10px;">🐴</div>
            <h1 style="margin:0;">Willkommen bei HufManager!</h1>
          </div>
          <div class="content">
            <p>Hallo ${safeFullName},</p>
            <p><strong>${safeProviderName}</strong> hat ein Konto für dich in der HufManager KundenApp erstellt.</p>
            <p>Deine Zugangsdaten für die erste Anmeldung:</p>
            <div class="credentials">
              <p style="margin:0 0 8px;font-size:14px;color:#666;">E-Mail: <strong>${safeEmail}</strong></p>
              <p style="margin:0 0 4px;font-size:14px;color:#666;">Einmalpasswort:</p>
              <div class="password">${temporaryPassword}</div>
              <p style="margin:8px 0 0;font-size:12px;color:#999;">Bitte ändere dein Passwort nach der ersten Anmeldung.</p>
            </div>
            <div style="text-align:center;">
              <a href="${loginUrl}" class="cta-btn">🔐 Jetzt anmelden</a>
            </div>
            <p style="font-size:14px;color:#666;">Nach der Anmeldung wirst du aufgefordert, ein eigenes Passwort zu vergeben.</p>
            <p>Mit freundlichen Grüßen,<br><strong>${safeProviderName}</strong></p>
          </div>
          <div class="footer">
            <p>Diese E-Mail wurde über HufManager gesendet.</p>
          </div>
        </div>
        </body>
        </html>
      `,
    });

    console.log(`Client ${email} created and invited by provider ${callerUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        message: `Konto erstellt und Einladungs-E-Mail an ${email} gesendet`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in invite-client:", error);
    return new Response(
      JSON.stringify({ error: "Interner Serverfehler", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
