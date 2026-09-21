import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ════════════════════════════════════════════════════════════════════════════
// Admin-Pfad fuer die Kundenanlage — auf den kanonischen Invite-Vertrag gehoben.
//
// ── Was sich geaendert hat ─────────────────────────────────────────────────
// Die frühere Fassung rief auth.admin.createUser() ohne vorherigen Pending
// Invite, wartete setTimeout(500) auf die Triggerkette und schrieb danach
// direkt in profiles und access_grants. Damit lief sie am Vertrag aus
// 20260917150000 … 20260920190000 vorbei, mit zwei Folgen:
//
//   1. Ohne Pending Invite greift der generische "erster Provider"-Fallback
//      in auto_assign_client_to_provider() — der neue Kunde bekam einen
//      aktiven Grant inkl. can_view_medical fuer einen FREMDEN Provider.
//   2. handle_new_user() setzt die Ghost-Merge-Schleife nur im Invite-Pfad
//      aus. Ohne Invite lief sie weiter und haengte access_grants fremder
//      Provider auf den neuen Auth-User um.
//
// Zusaetzlich wurden Schreibfehler nur geloggt und trotzdem success gemeldet.
//
// ── Jetzt ──────────────────────────────────────────────────────────────────
// admin JWT pruefen
//   → providerId validieren (existiert, nicht geloescht, Rolle provider)
//   → create_pending_client_invite_v1(providerId, …)
//   → auth.admin.createUser(…)
//   → bind_pending_client_invite_v1(…)
//   → create_invited_customer_with_contact(providerId, newUserId, …)
//   → Erfolg
// Bei jedem Fehler nach dem Pending Invite: invalidate_pending_client_invite_v1.
//
// Keine direkten Writes mehr auf profiles, user_roles, access_grants oder
// contacts. Kein setTimeout. Fail closed — kein Schritt wird geloggt und
// uebergangen.
//
// ── Bewusste Verhaltensaenderung ───────────────────────────────────────────
// create_invited_customer_with_contact setzt force_password_reset = true.
// Vom Admin angelegte Kunden muessen das vorgegebene Passwort beim ersten
// Login also aendern. Das ist im kanonischen Vertrag so vorgesehen und wurde
// hier nicht umgangen.
//
// Die Admin-Semantik bleibt erhalten: der Admin waehlt den Ziel-Provider und
// gibt das Initialpasswort vor. Der Unterschied zum Provider-Self-Service ist,
// dass providerId hier legitim aus dem Request kommt — deshalb wird sie
// explizit validiert, bevor sie benutzt wird.
// ════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  email: string;
  password: string;
  fullName: string;
  providerId: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    // ── Aufrufer verifizieren ────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("admin-create-client: caller is not an admin:", callerUser.id);
      return json({ error: "Forbidden - Admin access required" }, 403);
    }

    // ── Eingabe ──────────────────────────────────────────────────────────
    const { email, password, fullName, providerId }: CreateClientRequest = await req.json();

    if (!email || !password || !fullName || !providerId) {
      return json({ error: "email, password, fullName, and providerId are required" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!normalizedEmail || !trimmedName) {
      return json({ error: "email and fullName must not be empty" }, 400);
    }

    // ── providerId validieren, BEVOR sie benutzt wird ────────────────────
    // Sie kommt hier fachlich legitim aus dem Request (der Admin waehlt den
    // Ziel-Provider), darf aber nicht ungeprueft in den Invite-Vertrag.
    const { data: targetProvider, error: providerError } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .eq("id", providerId)
      .maybeSingle();

    if (providerError) {
      console.error("admin-create-client: provider lookup failed:", providerError.message);
      return json({ error: "Zielprovider konnte nicht geprüft werden" }, 500);
    }
    if (!targetProvider) {
      return json({ error: "Zielprovider existiert nicht" }, 400);
    }
    if (targetProvider.deleted_at) {
      return json({ error: "Zielprovider ist gelöscht" }, 400);
    }

    const { data: targetProviderRole, error: targetRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", providerId)
      .eq("role", "provider")
      .maybeSingle();

    if (targetRoleError) {
      console.error("admin-create-client: provider role lookup failed:", targetRoleError.message);
      return json({ error: "Zielprovider konnte nicht geprüft werden" }, 500);
    }
    if (!targetProviderRole) {
      return json({ error: "Zielaccount hat keine Provider-Rolle" }, 400);
    }

    console.log(
      `admin-create-client: admin ${callerUser.id} creating client for provider ${providerId}`,
    );

    // ── Schritt 1: Pending Invite VOR createUser ─────────────────────────
    // Der Invite unterdrueckt im Trigger den generischen Fallback und haelt
    // die Ghost-Merge-Schleife in handle_new_user() an. Er erteilt selbst
    // keinen Zugriff.
    const requestId = crypto.randomUUID();

    const { data: inviteData, error: inviteError } = await supabaseAdmin.rpc(
      "create_pending_client_invite_v1",
      {
        p_provider_id: providerId,
        p_email: normalizedEmail,
        p_request_id: requestId,
        p_ttl_minutes: 15,
      },
    );

    if (inviteError) {
      console.error("admin-create-client: pending invite failed:", inviteError.message);
      return json({
        error: "Einladung konnte nicht vorbereitet werden. Es wurde nichts angelegt.",
      }, 409);
    }

    const inviteId = (inviteData as { invite_id?: string } | null)?.invite_id;
    if (!inviteId) {
      console.error("admin-create-client: pending invite returned no invite_id");
      return json({ error: "Einladung konnte nicht vorbereitet werden." }, 500);
    }

    const invalidateInvite = async (reason: string, cleanupRequired = false) => {
      const { error } = await supabaseAdmin.rpc("invalidate_pending_client_invite_v1", {
        p_invite_id: inviteId,
        p_provider_id: providerId,
        p_reason: reason,
        p_cleanup_required: cleanupRequired,
      });
      if (error) {
        console.error("admin-create-client: invalidate failed:", error.message);
      }
    };

    // ── Schritt 2: Auth-User anlegen ─────────────────────────────────────
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName, role: "client" },
    });

    if (createError || !newUserData?.user) {
      await invalidateInvite("createUser failed");
      const alreadyExists = createError?.message?.toLowerCase().includes("already");
      console.error("admin-create-client: createUser failed:", createError?.message);
      return json(
        { error: alreadyExists ? "User with this email already exists" : (createError?.message ?? "User creation failed") },
        alreadyExists ? 409 : 400,
      );
    }

    const newUserId = newUserData.user.id;

    // ── Schritt 3: Invite an die erzeugte Identitaet binden ──────────────
    const { error: bindError } = await supabaseAdmin.rpc("bind_pending_client_invite_v1", {
      p_invite_id: inviteId,
      p_provider_id: providerId,
      p_user_id: newUserId,
    });

    if (bindError) {
      await invalidateInvite("bind failed", true);
      console.error("admin-create-client: bind failed:", bindError.message);
      return json({
        error: "Der Account wurde angelegt, konnte aber nicht dem Provider zugeordnet werden.",
      }, 409);
    }

    // ── Schritt 4: Kanonischer Vertrag — der einzige Grant-Pfad ──────────
    const { error: customerError } = await supabaseAdmin.rpc(
      "create_invited_customer_with_contact",
      {
        p_provider_id: providerId,
        p_user_id: newUserId,
        p_profile: { full_name: trimmedName, email: normalizedEmail },
        p_contact: { category: "client" },
      },
    );

    if (customerError) {
      await invalidateInvite("customer persistence failed", true);
      console.error("admin-create-client: canonical contract failed:", customerError.message);
      return json({
        error: "Der Kunde konnte nicht angelegt werden: " + customerError.message,
      }, 409);
    }

    // ── Antwort: Vertrag fuer Mission Control unveraendert ───────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("readable_id")
      .eq("id", newUserId)
      .maybeSingle();

    return json({
      success: true,
      user: {
        id: newUserId,
        email: normalizedEmail,
        full_name: trimmedName,
        readable_id: profile?.readable_id,
      },
      message: `Client ${trimmedName} created and linked to provider ${providerId}`,
    }, 200);

  } catch (error) {
    console.error("admin-create-client: unexpected error:", error);
    return json({ error: "Internal server error", details: String(error) }, 500);
  }
});
