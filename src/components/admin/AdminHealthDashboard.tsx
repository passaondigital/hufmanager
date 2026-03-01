import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  Shield,
  Activity,
  Zap,
  FileWarning,
  Clock,
  Server,
  Trash2,
  Wrench,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  History,
  BarChart3,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HealthCheck {
  id: string;
  check_name: string;
  check_category: string;
  status: "ok" | "warning" | "critical";
  details: Record<string, unknown>;
  auto_fixed: boolean;
  fix_applied: string | null;
  created_at: string;
  check_duration_ms?: number;
  health_score?: number;
}

interface StatusMessage {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_active: boolean;
  show_banner: boolean;
  created_at: string;
}

interface SystemAlert {
  id: string;
  alert_level: number;
  alert_name: string;
  message: string;
  details: Record<string, unknown>;
  channels_notified: string[];
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface TrendData {
  check_date: string;
  avg_score: number;
  total_checks: number;
  critical_count: number;
  warning_count: number;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "ok": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "critical": return <XCircle className="h-5 w-5 text-red-500" />;
    default: return <Activity className="h-5 w-5 text-muted-foreground" />;
  }
};

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "database": return <Database className="h-4 w-4" />;
    case "compliance": return <Shield className="h-4 w-4" />;
    case "performance": return <Zap className="h-4 w-4" />;
    case "hygiene": return <Trash2 className="h-4 w-4" />;
    case "security": return <Shield className="h-4 w-4" />;
    case "backup": return <Server className="h-4 w-4" />;
    default: return <Server className="h-4 w-4" />;
  }
};

const alertLevelBadge = (level: number) => {
  switch (level) {
    case 1: return <Badge variant="secondary">L1 — Info</Badge>;
    case 2: return <Badge className="bg-amber-500 text-black">L2 — Warnung</Badge>;
    case 3: return <Badge variant="destructive">L3 — Kritisch</Badge>;
    case 4: return <Badge className="bg-red-900 text-white">L4 — Notfall</Badge>;
    default: return <Badge variant="secondary">Unbekannt</Badge>;
  }
};

// Determine fixable checks
const FIXABLE_CHECKS: Record<string, { fix_type: string; label: string }> = {
  "Verwaiste Auth-User (ohne Profil)": { fix_type: "orphaned_profiles", label: "Profile erstellen" },
  "Abgelaufene Einladungs-Tokens": { fix_type: "expired_invitations", label: "Tokens bereinigen" },
  "Alte Benachrichtigungen bereinigen": { fix_type: "old_notifications", label: "Bereinigen" },
  "Sync-Queue stale Einträge": { fix_type: "stale_sync_queue", label: "Queue leeren" },
};

export function AdminHealthDashboard() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState({ title: "", message: "", severity: "info", show_banner: false });

  const fetchLatestChecks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_health_checks")
      .select("id, check_name, check_category, status, details, auto_fixed, fix_applied, created_at, check_duration_ms, health_score")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setChecks(data as HealthCheck[]);
    setLoading(false);
  }, []);

  const fetchStatusMessages = useCallback(async () => {
    const { data } = await supabase
      .from("system_status_messages")
      .select("id, title, message, severity, is_active, show_banner, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setStatusMessages(data as StatusMessage[]);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from("system_alerts")
      .select("id, alert_level, alert_name, message, details, channels_notified, acknowledged_at, resolved_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setAlerts(data as SystemAlert[]);
  }, []);

  const fetchTrend = useCallback(async () => {
    const { data } = await supabase.rpc("get_health_score_trend", { days_back: 7 });
    if (data) setTrendData(data as TrendData[]);
  }, []);

  useEffect(() => {
    fetchLatestChecks();
    fetchStatusMessages();
    fetchAlerts();
    fetchTrend();
  }, [fetchLatestChecks, fetchStatusMessages, fetchAlerts, fetchTrend]);

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check");
      if (error) throw error;
      toast.success(`Health-Check abgeschlossen: ${data.status}`);
      await Promise.all([fetchLatestChecks(), fetchAlerts(), fetchTrend()]);
    } catch (err: any) {
      toast.error("Health-Check fehlgeschlagen: " + err.message);
    }
    setRunning(false);
  };

  const runOneClickFix = async (fixType: string, checkName: string) => {
    setFixingId(fixType);
    try {
      const { data, error } = await supabase.rpc("run_health_fix", { fix_type: fixType });
      if (error) throw error;
      const result = data as any;
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`✅ ${result.message}`);
        await fetchLatestChecks();
      }
    } catch (err: any) {
      toast.error("Fix fehlgeschlagen: " + err.message);
    }
    setFixingId(null);
  };

  const acknowledgeAlert = async (alertId: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from("system_alerts").update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    }).eq("id", alertId);
    fetchAlerts();
  };

  const resolveAlert = async (alertId: string) => {
    await supabase.from("system_alerts").update({
      resolved_at: new Date().toISOString(),
    }).eq("id", alertId);
    fetchAlerts();
  };

  const postStatusMessage = async () => {
    if (!newStatus.title || !newStatus.message) return;
    const { error } = await supabase.from("system_status_messages").insert({
      title: newStatus.title,
      message: newStatus.message,
      severity: newStatus.severity,
      show_banner: newStatus.show_banner,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success("Status-Meldung veröffentlicht");
      setNewStatus({ title: "", message: "", severity: "info", show_banner: false });
      fetchStatusMessages();
    }
  };

  const resolveStatus = async (id: string) => {
    await supabase.from("system_status_messages").update({
      is_active: false,
      severity: "resolved",
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    fetchStatusMessages();
  };

  // Group latest checks by name
  const latestByName = new Map<string, HealthCheck>();
  checks.forEach((c) => {
    if (!latestByName.has(c.check_name)) latestByName.set(c.check_name, c);
  });
  const latestChecks = Array.from(latestByName.values());

  const overallStatus = latestChecks.some((c) => c.status === "critical")
    ? "critical"
    : latestChecks.some((c) => c.status === "warning")
      ? "warning"
      : latestChecks.length > 0 ? "ok" : "unknown";

  const autoFixes = latestChecks.filter((c) => c.auto_fixed);
  const unresolvedAlerts = alerts.filter((a) => !a.resolved_at);

  // Health score from trend
  const todayScore = trendData.length > 0 ? trendData[0].avg_score : null;
  const yesterdayScore = trendData.length > 1 ? trendData[1].avg_score : null;
  const scoreTrend = todayScore !== null && yesterdayScore !== null
    ? todayScore - yesterdayScore
    : null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health & Self-Healing</h2>
          <p className="text-muted-foreground">Automatische Überwachung, Alerting & Reparatur</p>
        </div>
        <Button onClick={runHealthCheck} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Prüfe…" : "Health-Check starten"}
        </Button>
      </div>

      {/* Overall Status + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`lg:col-span-2 border-2 ${
          overallStatus === "ok" ? "border-emerald-500/30 bg-emerald-500/5" :
          overallStatus === "critical" ? "border-red-500/30 bg-red-500/5" :
          overallStatus === "warning" ? "border-amber-500/30 bg-amber-500/5" :
          "border-muted"
        }`}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              overallStatus === "ok" ? "bg-emerald-500/20" :
              overallStatus === "critical" ? "bg-red-500/20" : "bg-amber-500/20"
            }`}>
              {overallStatus === "ok" ? <CheckCircle className="h-8 w-8 text-emerald-500" /> :
               overallStatus === "critical" ? <XCircle className="h-8 w-8 text-red-500" /> :
               <AlertTriangle className="h-8 w-8 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {overallStatus === "ok" ? "🟢 SYSTEM GESUND" :
                 overallStatus === "critical" ? "🔴 KRITISCH" :
                 overallStatus === "warning" ? "🟡 WARNUNG" :
                 "⚪ Kein Check"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {latestChecks.length} Checks · {autoFixes.length} Auto-Fixes · {unresolvedAlerts.length} offene Alerts
                {latestChecks.length > 0 && ` · Letzter: ${new Date(latestChecks[0].created_at).toLocaleString("de-DE")}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Health Score Card */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground mb-1">Gesundheitsscore</p>
            <div className="flex items-center gap-2">
              <span className={`text-4xl font-bold ${
                (todayScore || 0) >= 80 ? "text-emerald-500" :
                (todayScore || 0) >= 50 ? "text-amber-500" : "text-red-500"
              }`}>
                {todayScore !== null ? Math.round(todayScore) : "—"}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            {scoreTrend !== null && (
              <div className={`flex items-center gap-1 text-xs mt-2 ${
                scoreTrend > 0 ? "text-emerald-500" : scoreTrend < 0 ? "text-red-500" : "text-muted-foreground"
              }`}>
                {scoreTrend > 0 ? <TrendingUp className="h-3 w-3" /> : scoreTrend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {scoreTrend > 0 ? "+" : ""}{Math.round(scoreTrend)} vs. gestern
              </div>
            )}
            {scoreTrend !== null && scoreTrend < 0 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Score sinkt — was hat sich geändert?
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks" className="gap-1"><Activity className="h-4 w-4" /> Prüfungen</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1">
            <AlertTriangle className="h-4 w-4" /> Alerts
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{unresolvedAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-4 w-4" /> Verlauf</TabsTrigger>
          <TabsTrigger value="trend" className="gap-1"><BarChart3 className="h-4 w-4" /> Trend</TabsTrigger>
          <TabsTrigger value="status" className="gap-1"><Server className="h-4 w-4" /> Status</TabsTrigger>
          <TabsTrigger value="protocol" className="gap-1"><FileWarning className="h-4 w-4" /> Protokoll</TabsTrigger>
        </TabsList>

        {/* ── TAB: Prüfungen + One-Click Fixes ── */}
        <TabsContent value="checks" className="space-y-3">
          <h3 className="text-lg font-semibold">Letzte Prüfungen & One-Click Fixes</h3>
          {latestChecks.map((check) => {
            const fixable = FIXABLE_CHECKS[check.check_name];
            const canFix = fixable && check.status !== "ok";
            return (
              <Card key={check.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {statusIcon(check.status)}
                    {categoryIcon(check.check_category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{check.check_name}</p>
                      {check.auto_fixed && (
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600">
                          Auto-Fix ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {check.fix_applied || JSON.stringify(check.details).slice(0, 120)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        disabled={fixingId === fixable.fix_type}
                        onClick={() => runOneClickFix(fixable.fix_type, check.check_name)}
                      >
                        {fixingId === fixable.fix_type ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        {fixable.label}
                      </Button>
                    )}
                    {!canFix && check.status !== "ok" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => window.open("https://supabase.com/dashboard/project/vnschgjxkzzwzefqlrji/sql/new", "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Dashboard
                      </Button>
                    )}
                    <Badge variant={check.status === "ok" ? "default" : check.status === "critical" ? "destructive" : "secondary"}>
                      {check.status === "ok" ? "OK" : check.status === "critical" ? "Kritisch" : "Warnung"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {latestChecks.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Noch keine Health-Checks. Starte den ersten Check oben.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB: Alerts (gestaffelt) ── */}
        <TabsContent value="alerts" className="space-y-3">
          <h3 className="text-lg font-semibold">Gestaffelte Alerts</h3>
          {alerts.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Keine Alerts vorhanden.</CardContent></Card>
          )}
          {alerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.resolved_at ? "border-l-4" : "opacity-60"} ${
              alert.alert_level >= 4 ? "border-l-red-900" :
              alert.alert_level === 3 ? "border-l-red-500" :
              alert.alert_level === 2 ? "border-l-amber-500" : "border-l-blue-500"
            }`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {alertLevelBadge(alert.alert_level)}
                    <p className="font-medium text-sm">{alert.alert_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString("de-DE")} · Kanäle: {alert.channels_notified?.join(", ")}
                  </p>
                  {alert.acknowledged_at && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Bestätigt {new Date(alert.acknowledged_at).toLocaleString("de-DE")}</p>
                  )}
                </div>
                {!alert.resolved_at && (
                  <div className="flex gap-1">
                    {!alert.acknowledged_at && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>Bestätigen</Button>
                    )}
                    <Button size="sm" variant="default" onClick={() => resolveAlert(alert.id)}>Auflösen</Button>
                  </div>
                )}
                {alert.resolved_at && <Badge variant="outline" className="text-emerald-600">Gelöst</Badge>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── TAB: History (letzte 50 Checks chronologisch) ── */}
        <TabsContent value="history" className="space-y-3">
          <h3 className="text-lg font-semibold">Check-Verlauf (letzte 50)</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {checks.slice(0, 50).map((check) => (
              <div key={check.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{check.check_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {check.fix_applied || JSON.stringify(check.details).slice(0, 80)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(check.created_at).toLocaleString("de-DE")}
                  </p>
                  {check.check_duration_ms && (
                    <p className="text-xs text-muted-foreground">{check.check_duration_ms}ms</p>
                  )}
                </div>
                <Badge variant={check.status === "ok" ? "default" : check.status === "critical" ? "destructive" : "secondary"} className="text-xs">
                  {check.status}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB: Trend (7-Tage Score) ── */}
        <TabsContent value="trend" className="space-y-3">
          <h3 className="text-lg font-semibold">Gesundheits-Trend (letzte 7 Tage)</h3>
          {trendData.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Noch keine Trend-Daten.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {trendData.map((day) => (
                <Card key={day.check_date}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{new Date(day.check_date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-muted-foreground">
                        {day.total_checks} Checks · {day.critical_count} kritisch · {day.warning_count} Warnungen
                      </p>
                    </div>
                    {/* Score bar */}
                    <div className="w-48 flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            Number(day.avg_score) >= 80 ? "bg-emerald-500" :
                            Number(day.avg_score) >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, Number(day.avg_score))}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${
                        Number(day.avg_score) >= 80 ? "text-emerald-500" :
                        Number(day.avg_score) >= 50 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {Math.round(Number(day.avg_score))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Status Messages ── */}
        <TabsContent value="status" className="space-y-3">
          <h3 className="text-lg font-semibold">Status-Meldungen (öffentlich)</h3>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Neue Status-Meldung</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Titel"
                value={newStatus.title}
                onChange={(e) => setNewStatus((s) => ({ ...s, title: e.target.value }))}
              />
              <Textarea
                placeholder="Nachricht..."
                value={newStatus.message}
                onChange={(e) => setNewStatus((s) => ({ ...s, message: e.target.value }))}
                rows={2}
              />
              <div className="flex gap-3 items-center">
                <Select value={newStatus.severity} onValueChange={(v) => setNewStatus((s) => ({ ...s, severity: v }))}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warnung</SelectItem>
                    <SelectItem value="critical">🔴 Kritisch</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newStatus.show_banner}
                    onChange={(e) => setNewStatus((s) => ({ ...s, show_banner: e.target.checked }))}
                  />
                  Banner
                </label>
                <Button size="sm" onClick={postStatusMessage} disabled={!newStatus.title || !newStatus.message}>
                  Veröffentlichen
                </Button>
              </div>
            </CardContent>
          </Card>
          {statusMessages.map((msg) => (
            <Card key={msg.id} className={msg.is_active ? "border-amber-500/30" : "opacity-60"}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={msg.severity === "critical" ? "destructive" : "secondary"}>{msg.severity}</Badge>
                    <p className="font-medium text-sm">{msg.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{msg.message}</p>
                </div>
                {msg.is_active && (
                  <Button size="sm" variant="outline" onClick={() => resolveStatus(msg.id)}>Auflösen</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── TAB: Notfall-Protokoll ── */}
        <TabsContent value="protocol">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                Notfall-Protokoll & Eskalation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">🔴 Level 4 — System Down / Datenverlust</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Push + E-Mail + SMS an Pascal (Twilio vorbereitet)</li>
                  <li>Supabase Status prüfen: <a href="https://status.supabase.com" target="_blank" className="underline text-primary">status.supabase.com</a></li>
                  <li>Status-Banner für Nutzer aktivieren</li>
                  <li>Backup-Validierung sofort manuell starten</li>
                </ol>
              </div>
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">🔴 Level 3 — DSGVO / Unauth. Zugriff</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Push + E-Mail an Pascal</li>
                  <li>Health-Check Details prüfen (User-IDs)</li>
                  <li>Auth → Users → Betroffene User endgültig löschen</li>
                  <li>Vorfall dokumentieren (Art. 33 DSGVO: 72h Meldefrist)</li>
                </ol>
              </div>
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">🟡 Level 2 — DB-Latenz / Sync-Queue</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>In-App Notification an Admins</li>
                  <li>Performance-Metrics Dashboard prüfen</li>
                  <li>Sync-Queue manuell bereinigen (One-Click Fix oben)</li>
                </ol>
              </div>
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">ℹ️ Level 1 — Performance Info</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Nur im Dashboard sichtbar</li>
                  <li>Keine aktive Benachrichtigung</li>
                  <li>Trend beobachten</li>
                </ol>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="font-semibold">📱 SMS-Kanal (Twilio) — Vorbereitet</p>
                <p className="text-muted-foreground mt-1">
                  Struktur für SMS-Alerts (Level 4) ist angelegt. Um zu aktivieren:
                  Twilio Account-SID, Auth-Token und Telefonnummer als Supabase Secrets hinterlegen.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
