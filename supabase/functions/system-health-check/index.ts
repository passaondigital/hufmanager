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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

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

    // ── CHECK 1: Orphaned auth users (no profile) ──
    const { data: orphanedUsers } = await supabase.rpc("execute_sql", { sql: "" }).maybeSingle();
    // Use direct query instead
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUserCount = authUsersData?.users?.length || 0;
    const orphanCount = Math.max(0, authUserCount - (profileCount || 0));

    if (orphanCount > 0) {
      // Auto-fix: Create missing profiles
      const profileIds = new Set<string>();
      const { data: profiles } = await supabase.from("profiles").select("id");
      profiles?.forEach((p) => profileIds.add(p.id));

      let fixed = 0;
      for (const user of authUsersData?.users || []) {
        if (!profileIds.has(user.id)) {
          const { error } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Unbekannt",
          });
          if (!error) fixed++;
        }
      }

      checks.push({
        check_name: "Verwaiste Auth-User (ohne Profil)",
        check_category: "database",
        status: fixed < orphanCount ? "warning" : "ok",
        details: { orphan_count: orphanCount, auto_fixed: fixed },
        auto_fixed: fixed > 0,
        fix_applied: fixed > 0 ? `${fixed} Profile automatisch erstellt` : null,
      });
    } else {
      checks.push({
        check_name: "Auth-User ↔ Profile Konsistenz",
        check_category: "database",
        status: "ok",
        details: { auth_users: authUserCount, profiles: profileCount },
        auto_fixed: false,
        fix_applied: null,
      });
    }

    // ── CHECK 2: Orphaned horses (owner doesn't exist) ──
    const { data: orphanedHorses } = await supabase
      .from("horses")
      .select("id, name, owner_id")
      .is("deleted_at", null);

    const { data: allProfiles } = await supabase.from("profiles").select("id").is("deleted_at", null);
    const validProfileIds = new Set(allProfiles?.map((p) => p.id) || []);
    const orphanHorses = orphanedHorses?.filter((h) => !validProfileIds.has(h.owner_id)) || [];

    checks.push({
      check_name: "Verwaiste Pferde (Besitzer fehlt)",
      check_category: "database",
      status: orphanHorses.length > 0 ? "warning" : "ok",
      details: {
        count: orphanHorses.length,
        horses: orphanHorses.slice(0, 5).map((h) => ({ id: h.id, name: h.name })),
      },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── CHECK 3: Invoices without valid provider ──
    const { data: invoicesCheck } = await supabase
      .from("invoices")
      .select("id, provider_id");

    const orphanInvoices = invoicesCheck?.filter((i) => !validProfileIds.has(i.provider_id)) || [];

    checks.push({
      check_name: "Rechnungen ohne Provider",
      check_category: "database",
      status: orphanInvoices.length > 0 ? "warning" : "ok",
      details: { count: orphanInvoices.length },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── CHECK 4: Expired invitation tokens cleanup ──
    const { data: expiredInvites, error: inviteErr } = await supabase
      .from("employee_profiles")
      .select("id")
      .not("invitation_token", "is", null)
      .eq("status", "pending")
      .lt("invitation_sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (expiredInvites && expiredInvites.length > 0) {
      const ids = expiredInvites.map((e) => e.id);
      const { error: deleteErr } = await supabase
        .from("employee_profiles")
        .update({ status: "expired", invitation_token: null })
        .in("id", ids);

      checks.push({
        check_name: "Abgelaufene Einladungs-Tokens",
        check_category: "hygiene",
        status: "ok",
        details: { expired_count: expiredInvites.length },
        auto_fixed: !deleteErr,
        fix_applied: !deleteErr ? `${expiredInvites.length} Token bereinigt` : null,
      });
    } else {
      checks.push({
        check_name: "Einladungs-Token Hygiene",
        check_category: "hygiene",
        status: "ok",
        details: { expired_count: 0 },
        auto_fixed: false,
        fix_applied: null,
      });
    }

    // ── CHECK 5: Old read notifications cleanup ──
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: oldNotifs } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", true)
      .lt("created_at", cutoff90);

    if ((oldNotifs || 0) > 100) {
      const { error: cleanErr } = await supabase
        .from("notifications")
        .delete()
        .eq("is_read", true)
        .lt("created_at", cutoff90);

      checks.push({
        check_name: "Alte Benachrichtigungen bereinigen",
        check_category: "hygiene",
        status: "ok",
        details: { deleted_count: oldNotifs },
        auto_fixed: !cleanErr,
        fix_applied: !cleanErr ? `${oldNotifs} Benachrichtigungen gelöscht` : null,
      });
    }

    // ── CHECK 6: DSGVO - Deleted profiles still in auth ──
    const { data: deletedProfiles } = await supabase
      .from("profiles")
      .select("id, deleted_at")
      .not("deleted_at", "is", null)
      .lt("deleted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const dsgvoRisk = deletedProfiles?.filter((p) => {
      return authUsersData?.users?.some((u) => u.id === p.id);
    }) || [];

    checks.push({
      check_name: "DSGVO: Gelöschte Profile in Auth",
      check_category: "compliance",
      status: dsgvoRisk.length > 0 ? "critical" : "ok",
      details: {
        count: dsgvoRisk.length,
        ids: dsgvoRisk.slice(0, 5).map((p) => p.id),
        message: dsgvoRisk.length > 0 ? "SOFORT-AKTION: Auth-User müssen gelöscht werden!" : "Kein DSGVO-Risiko",
      },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── CHECK 7: Database connectivity / latency ──
    const dbStart = performance.now();
    const { error: dbErr } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
    const dbLatency = Math.round(performance.now() - dbStart);

    checks.push({
      check_name: "Datenbank-Latenz",
      check_category: "performance",
      status: dbErr ? "critical" : dbLatency > 500 ? "warning" : "ok",
      details: { latency_ms: dbLatency, error: dbErr?.message },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── CHECK 8: Sync queue stale entries ──
    const { count: staleSync } = await supabase
      .from("employee_sync_queue")
      .select("id", { count: "exact", head: true })
      .is("synced_at", null)
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    checks.push({
      check_name: "Sync-Queue stale Einträge",
      check_category: "database",
      status: (staleSync || 0) > 0 ? "warning" : "ok",
      details: { stale_count: staleSync || 0 },
      auto_fixed: false,
      fix_applied: null,
    });

    // ── Save all checks to database ──
    const { error: insertErr } = await supabase.from("system_health_checks").insert(checks);

    // ── Notify admin on critical issues ──
    const criticalChecks = checks.filter((c) => c.status === "critical");
    if (criticalChecks.length > 0) {
      // Get admin user IDs
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of admins || []) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "⚠️ System Health Alert",
          message: `${criticalChecks.length} kritische Probleme gefunden: ${criticalChecks.map((c) => c.check_name).join(", ")}`,
          type: "system_alert",
          link: "/admin/mission-control",
        });
      }
    }

    const overallStatus = criticalChecks.length > 0
      ? "critical"
      : checks.some((c) => c.status === "warning")
        ? "warning"
        : "ok";

    return new Response(
      JSON.stringify({
        status: overallStatus,
        checks,
        timestamp: new Date().toISOString(),
        auto_fixes_applied: checks.filter((c) => c.auto_fixed).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: "Health check failed", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
