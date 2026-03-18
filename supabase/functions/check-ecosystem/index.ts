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

  const startTime = Date.now();

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
        // Log error
        await logSyncError(supabase, user_id, webhookAppKey, "webhook_update_failed", error.message);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log successful sync
      await logSync(supabase, user_id, webhookAppKey, "webhook", "ecosystem_links", {
        status: "success",
        duration_ms: Date.now() - startTime,
      });

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

      // Log the status check
      await logSync(supabase, userId, app_key, "status_check", "ecosystem_links", {
        status: "success",
        duration_ms: Date.now() - startTime,
        response_payload: { connected: link?.status === "connected" },
      });

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

    // --- Sync health stats ---
    if (action === "get_sync_stats") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get sync stats for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [syncLogs, errors, settings] = await Promise.all([
        supabase
          .from("ecosystem_sync_log")
          .select("id, app_key, status, duration_ms, created_at, entity_type, sync_type")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("ecosystem_errors")
          .select("id, app_key, error_code, error_message, severity, resolved, created_at")
          .eq("user_id", userId)
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("ecosystem_settings")
          .select("*")
          .eq("user_id", userId),
      ]);

      // Compute aggregated stats
      const logs = syncLogs.data || [];
      const totalSyncs = logs.length;
      const successSyncs = logs.filter(l => l.status === "success").length;
      const failedSyncs = logs.filter(l => l.status === "failed").length;
      const avgDuration = totalSyncs > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / totalSyncs)
        : 0;

      // Group by app
      const byApp: Record<string, { total: number; success: number; failed: number; lastSync: string | null }> = {};
      for (const log of logs) {
        if (!byApp[log.app_key]) {
          byApp[log.app_key] = { total: 0, success: 0, failed: 0, lastSync: null };
        }
        byApp[log.app_key].total++;
        if (log.status === "success") byApp[log.app_key].success++;
        if (log.status === "failed") byApp[log.app_key].failed++;
        if (!byApp[log.app_key].lastSync) byApp[log.app_key].lastSync = log.created_at;
      }

      return new Response(
        JSON.stringify({
          overview: {
            total_syncs: totalSyncs,
            success_syncs: successSyncs,
            failed_syncs: failedSyncs,
            success_rate: totalSyncs > 0 ? Math.round((successSyncs / totalSyncs) * 100) : 100,
            avg_duration_ms: avgDuration,
          },
          by_app: byApp,
          recent_logs: logs.slice(0, 20),
          unresolved_errors: errors.data || [],
          settings: settings.data || [],
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

// Helper: Log a sync operation
async function logSync(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  appKey: string,
  syncType: string,
  entityType: string,
  details: { status: string; duration_ms: number; response_payload?: unknown; entity_id?: string }
) {
  try {
    await supabase.from("ecosystem_sync_log").insert({
      user_id: userId,
      app_key: appKey,
      sync_type: syncType,
      entity_type: entityType,
      entity_id: details.entity_id || null,
      status: details.status,
      duration_ms: details.duration_ms,
      response_payload: details.response_payload || null,
      completed_at: details.status === "success" ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.error("Failed to log sync:", e);
  }
}

// Helper: Log an ecosystem error
async function logSyncError(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  appKey: string,
  errorCode: string,
  errorMessage: string,
  context?: unknown
) {
  try {
    await supabase.from("ecosystem_errors").insert({
      user_id: userId,
      app_key: appKey,
      error_code: errorCode,
      error_message: errorMessage,
      error_context: context || null,
      severity: "error",
    });
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}
