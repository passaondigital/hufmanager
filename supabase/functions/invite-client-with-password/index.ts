import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

function generateTempPassword(): string {
  // No ambiguous chars (0/O, 1/I/l)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < 6; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function providerHasPro(provider: {
  subscription_plan: string | null;
  subscription_status: string | null;
  plan_override: string | null;
  access_valid_until: string | null;
}): boolean {
  const { subscription_plan, subscription_status, plan_override, access_valid_until } = provider;

  if (plan_override && plan_override !== "standard") {
    const validUntil = access_valid_until ? new Date(access_valid_until) : null;
    return validUntil ? validUntil > new Date() : true;
  }

  return (
    ["pro", "advanced", "duo", "team"].includes(subscription_plan || "") ||
    subscription_status === "lifetime"
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Ungültiger Token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is provider
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    if (callerRole?.role !== "provider") {
      return new Response(JSON.stringify({ error: "Nur Provider können Kunden einladen" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify provider has Pro
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_plan, subscription_status, plan_override, access_valid_until, full_name")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (!callerProfile || !providerHasPro(callerProfile)) {
      return new Response(JSON.stringify({ error: "Pro-Abo erforderlich" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName } = await req.json() as { email: string; fullName: string };

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "E-Mail und Name sind erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();

    // Create auth user with one-time password
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "client" },
    });

    if (createError) {
      const msg = createError.message.toLowerCase().includes("already")
        ? "Diese E-Mail-Adresse ist bereits registriert."
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUserData.user!.id;

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      full_name: fullName,
      email,
      created_by_provider_id: callerUser.id,
      force_password_reset: true,
      onboarding_completed: false,
      has_logged_in: false,
      invited_at: new Date().toISOString(),
    } as any);

    // Assign client role (triggers auto_create_access_grant_for_client via created_by_provider_id)
    await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: "client" });

    // Create contact entry for provider's address book
    await supabaseAdmin.from("contacts").insert({
      provider_id: callerUser.id,
      full_name: fullName,
      email,
      category: "client",
      profile_id: newUserId,
    });

    // Fetch provider/business info for email
    const { data: businessSettings } = await supabaseAdmin
      .from("business_settings")
      .select("business_name, phone, email")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    const providerName = businessSettings?.business_name || callerProfile.full_name || "Dein Hufbearbeiter";
    const providerEmail = businessSettings?.email || callerUser.email || "";
    const loginUrl = `${req.headers.get("origin") || "https://app.hufiapp.de"}/auth`;

    const safeFullName = escapeHtml(fullName);
    const safeProviderName = escapeHtml(providerName);
    const safeProviderEmail = escapeHtml(providerEmail);

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #F47B20 0%, #e06b10 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #fff; padding: 30px; }
    .password-box {
      background: #f8f4ff; border: 2px dashed #F47B20; border-radius: 12px;
      padding: 24px; text-align: center; margin: 24px 0;
    }
    .password-label { font-size: 13px; color: #666; margin-bottom: 8px; }
    .password-value { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #F47B20; font-family: 'Courier New', monospace; }
    .cta-btn {
      display: inline-block; background: #F47B20; color: white !important;
      padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;
    }
    .hint { background: #fff8f0; border-left: 4px solid #F47B20; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #666; margin: 16px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 13px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:48px;margin-bottom:8px">🐴</div>
      <h1 style="margin:0;font-size:24px">Du wurdest eingeladen!</h1>
    </div>
    <div class="content">
      <p>Hallo ${safeFullName},</p>
      <p><strong>${safeProviderName}</strong> hat dich zur HufManager Kunden-App eingeladen.</p>
      <p>Du kannst dich damit anmelden:</p>

      <div class="password-box">
        <div class="password-label">Dein Einmalpasswort</div>
        <div class="password-value">${tempPassword}</div>
      </div>

      <div style="text-align:center">
        <a href="${loginUrl}" class="cta-btn">🔐 Jetzt einloggen</a>
      </div>

      <div class="hint">
        <strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>
        <strong>E-Mail:</strong> ${escapeHtml(email)}<br>
        <strong>Einmalpasswort:</strong> ${tempPassword}
      </div>

      <p style="font-size:14px;color:#666">
        Du wirst beim ersten Login aufgefordert, ein eigenes Passwort festzulegen.
      </p>

      <p>Mit freundlichen Grüßen,<br><strong>${safeProviderName}</strong></p>
    </div>
    <div class="footer">
      ${safeProviderEmail ? `✉️ ${safeProviderEmail}<br>` : ""}
      <p style="font-size:12px;margin-top:12px">Diese E-Mail wurde über HufManager gesendet.</p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: "HufManager <info@hufiapp.de>",
      to: [email],
      subject: `🐴 ${safeProviderName} lädt dich zur HufManager Kunden-App ein`,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({ success: true, tempPassword }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("invite-client-with-password error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
