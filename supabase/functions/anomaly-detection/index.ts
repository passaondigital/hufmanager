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

    const anomalies: Array<{
      check_name: string;
      check_category: string;
      status: "ok" | "warning" | "critical";
      details: Record<string, unknown>;
      auto_fixed: boolean;
      fix_applied: string | null;
    }> = [];

    // ── ANOMALY 1: Unusual login activity ──
    // Check performance_metrics for auth-related entries as proxy
    const { count: recentAuthEvents } = await supabase
      .from("performance_metrics")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const loginStatus = (recentAuthEvents || 0) > 500 ? "warning" : "ok";
    anomalies.push({
      check_name: "Login-Aktivität (letzte Stunde)",
      check_category: "security",
      status: loginStatus,
      details: {
        events_last_hour: recentAuthEvents || 0,
        threshold: 500,
        message: loginStatus === "warning" ? "Ungewöhnlich hohe Aktivität — möglicher Brute-Force" : "Normal",
      },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── ANOMALY 2: Unusual data access patterns ──
    const { data: heavyUsers } = await supabase
      .from("performance_metrics")
      .select("user_id")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .not("user_id", "is", null)
      .limit(1000);

    // Count per user
    const userCounts = new Map<string, number>();
    (heavyUsers || []).forEach((row) => {
      const uid = row.user_id as string;
      userCounts.set(uid, (userCounts.get(uid) || 0) + 1);
    });
    const suspiciousUsers = Array.from(userCounts.entries()).filter(([, count]) => count > 200);

    anomalies.push({
      check_name: "Datenzugriff-Anomalie",
      check_category: "security",
      status: suspiciousUsers.length > 0 ? "warning" : "ok",
      details: {
        suspicious_users: suspiciousUsers.length,
        top_users: suspiciousUsers.slice(0, 3).map(([uid, count]) => ({ user_id: uid.slice(0, 8) + "...", requests: count })),
        message: suspiciousUsers.length > 0 ? "Mögliches Scraping erkannt" : "Keine Auffälligkeiten",
      },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── ANOMALY 3: Tables without RLS ──
    // We can check this via pg_tables + pg_policies
    const { data: tablesWithoutRls } = await supabase.rpc("get_health_score_trend", { days_back: 0 }).maybeSingle();
    // Alternative: query pg_tables directly isn't available via SDK, so we track known tables
    // For now, rely on the linter results stored in system_health_checks

    // ── ANOMALY 4: Data loss detection ──
    const { data: baselines } = await supabase
      .from("system_anomaly_baselines")
      .select("metric_name, baseline_value, last_measured_at")
      .like("metric_name", "table_count_%");

    const tables = ["profiles", "appointments", "horses"];
    for (const table of tables) {
      const baseline = baselines?.find((b) => b.metric_name === `table_count_${table}`);
      if (!baseline) continue;

      const { count: currentCount } = await supabase
        .from(table as any)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      if (baseline.baseline_value > 10 && currentCount !== null) {
        const dropPercent = ((Number(baseline.baseline_value) - currentCount) / Number(baseline.baseline_value)) * 100;
        if (dropPercent > 10) {
          anomalies.push({
            check_name: `Datenverlust: ${table}`,
            check_category: "security",
            status: "critical",
            details: {
              table,
              previous: baseline.baseline_value,
              current: currentCount,
              drop_percent: Math.round(dropPercent),
            },
            auto_fixed: false,
            fix_applied: null,
          });
        }
      }

      // Update baseline
      await supabase
        .from("system_anomaly_baselines")
        .upsert({
          metric_name: `table_count_${table}`,
          baseline_value: currentCount || 0,
          last_measured_at: new Date().toISOString(),
        }, { onConflict: "metric_name" });
    }

    // If no data loss detected, add OK check
    if (!anomalies.some((a) => a.check_name.startsWith("Datenverlust"))) {
      anomalies.push({
        check_name: "Datenverlust-Prüfung",
        check_category: "security",
        status: "ok",
        details: { message: "Alle Tabellen-Counts stabil" },
        auto_fixed: false,
        fix_applied: null,
      });
    }

    // Save all anomaly checks
    await supabase.from("system_health_checks").insert(anomalies);

    // Alert on critical anomalies
    const criticals = anomalies.filter((a) => a.status === "critical");
    if (criticals.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of admins || []) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "🚨 Anomalie erkannt",
          message: criticals.map((c) => c.check_name).join(", "),
          type: "system_alert",
          link: "/admin/mission-control",
        });
      }

      await supabase.from("system_alerts").insert(
        criticals.map((c) => ({
          alert_level: c.check_name.includes("Datenverlust") ? 4 : 3,
          alert_name: c.check_name,
          message: JSON.stringify(c.details),
          details: c.details,
          channels_notified: ["push", "email"],
        }))
      );
    }

    const overallStatus = criticals.length > 0 ? "critical" : anomalies.some((a) => a.status === "warning") ? "warning" : "ok";

    return new Response(
      JSON.stringify({ status: overallStatus, anomalies, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return new Response(
      JSON.stringify({ error: "Anomaly detection failed", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
