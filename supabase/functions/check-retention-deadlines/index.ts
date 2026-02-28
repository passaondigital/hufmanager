import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all retention rules
    const { data: rules, error: rulesError } = await supabase
      .from("data_retention_rules")
      .select("*");

    if (rulesError) throw rulesError;

    const warnings: string[] = [];
    const now = new Date();

    for (const rule of rules || []) {
      if (!rule.target_table || !rule.target_date_column) continue;

      try {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - rule.retention_days);

        let query;
        if (rule.target_date_column === "deleted_at") {
          query = supabase
            .from(rule.target_table)
            .select("id", { count: "exact", head: true })
            .not("deleted_at", "is", null)
            .lte("deleted_at", cutoffDate.toISOString());
        } else {
          query = supabase
            .from(rule.target_table)
            .select("id", { count: "exact", head: true })
            .lte(rule.target_date_column, cutoffDate.toISOString());
        }

        const { count, error } = await query;
        if (error) {
          console.log(`Skipping ${rule.target_table}: ${error.message}`);
          continue;
        }

        if (count && count > 0) {
          warnings.push(
            `${rule.category}: ${count} Datensätze haben die Aufbewahrungsfrist von ${rule.retention_days} Tagen überschritten (Tabelle: ${rule.target_table})`
          );
        }
      } catch (e) {
        console.log(`Error scanning ${rule.target_table}:`, e);
      }
    }

    // Send notifications to admins if there are warnings
    if (warnings.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of admins || []) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "Aufbewahrungsfristen-Warnung",
          message: `${warnings.length} Kategorie(n) mit überfälligen Daten gefunden. Bitte prüfen Sie das Retention-Dashboard in Mission Control.`,
          type: "retention_warning",
          link: "/admin/mission-control",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        warnings_count: warnings.length,
        warnings,
        checked_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retention check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
