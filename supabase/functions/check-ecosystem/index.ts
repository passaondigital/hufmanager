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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const { action, app_key, webhook_data } = body;

    // --- Webhook endpoint for external apps ---
    if (action === "webhook") {
      const { user_id, status, external_id, app_key: webhookAppKey } = webhook_data || {};

      if (!user_id || !webhookAppKey) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or app_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update ecosystem link
      const { error } = await supabase
        .from("ecosystem_links")
        .update({
          status: status || "connected",
          external_id: external_id || null,
          connected_at: status === "connected" ? new Date().toISOString() : undefined,
        })
        .eq("user_id", user_id)
        .eq("app_key", webhookAppKey);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id,
        title: "Ecosystem Update",
        message: `${webhookAppKey} Status: ${status}`,
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
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!app_key) {
        return new Response(
          JSON.stringify({ error: "Missing app_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check local link status
      const { data: link } = await supabase
        .from("ecosystem_links")
        .select("*")
        .eq("user_id", userId)
        .eq("app_key", app_key)
        .maybeSingle();

      // Return current status
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
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
