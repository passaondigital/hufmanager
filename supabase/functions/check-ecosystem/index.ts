import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, app_key, webhook_data } = body;

    // Validate action
    if (!action || typeof action !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Webhook endpoint for external apps ---
    if (action === "webhook") {
      const { user_id, status, external_id, app_key: webhookAppKey } = webhook_data || {};

      if (!user_id || !webhookAppKey || typeof user_id !== "string" || typeof webhookAppKey !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid user_id or app_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate status values
      const allowedStatuses = ["connected", "disconnected", "pending", "error"];
      const safeStatus = allowedStatuses.includes(status) ? status : "connected";

      const { error } = await supabase
        .from("ecosystem_links")
        .update({
          status: safeStatus,
          external_id: external_id || null,
          connected_at: safeStatus === "connected" ? new Date().toISOString() : undefined,
        })
        .eq("user_id", user_id)
        .eq("app_key", webhookAppKey);

      if (error) {
        console.error("Ecosystem webhook update error:", error.message);
        return new Response(
          JSON.stringify({ error: "Failed to update ecosystem link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("notifications").insert({
        user_id,
        title: "Ecosystem Update",
        message: `${webhookAppKey} Status: ${safeStatus}`,
        type: "ecosystem",
        link: "/ecosystem",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Status check (authenticated) ---
    if (action === "check_status") {
      // Enforce proper JWT validation
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);

      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claimsData.claims.sub as string;

      if (!app_key || typeof app_key !== "string" || app_key.length > 100) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid app_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: link } = await supabase
        .from("ecosystem_links")
        .select("status, external_id, data_sharing_enabled")
        .eq("user_id", userId)
        .eq("app_key", app_key)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          connected: link?.status === "connected",
          status: link?.status || "not_connected",
          external_id: link?.external_id,
          data_sharing_enabled: link?.data_sharing_enabled || false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-ecosystem error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
