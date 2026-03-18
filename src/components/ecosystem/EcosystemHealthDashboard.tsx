import { useEcosystemStats } from "@/hooks/useEcosystemStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  retrying: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-600",
  info: "bg-blue-500/10 text-blue-600",
};

export function EcosystemHealthDashboard() {
  const { data, isLoading, error } = useEcosystemStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <AlertTriangle className="h-5 w-5" />
          <p>Sync-Statistiken konnten nicht geladen werden.</p>
        </CardContent>
      </Card>
    );
  }

  const { overview, by_app, recent_logs, unresolved_errors } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Gesamt-Syncs"
          value={overview.total_syncs}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          subtitle="Letzte 30 Tage"
        />
        <KpiCard
          title="Erfolgsrate"
          value={`${overview.success_rate}%`}
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          subtitle={`${overview.success_syncs} erfolgreich`}
          highlight={overview.success_rate >= 99}
        />
        <KpiCard
          title="Fehlgeschlagen"
          value={overview.failed_syncs}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          subtitle={`${unresolved_errors.length} ungelöst`}
          alert={overview.failed_syncs > 0}
        />
        <KpiCard
          title="Ø Dauer"
          value={`${overview.avg_duration_ms}ms`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          subtitle="Durchschnitt"
        />
      </div>

      {/* Per-App Stats */}
      {Object.keys(by_app).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sync-Status pro App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Object.entries(by_app).map(([appKey, stats]) => (
                <div key={appKey} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium capitalize">{appKey}</p>
                    <p className="text-xs text-muted-foreground">
                      Letzter Sync: {stats.lastSync
                        ? new Date(stats.lastSync).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "–"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-600">{stats.success}✓</span>
                    {stats.failed > 0 && <span className="text-destructive">{stats.failed}✗</span>}
                    <span className="text-muted-foreground">/ {stats.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unresolved Errors */}
      {unresolved_errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Offene Fehler ({unresolved_errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unresolved_errors.slice(0, 5).map((err) => (
              <div key={err.id} className={`rounded-lg p-3 ${severityColors[err.severity] || severityColors.warning}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{err.error_message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {err.app_key} · {err.error_code || "unknown"} · {new Date(err.created_at).toLocaleString("de-DE")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{err.severity}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Sync Log */}
      {recent_logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Sync-Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recent_logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${statusColors[log.status] || ""}`}>
                      {log.status}
                    </Badge>
                    <span className="capitalize">{log.app_key}</span>
                    <span className="text-muted-foreground">→ {log.entity_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {log.duration_ms != null && <span>{log.duration_ms}ms</span>}
                    <span>{new Date(log.created_at).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon, subtitle, highlight, alert }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/30" : highlight ? "border-emerald-500/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${alert ? "text-destructive" : highlight ? "text-emerald-600" : ""}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
