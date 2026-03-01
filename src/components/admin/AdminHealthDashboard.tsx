import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HealthCheck {
  id: string;
  check_name: string;
  check_category: string;
  status: "ok" | "warning" | "critical";
  details: Record<string, unknown>;
  auto_fixed: boolean;
  fix_applied: string | null;
  created_at: string;
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
    default: return <Server className="h-4 w-4" />;
  }
};

export function AdminHealthDashboard() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [newStatus, setNewStatus] = useState({ title: "", message: "", severity: "info", show_banner: false });

  useEffect(() => {
    fetchLatestChecks();
    fetchStatusMessages();
  }, []);

  const fetchLatestChecks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_health_checks")
      .select("id, check_name, check_category, status, details, auto_fixed, fix_applied, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setChecks(data as HealthCheck[]);
    setLoading(false);
  };

  const fetchStatusMessages = async () => {
    const { data } = await supabase
      .from("system_status_messages")
      .select("id, title, message, severity, is_active, show_banner, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setStatusMessages(data as StatusMessage[]);
  };

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check");
      if (error) throw error;
      toast.success(`Health-Check abgeschlossen: ${data.status}`);
      await fetchLatestChecks();
    } catch (err: any) {
      toast.error("Health-Check fehlgeschlagen: " + err.message);
    }
    setRunning(false);
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

  // Group latest checks by name (most recent per check_name)
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
          <p className="text-muted-foreground">Automatische Überwachung & Reparatur</p>
        </div>
        <Button onClick={runHealthCheck} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Prüfe…" : "Health-Check starten"}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${
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
              {overallStatus === "ok" ? "🟢 SYSTEM GESUND — Alle Systeme normal" :
               overallStatus === "critical" ? "🔴 KRITISCH — Sofortiger Handlungsbedarf" :
               overallStatus === "warning" ? "🟡 WARNUNG — Aufmerksamkeit nötig" :
               "⚪ Noch kein Check durchgeführt"}
            </h3>
            {latestChecks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {latestChecks.length} Checks · {autoFixes.length} Auto-Fixes · 
                Letzter Check: {new Date(latestChecks[0].created_at).toLocaleString("de-DE")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check Results */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Letzte Prüfungen</h3>
        {latestChecks.map((check) => (
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
                  {check.fix_applied || JSON.stringify(check.details).slice(0, 100)}
                </p>
              </div>
              <Badge variant={check.status === "ok" ? "default" : check.status === "critical" ? "destructive" : "secondary"}>
                {check.status === "ok" ? "OK" : check.status === "critical" ? "Kritisch" : "Warnung"}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {latestChecks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Health-Checks durchgeführt. Starte den ersten Check oben.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Messages */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Status-Meldungen (öffentlich)</h3>
        
        {/* Post new status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Neue Status-Meldung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Titel (z.B. 'Wartungsarbeiten')"
              value={newStatus.title}
              onChange={(e) => setNewStatus((s) => ({ ...s, title: e.target.value }))}
            />
            <Textarea
              placeholder="Nachricht für Nutzer..."
              value={newStatus.message}
              onChange={(e) => setNewStatus((s) => ({ ...s, message: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-3 items-center">
              <Select value={newStatus.severity} onValueChange={(v) => setNewStatus((s) => ({ ...s, severity: v }))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
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
                Als Banner anzeigen
              </label>
              <Button size="sm" onClick={postStatusMessage} disabled={!newStatus.title || !newStatus.message}>
                Veröffentlichen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active messages */}
        {statusMessages.map((msg) => (
          <Card key={msg.id} className={msg.is_active ? "border-amber-500/30" : "opacity-60"}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={msg.severity === "critical" ? "destructive" : "secondary"}>
                    {msg.severity}
                  </Badge>
                  <p className="font-medium text-sm">{msg.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{msg.message}</p>
              </div>
              {msg.is_active && (
                <Button size="sm" variant="outline" onClick={() => resolveStatus(msg.id)}>
                  Auflösen
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incident Response */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Notfall-Protokoll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="font-semibold">🔴 Datenbank nicht erreichbar</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Supabase Status prüfen: <a href="https://status.supabase.com" target="_blank" className="underline text-primary">status.supabase.com</a></li>
              <li>Supabase Support kontaktieren</li>
              <li>Status-Banner für Nutzer aktivieren (oben)</li>
              <li>Letzte Backup-Zeit prüfen im Dashboard</li>
            </ol>
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="font-semibold">🟡 Nutzer kann sich nicht einloggen</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Auth-Service Status in Supabase Dashboard prüfen</li>
              <li>Users → Nutzer suchen → Magic Link senden</li>
              <li>1. Hilfe Kunden Center: OTP generieren</li>
            </ol>
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="font-semibold">🟡 Rechnungen werden nicht zugestellt</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Edge Function Logs: <a href="https://supabase.com/dashboard/project/vnschgjxkzzwzefqlrji/functions/send-invoice-email/logs" target="_blank" className="underline text-primary">send-invoice-email</a></li>
              <li>E-Mail-Secrets prüfen (Resend API Key)</li>
              <li>Manuell neu senden via Rechnungsübersicht</li>
            </ol>
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="font-semibold">🔴 DSGVO: Gelöschte Daten noch vorhanden</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Health-Check Details prüfen (User-IDs)</li>
              <li>Auth → Users → Betroffene User endgültig löschen</li>
              <li>Supabase SQL: Verwaiste Daten bereinigen</li>
              <li>Vorfall dokumentieren</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
