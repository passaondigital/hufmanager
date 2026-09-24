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

// Einmalpasswort aus dem kryptografischen RNG (nicht Math.random).
// Rejection Sampling verhindert Modulo-Bias; 12 Zeichen aus 31 ≈ 59 Bit.
function generateTempPassword(length = 12): string {
  // No ambiguous chars (0/O, 1/I/l)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const limit = 256 - (256 % chars.length);
  let pass = "";
  const buf = new Uint8Array(1);
  while (pass.length < length) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) pass += chars[buf[0] % chars.length];
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

// Einladungsmail mit bis zu 3 Versuchen. Resend v2 wirft bei API-Fehlern
// nicht, sondern liefert { error } — beides zaehlt als Fehlschlag. Es wird
// weder Passwort noch Empfaengeradresse geloggt.
async function sendInviteMail(args: {
  to: string; fullName: string; providerName: string; providerEmail: string; loginUrl: string; tempPassword: string;
}): Promise<boolean> {
  const safeFullName = escapeHtml(args.fullName);
  const safeProviderName = escapeHtml(args.providerName);
  const safeProviderEmail = escapeHtml(args.providerEmail);
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
    .password-value { font-size: 26px; font-weight: 900; letter-spacing: 3px; word-break: break-all; color: #F47B20; font-family: 'Courier New', monospace; }
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
        <div class="password-value">${args.tempPassword}</div>
      </div>

      <div style="text-align:center">
        <a href="${args.loginUrl}" class="cta-btn">🔐 Jetzt einloggen</a>
      </div>

      <div class="hint">
        <strong>Login:</strong> <a href="${args.loginUrl}">${args.loginUrl}</a><br>
        <strong>E-Mail:</strong> ${escapeHtml(args.to)}<br>
        <strong>Einmalpasswort:</strong> ${args.tempPassword}
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: "HufManager <info@hufmanager.de>",
        to: [args.to],
        subject: `🐴 ${safeProviderName} lädt dich zur HufManager Kunden-App ein`,
        html: emailHtml,
      });
      if (!error) return true;
      console.error(`invite-client-with-password: Mailversand Versuch ${attempt}/3 fehlgeschlagen:`, error.message);
    } catch (mailErr) {
      console.error(`invite-client-with-password: Mailversand Versuch ${attempt}/3 fehlgeschlagen:`, mailErr instanceof Error ? mailErr.message : String(mailErr));
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 700));
  }
  return false;
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

    const body = await req.json() as { email?: string; fullName?: string; action?: string; userId?: string };

    // Absender-/Link-Daten, gemeinsam fuer Erst-Einladung und erneuten Versand.
    const { data: businessSettings } = await supabaseAdmin
      .from("business_settings")
      .select("business_name, phone, email")
      .eq("user_id", callerUser.id)
      .maybeSingle();
    const providerName = businessSettings?.business_name || callerProfile.full_name || "Dein Hufbearbeiter";
    const providerEmail = businessSettings?.email || callerUser.email || "";
    // Login-Link nur aus fester Allowlist — der Origin-Header ist vom Aufrufer
    // frei setzbar und darf keinen fremden Link in die Einladungsmail bringen.
    const ALLOWED_LOGIN_ORIGINS = ["https://app.hufmanager.de", "https://app.hufiapp.de"];
    const requestOrigin = req.headers.get("origin") ?? "";
    const loginOrigin = ALLOWED_LOGIN_ORIGINS.includes(requestOrigin) ? requestOrigin : "https://app.hufmanager.de";
    const loginUrl = `${loginOrigin}/auth`;

    // ── Erneuter Versand (kontrollierter Retry) ─────────────────────────────
    // Das Einmalpasswort verlaesst den Server NIE in einer API-Antwort. Kam die
    // Einladungsmail nicht an, setzt dieser Pfad ein NEUES Einmalpasswort und
    // stellt es ausschliesslich per Mail zu. Erlaubt nur fuer eigene Kunden,
    // die sich noch nie angemeldet haben.
    if (body.action === "resend") {
      const clientId = typeof body.userId === "string" ? body.userId : "";
      if (!/^[0-9a-f-]{36}$/i.test(clientId)) {
        return new Response(JSON.stringify({ error: "Ungültige Anfrage" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Gate NUR aus serverseitigen Fakten (Security-Review 2026-09-24):
      // profiles.email / has_logged_in / created_by_provider_id sind fuer
      // verbundene Provider per RLS aenderbar und daher KEIN Vertrauensanker.
      //  - Login-Identitaet und "nie angemeldet" aus auth.users
      //  - Eigentuemerschaft aus einem verbrauchten Pending Invite DIESES
      //    Providers fuer genau diesen User (Tabelle nur service_role)
      //  - aktiver eigener Grant + Rolle client
      const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(clientId);
      const authUser = authLookupError ? null : authLookup?.user ?? null;
      const { data: ownInvite } = await supabaseAdmin
        .from("hm_pending_client_invites").select("id")
        .eq("provider_id", callerUser.id).eq("consumed_user_id", clientId)
        .not("consumed_at", "is", null)
        .limit(1).maybeSingle();
      const { data: clientRole } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", clientId).eq("role", "client").maybeSingle();
      const { data: ownGrant } = await supabaseAdmin
        .from("access_grants").select("id")
        .eq("client_id", clientId).eq("provider_id", callerUser.id).eq("is_active", true)
        .limit(1).maybeSingle();
      const { data: clientProfile } = await supabaseAdmin
        .from("profiles").select("full_name, deleted_at").eq("id", clientId).maybeSingle();
      const resendAllowed = !!authUser && !!authUser.email
        && authUser.last_sign_in_at == null
        && !!ownInvite && !!clientRole && !!ownGrant
        && !!clientProfile && clientProfile.deleted_at == null;
      if (!resendAllowed) {
        // Einheitliche Antwort — verraet nicht, ob der Account existiert.
        return new Response(JSON.stringify({ error: "Erneuter Versand für diesen Kunden nicht möglich" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newPassword = generateTempPassword();
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(clientId, { password: newPassword });
      if (pwError) {
        console.error("invite-client-with-password: resend password reset failed:", pwError.message);
        return new Response(JSON.stringify({ error: "Erneuter Versand fehlgeschlagen, bitte später erneut versuchen" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resent = await sendInviteMail({
        to: authUser!.email!, fullName: clientProfile!.full_name || "", providerName, providerEmail, loginUrl, tempPassword: newPassword,
      });
      return new Response(JSON.stringify({ success: true, emailSent: resent, userId: clientId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = body.email ?? "";
    const fullName = body.fullName ?? "";

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "E-Mail und Name sind erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();

    // FINAL ACCEPTANCE P0 (Tenant), Variante 3 — Pending-Invite-Vertrag.
    //
    // Die frühere Fassung hat app_metadata.invited_by_provider_id gesetzt und
    // sich darauf verlassen, dass der Trigger auto_assign_client_to_provider
    // den Marker sieht. Gegen echtes GoTrue v2.196.0 gemessen: custom
    // app_metadata wird NICHT im selben Statement wie der auth.users-INSERT
    // geschrieben, sondern danach — die Triggerkette läuft vorher und der
    // eingeladene Kunde bekam weiterhin sofort einen aktiven Grant für den
    // ältesten Provider im System, inkl. medizinischer Daten.
    //
    // Deshalb wird der Vertrag jetzt SERVERSEITIG angelegt, BEVOR der
    // Auth-User existiert. Anker ist die normalisierte E-Mail: auth.users.email
    // ist eine Kernspalte und steht im selben INSERT, ist im Trigger also
    // unabhängig von jedem Metadata-Timing sichtbar.
    //
    // Der Invite erteilt selbst keinen Zugriff — er unterdrückt nur den
    // generischen Fallback. Den Grant legt ausschliesslich
    // create_invited_customer_with_contact an.
    const requestId = crypto.randomUUID();

    const { data: inviteData, error: inviteError } = await supabaseAdmin.rpc(
      "create_pending_client_invite_v1",
      { p_provider_id: callerUser.id, p_email: email, p_request_id: requestId, p_ttl_minutes: 15 },
    );

    if (inviteError) {
      console.error("invite-client-with-password: pending invite failed:", inviteError.message);
      return new Response(JSON.stringify({
        error: "Einladung konnte nicht vorbereitet werden. Es wurde nichts angelegt, bitte erneut versuchen.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inviteId = (inviteData as { invite_id?: string } | null)?.invite_id;
    if (!inviteId) {
      console.error("invite-client-with-password: pending invite returned no id");
      return new Response(JSON.stringify({
        error: "Einladung konnte nicht vorbereitet werden. Es wurde nichts angelegt, bitte erneut versuchen.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Kompensation: ab hier existiert ein offener Invite. Jeder Abbruch muss
    // ihn entwerten, sonst blockiert er die Adresse bis zum TTL-Ablauf.
    const invalidateInvite = async (reason: string, cleanupRequired = false) => {
      const { error } = await supabaseAdmin.rpc("invalidate_pending_client_invite_v1", {
        p_invite_id: inviteId,
        p_provider_id: callerUser.id,
        p_reason: reason,
        p_cleanup_required: cleanupRequired,
      });
      if (error) {
        console.error("invite-client-with-password: invite invalidation failed:", error.message);
      }
    };

    // Create auth user with one-time password. user_metadata trägt nur
    // Anzeigedaten für handle_new_user() — bewusst KEINE Sicherheitsmarker,
    // raw_user_meta_data ist bei einem normalen /signup vom Client frei
    // befüllbar und taugt nicht als Vertrauensanker.
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "client" },
    });

    if (createError) {
      await invalidateInvite("createUser failed");
      const msg = createError.message.toLowerCase().includes("already")
        ? "Diese E-Mail-Adresse ist bereits registriert."
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUserData.user!.id;

    // Invite an genau diese Identität binden. Ohne diesen Schritt könnte ein
    // offener Invite auf eine Adresse einen FREMDEN Selbst-Signup derselben
    // Adresse einsammeln — der kanonische Vertrag akzeptiert deshalb nur
    // gebundene Invites.
    const { error: bindError } = await supabaseAdmin.rpc("bind_pending_client_invite_v1", {
      p_invite_id: inviteId,
      p_provider_id: callerUser.id,
      p_user_id: newUserId,
    });

    if (bindError) {
      console.error("invite-client-with-password: invite binding failed:", bindError.message);
      await invalidateInvite("bind failed", true);
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (cleanupError) {
        console.error("invite-client-with-password: auth cleanup failed for", newUserId, cleanupError.message);
        return new Response(JSON.stringify({
          error: "Kunde konnte nicht angelegt werden und der angelegte Zugang konnte nicht automatisch entfernt werden. Bitte im Support melden.",
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        error: "Kunde konnte nicht angelegt werden. Es wurde nichts gespeichert, bitte erneut versuchen.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // P1-4 (Correction Pass 5): profiles + user_roles + contacts liefen bisher
    // als drei einzelne Writes, deren Fehler NICHT ausgewertet wurden. Weil
    // der auth-Trigger on_auth_user_created -> handle_new_user() profiles und
    // user_roles bereits anlegt, lief der profiles-INSERT hier immer in eine
    // unique_violation auf dem Primary Key — still verschluckt. Ergebnis:
    // created_by_provider_id, force_password_reset und invited_at wurden nie
    // gespeichert, und ohne created_by_provider_id greift auch
    // auto_create_access_grant_for_client nicht.
    //
    // Jetzt: ein einziger atomarer RPC-Aufruf (siehe supabase/migrations/
    // 20260917160000_add_create_invited_customer_with_contact_v1.sql). Er
    // ergänzt die vom Trigger angelegte Zeile, sichert die client-Rolle ab
    // und legt den Kontakt an — alles in einer Transaktion. Der Auth-Invite
    // (auth.admin.createUser oben) bleibt bewusst davon getrennt, weil er
    // keine DB-Transaktion ist.
    const { error: customerError } = await supabaseAdmin.rpc("create_invited_customer_with_contact", {
      p_provider_id: callerUser.id,
      p_user_id: newUserId,
      p_profile: { full_name: fullName, email },
      p_contact: { category: "client" },
    });

    if (customerError) {
      // Definierter Zustand statt halb angelegtem Kunden: die DB-Seite ist
      // durch die Transaktion vollständig zurückgerollt, also soll auch der
      // gerade erzeugte Auth-User wieder weg. Nur dieser eine, frisch
      // angelegte Nutzer wird entfernt.
      //
      // ABER: handle_new_user() führt beim auth.users-INSERT eine
      // Ghost-Merge-Schleife aus — passte die eingeladene E-Mail zu einem
      // bereits angelegten Ghost-Kunden, hängen dessen Pferde, Termine und
      // Kontakte jetzt schon an diesem neuen Profil, und das Ghost-Profil ist
      // soft-deleted. In dem Fall wäre das Löschen des Auth-Users
      // destruktiver als der Fehler selbst (public.profiles hat keinen FK auf
      // auth.users, die Zeile bliebe mitsamt den umgehängten Daten als
      // besitzerloses Profil zurück). Deshalb vorher prüfen und im Zweifel
      // NICHTS löschen. Tenant-sicher ist beides: ohne erfolgreiche RPC
      // existiert kein Access Grant (die RPC ist eine Transaktion, sie legt
      // Grant und Kunde gemeinsam an oder gar nicht), und der generische
      // Fallback war während createUser durch den offenen Pending Invite
      // unterdrückt.
      console.error("invite-client-with-password: customer persistence failed:", customerError.message);

      await invalidateInvite("customer persistence failed", true);

      const [horsesRes, appointmentsRes, contactsRes] = await Promise.all([
        supabaseAdmin.from("horses").select("id", { count: "exact", head: true }).eq("owner_id", newUserId),
        supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).eq("client_id", newUserId),
        supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }).eq("profile_id", newUserId),
      ]);
      const mergedRowCheckFailed = !!(horsesRes.error || appointmentsRes.error || contactsRes.error);
      const mergedRows = (horsesRes.count ?? 0) + (appointmentsRes.count ?? 0) + (contactsRes.count ?? 0);

      if (mergedRowCheckFailed || mergedRows > 0) {
        console.error(
          "invite-client-with-password: keeping auth user", newUserId,
          mergedRowCheckFailed ? "(merge check failed)" : `(${mergedRows} merged rows)`,
        );
        return new Response(JSON.stringify({
          error: "Kunde konnte nicht vollständig angelegt werden. Es wurden keine Daten gelöscht und kein Zugriff vergeben — bitte im Support melden.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (cleanupError) {
        console.error("invite-client-with-password: auth cleanup failed for", newUserId, cleanupError.message);
        return new Response(JSON.stringify({
          error: "Kunde konnte nicht angelegt werden und der angelegte Zugang konnte nicht automatisch entfernt werden. Bitte im Support melden.",
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        error: "Kunde konnte nicht angelegt werden. Es wurde nichts gespeichert, bitte erneut versuchen.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // P1-4: Ab hier ist der Kunde definitiv angelegt. Ein Fehler beim
    // Mailversand darf deshalb NICHT als "nichts passiert" (500) zurückgehen.
    // Das Einmalpasswort wird trotzdem NICHT an den Browser gegeben — der
    // Provider kann ueber action:"resend" einen neuen Versand ausloesen.
    const emailSent = await sendInviteMail({
      to: email, fullName, providerName, providerEmail, loginUrl, tempPassword,
    });

    return new Response(
      JSON.stringify({ success: true, emailSent, userId: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("invite-client-with-password error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
