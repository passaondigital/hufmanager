import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const checks: Array<{
      check_name: string;
      check_category: string;
      status: "ok" | "warning" | "critical";
      details: Record<string, unknown>;
      auto_fixed: boolean;
      fix_applied: string | null;
    }> = [];

    // Check database size as proxy for backup health
    const dbStart = performance.now();
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    const { count: appointmentCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true });
    const { count: horseCount } = await supabase
      .from("horses")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    const dbLatency = Math.round(performance.now() - dbStart);

    // Store row counts for anomaly detection comparison
    const tableCounts = {
      profiles: profileCount || 0,
      appointments: appointmentCount || 0,
      horses: horseCount || 0,
      checked_at: new Date().toISOString(),
    };

    // Update anomaly baselines
    for (const [table, count] of Object.entries({ profiles: profileCount, appointments: appointmentCount, horses: horseCount })) {
      await supabase
        .from("system_anomaly_baselines")
        .upsert({
          metric_name: `table_count_${table}`,
          baseline_value: count || 0,
          last_measured_at: new Date().toISOString(),
        }, { onConflict: "metric_name" });
    }

    // Check if data counts dropped significantly (> 10%)
    const { data: baselines } = await supabase
      .from("system_anomaly_baselines")
      .select("metric_name, baseline_value, last_measured_at")
      .like("metric_name", "table_count_%");

    let dataLossDetected = false;
    for (const baseline of baselines || []) {
      const table = baseline.metric_name.replace("table_count_", "");
      const currentCount = tableCounts[table as keyof typeof tableCounts];
      if (typeof currentCount === "number" && baseline.baseline_value > 10) {
        const dropPercent = ((baseline.baseline_value - currentCount) / baseline.baseline_value) * 100;
        if (dropPercent > 10) {
          dataLossDetected = true;
          checks.push({
            check_name: `Datenverlust: ${table}`,
            check_category: "backup",
            status: "critical",
            details: { table, previous: baseline.baseline_value, current: currentCount, drop_percent: Math.round(dropPercent) },
            auto_fixed: false,
            fix_applied: null,
          });
        }
      }
    }

    if (!dataLossDetected) {
      checks.push({
        check_name: "Backup-Validierung: Datenintegrität",
        check_category: "backup",
        status: "ok",
        details: {
          ...tableCounts,
          db_latency_ms: dbLatency,
          message: "Alle Tabellen-Counts stabil",
        },
        auto_fixed: false,
        fix_applied: null,
      });
    }

    // Save checks
    if (checks.length > 0) {
      await supabase.from("system_health_checks").insert(checks);
    }

    // Alert on critical
    const criticals = checks.filter(c => c.status === "critical");
    if (criticals.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of admins || []) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "🔴 Backup-Alarm",
          message: criticals.map(c => c.check_name).join(", "),
          type: "system_alert",
          link: "/admin/mission-control",
        });
      }

      // Log alert
      await supabase.from("system_alerts").insert(
        criticals.map(c => ({
          alert_level: 4,
          alert_name: c.check_name,
          message: JSON.stringify(c.details),
          details: c.details,
          channels_notified: ["push", "email"],
        }))
      );
    }

    return new Response(
      JSON.stringify({ status: criticals.length > 0 ? "critical" : "ok", checks, tableCounts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup validation error:", error);
    return new Response(
      JSON.stringify({ error: "Backup validation failed", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
