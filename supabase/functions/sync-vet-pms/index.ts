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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, provider_type, connection_id } = body;

    // --- ACTION: sync ---
    if (action === "sync") {
      // Get connection
      const { data: connection, error: connError } = await supabase
        .from("vet_sync_connections")
        .select("*")
        .eq("id", connection_id)
        .eq("user_id", user.id)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Connection not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create sync log entry
      const { data: syncLog } = await supabase
        .from("vet_sync_log")
        .insert({
          connection_id: connection.id,
          user_id: user.id,
          sync_type: "manual",
          status: "running",
        })
        .select("id")
        .single();

      let recordsSynced = 0;
      let recordsFailed = 0;

      try {
        switch (connection.provider_type) {
          case "ezyvet": {
            // TODO: Implement ezyVet OAuth2 sync
            // 1. Use connection.oauth_access_token to authenticate
            // 2. GET /v2/animal?active=1&species=Equine
            // 3. For each animal, GET /v2/consultation?animal_id=X
            // 4. Map ezyVet fields → HufManager tables:
            //    - animal.name → horses.name
            //    - animal.microchip → horses.chip_number
            //    - consult.complaint → partner_treatment_notes.description
            //    - consult.diagnosis → partner_treatment_notes.findings
            //    - healthstatus.weight → horse_health_logs (type='weight')
            //    - prescription.drug_name → horse_medications.medication_name

            // Placeholder: Mark as partial until API keys are configured
            recordsSynced = 0;
            break;
          }

          case "provet": {
            // TODO: Implement Provet Cloud sync
            // 1. Use token-based auth
            // 2. GET /patients?species=equine
            // 3. GET /consultations?patient_id=X
            // 4. Map Provet fields → HufManager tables

            recordsSynced = 0;
            break;
          }

          case "vetera": {
            // TODO: Implement Vetera.net Swagger API sync
            // Requires partner contract with GP.Software

            recordsSynced = 0;
            break;
          }

          default: {
            // CSV-only providers handled client-side
            recordsSynced = 0;
            break;
          }
        }

        // Update sync log
        await supabase
          .from("vet_sync_log")
          .update({
            status: recordsSynced > 0 ? "success" : "partial",
            records_synced: recordsSynced,
            records_failed: recordsFailed,
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog?.id);

        // Update connection
        await supabase
          .from("vet_sync_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            next_sync_at: new Date(Date.now() + (connection.sync_interval_minutes || 60) * 60000).toISOString(),
            error_message: null,
          })
          .eq("id", connection.id);

      } catch (syncError: any) {
        // Log error
        await supabase
          .from("vet_sync_log")
          .update({
            status: "error",
            error_message: syncError.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLog?.id);

        await supabase
          .from("vet_sync_connections")
          .update({ error_message: syncError.message })
          .eq("id", connection.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          records_synced: recordsSynced,
          records_failed: recordsFailed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACTION: check_oauth ---
    if (action === "check_oauth") {
      // TODO: Validate OAuth token is still valid, refresh if needed
      return new Response(
        JSON.stringify({ valid: false, message: "OAuth not yet implemented" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
