import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Heart, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface HealthMonitorZoneProps {
  horseId: string;
  role: Role;
  onCompare?: () => void;
  onNewBefund?: () => void;
}

export function HealthMonitorZone({ horseId, role, onCompare, onNewBefund }: HealthMonitorZoneProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ wellbeing: 4, weight: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["horse-health-monitor-zone", horseId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("horse_health_logs")
        .select("id, wellbeing, weight, hoof_rating, date, notes, ate_normally, temperament")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(10);
      return logs || [];
    },
  });

  const latest = data?.[0];
  const score = (latest?.wellbeing as number) || 0;
  const maxScore = 5;
  const pct = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 18;
  const dashoffset = circumference - (pct / 100) * circumference;

  const statusLabel = score >= 4 ? "Stabil" : score >= 3 ? "Okay" : score > 0 ? "Auffällig" : "Keine Daten";
  const statusVariant = score >= 4 ? "success" : score >= 3 ? "warning" : "danger";
  const ringColor = score >= 4 ? "stroke-green-500" : score >= 3 ? "stroke-amber-500" : "stroke-red-500";
  const canWrite = role === "provider" || role === "employee" || role === "client";

  // Chart data (chronological)
  const chartData = data && data.length > 1
    ? [...data].reverse().map(log => ({
        date: format(new Date(log.date), "dd.MM"),
        score: log.wellbeing,
        weight: log.weight,
      }))
    : null;

  const handleSaveLog = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("horse_health_logs").insert({
        horse_id: horseId,
        owner_id: user.id,
        wellbeing: formData.wellbeing,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes || null,
        date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      toast.success("Eintrag gespeichert");
      setShowForm(false);
      setFormData({ wellbeing: 4, weight: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["horse-health-monitor-zone", horseId] });
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.01] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Gesundheits-Monitor</span>
        </div>
        {onCompare && (
          <button onClick={onCompare} className="text-xs text-primary hover:underline">
            Analyse vgl. →
          </button>
        )}
      </div>

      {/* Score + Info */}
      <div className="flex items-center gap-3">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="48" height="48" viewBox="0 0 44 44" role="progressbar" aria-valuenow={score} aria-valuemax={maxScore}>
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" className="stroke-primary/15" />
            <circle
              cx="22" cy="22" r="18" fill="none" strokeWidth="3"
              className={ringColor}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 22 22)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
            {score || "–"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Hufzustand gesamt</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {latest?.date
              ? `Letzte Analyse: ${format(new Date(latest.date), "dd.MM.yyyy", { locale: de })}`
              : "Noch keine Analyse"}
          </p>
        </div>

        {/* Status badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 border",
          statusVariant === "success" && "bg-green-500/10 text-green-600 border-green-500/20",
          statusVariant === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
          statusVariant === "danger" && "bg-red-500/10 text-red-600 border-red-500/20",
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
      </div>

      {/* KPI Row */}
      {latest && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg bg-muted/60 border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Wohlbefinden</p>
            <p className="text-sm font-semibold text-foreground">{latest.wellbeing}/5</p>
          </div>
          <div className="rounded-lg bg-muted/60 border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Gewicht</p>
            <p className="text-sm font-semibold text-foreground">{latest.weight ? `${latest.weight} kg` : "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/60 border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Huf-Rating</p>
            <p className="text-sm font-semibold text-foreground">{latest.hoof_rating ? `${latest.hoof_rating}/5` : "—"}</p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {chartData && chartData.length > 1 && (
        <div className="mt-3 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={20} />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Wellbeing" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mini Timeline */}
      {data && data.length > 0 && !chartData && (
        <div className="flex gap-2 mt-4">
          {data.slice(0, 3).map((entry, i) => {
            const val = entry.wellbeing as number;
            const color = val >= 4 ? "text-green-600" : val >= 3 ? "text-amber-600" : "text-red-600";
            const label = val >= 4 ? "Gut" : val >= 3 ? "Okay" : "Befund";
            return (
              <div key={i} className="flex-1 rounded-lg bg-muted/60 border border-border p-2.5 hover:border-primary/40 transition-colors">
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(entry.date), "dd. MMM", { locale: de })}
                </p>
                <p className={cn("text-[11px] font-medium mt-1 flex items-center gap-1", color)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {(!data || data.length === 0) && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Noch keine Gesundheitsdaten erfasst
        </p>
      )}

      {/* Inline Form */}
      {showForm && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Neuer Eintrag</span>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-accent rounded">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Wohlbefinden (1–5)</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={() => setFormData(f => ({ ...f, wellbeing: v }))}
                  className={cn(
                    "flex-1 py-1.5 rounded text-xs font-medium border transition-colors",
                    formData.wellbeing === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Gewicht (kg, optional)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={e => setFormData(f => ({ ...f, weight: e.target.value }))}
              className="mt-1 w-full bg-muted text-foreground text-xs rounded px-2 py-1.5 border border-border"
              placeholder="z.B. 520"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Notiz (optional)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full bg-muted text-foreground text-xs rounded px-2 py-1.5 border border-border resize-none"
              rows={2}
              placeholder="Beobachtungen..."
            />
          </div>
          <button
            onClick={handleSaveLog}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Eintrag speichern"}
          </button>
        </div>
      )}

      {/* CTA */}
      {canWrite && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20 flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Neuen Eintrag anlegen
        </button>
      )}
    </div>
  );
}
