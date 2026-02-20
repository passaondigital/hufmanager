import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ecosystem-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyHmacSignature(secret: string, bodyString: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyString));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(mac)));
  
  // Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // HMAC signature verification
    const webhookSecret = Deno.env.get("ECOSYSTEM_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("ECOSYSTEM_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signature = req.headers.get("x-ecosystem-signature");
    const authHeader = req.headers.get("authorization");
    const bodyString = await req.text();

    let authenticated = false;

    // Option 1: HMAC signature (for external webhook callers)
    if (signature) {
      authenticated = await verifyHmacSignature(webhookSecret, bodyString, signature);
      if (!authenticated) {
        console.error("Invalid webhook signature");
      }
    }

    // Option 2: Valid authenticated user (for internal app calls via supabase.functions.invoke)
    if (!authenticated && authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const authClient = createClient(supabaseUrl, anonKey!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (!claimsError && claimsData?.claims?.sub) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = JSON.parse(bodyString);
    const { source_app, event, ecosystem_user_id, partner_email, grant_id } = body;

    // Validate required fields
    if (!source_app || !event || !grant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: source_app, event, grant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle partner_accepted / partner_rejected events
    if (event === "partner_accepted" || event === "partner_rejected") {
      const newStatus = event === "partner_accepted" ? "active" : "rejected";
      const isActive = event === "partner_accepted";

      // Update the access_grant
      const { data: grant, error: updateError } = await supabase
        .from("access_grants")
        .update({
          status: newStatus,
          is_active: isActive,
          ...(event === "partner_accepted"
            ? { granted_at: new Date().toISOString() }
            : { revoked_at: new Date().toISOString() }),
        })
        .eq("id", grant_id)
        .select("provider_id, client_id, partner_name, partner_email")
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine who to notify (the person who sent the invitation)
      const notifyUserId = ecosystem_user_id || grant?.provider_id;
      const partnerName = grant?.partner_name || partner_email || "Ein Partner";

      if (notifyUserId) {
        const title = event === "partner_accepted"
          ? "Partner-Einladung angenommen"
          : "Partner-Einladung abgelehnt";

        const message = event === "partner_accepted"
          ? `${partnerName} hat deine Einladung angenommen und kann jetzt auf die freigegebenen Daten zugreifen.`
          : `${partnerName} hat deine Einladung abgelehnt.`;

        await supabase.from("notifications").insert({
          user_id: notifyUserId,
          title,
          message,
          type: "ecosystem",
          link: "/netzwerk",
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
