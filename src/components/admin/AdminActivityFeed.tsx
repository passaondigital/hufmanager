import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, ScrollText, RefreshCw, Loader2, Bell, Activity,
} from "lucide-react";
import { fetchRecentActivity, fetchPendingReminders } from "@/services/accountNotesService";

export function AdminActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [acts, rems] = await Promise.all([
        fetchRecentActivity(20, filter === "all" ? undefined : filter),
        fetchPendingReminders(),
      ]);
      setActivities(acts);
      setReminders(rems);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const getIcon = (text: string) => {
    if (text.includes("Rechnung")) return <FileText className="w-3.5 h-3.5 text-primary" />;
    if (text.includes("Vertrag") || text.includes("Nachtrag")) return <ScrollText className="w-3.5 h-3.5 text-primary" />;
    if (text.includes("Plan")) return <RefreshCw className="w-3.5 h-3.5 text-primary" />;
    return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-destructive" />
            Fällig heute / diese Woche ({reminders.length})
          </h4>
          <div className="space-y-1">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs p-2 rounded-md bg-destructive/5 border border-destructive/10">
                <Bell className="w-3 h-3 mt-0.5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{r.note_text}</p>
                  <span className="text-muted-foreground text-[10px]">
                    Fällig: {new Date(r.reminder_at).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            Letzte Aktivitäten
          </h4>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="invoices">Rechnungen</SelectItem>
              <SelectItem value="contracts">Verträge</SelectItem>
              <SelectItem value="plans">Plan-Änderungen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Keine Aktivitäten vorhanden.</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs p-2 rounded-md bg-background border">
                {getIcon(a.note_text)}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{a.note_text}</p>
                  <span className="text-muted-foreground text-[10px]">{formatDate(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
