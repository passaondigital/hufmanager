import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface HealthMonitorZoneProps {
  horseId: string;
  role: Role;
  onCompare?: () => void;
  onNewBefund?: () => void;
}

export function HealthMonitorZone({ horseId, role, onCompare, onNewBefund }: HealthMonitorZoneProps) {
  const { data } = useQuery({
    queryKey: ["horse-health-monitor-zone", horseId],
    queryFn: async () => {
      const [healthRes, timelineRes] = await Promise.all([
        supabase
          .from("horse_health_logs")
          .select("wellbeing, date, notes")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(1),
        supabase
          .from("horse_health_logs")
          .select("wellbeing, date, notes")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(3),
      ]);
      return {
        latest: healthRes.data?.[0] || null,
        timeline: timelineRes.data || [],
      };
    },
  });

  const score = (data?.latest?.wellbeing as number) || 0;
  const maxScore = 5;
  const pct = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 18;
  const dashoffset = circumference - (pct / 100) * circumference;

  const statusLabel = score >= 4 ? "Stabil" : score >= 3 ? "Okay" : score > 0 ? "Auffällig" : "Keine Daten";
  const statusVariant = score >= 4 ? "success" : score >= 3 ? "warning" : "danger";
  const ringColor = score >= 4 ? "stroke-green-500" : score >= 3 ? "stroke-amber-500" : "stroke-red-500";
  const canWrite = role === "provider" || role === "employee";

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.01] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Gesundheits-Monitor</span>
        </div>
        <div className="flex gap-2">
          {onCompare && (
            <button onClick={onCompare} className="text-xs text-primary hover:underline">
              Analyse vgl. →
            </button>
          )}
        </div>
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
            {data?.latest?.date
              ? `Letzte Analyse: ${format(new Date(data.latest.date), "dd.MM.yyyy", { locale: de })}`
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

      {/* Mini Timeline */}
      {data?.timeline && data.timeline.length > 0 && (
        <div className="flex gap-2 mt-4">
          {data.timeline.map((entry: any, i: number) => {
            const val = entry.wellbeing as number;
            const color = val >= 4 ? "text-green-600" : val >= 3 ? "text-amber-600" : "text-red-600";
            const label = val >= 4 ? "Gut" : val >= 3 ? "Okay" : "Befund";
            return (
              <div key={i} className="flex-1 rounded-lg bg-muted/60 border border-border p-2.5 hover:border-primary/40 transition-colors cursor-pointer">
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
      {(!data?.timeline || data.timeline.length === 0) && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Noch keine Gesundheitsdaten erfasst
        </p>
      )}

      {/* CTA for providers */}
      {canWrite && onNewBefund && (
        <button
          onClick={onNewBefund}
          className="mt-3 w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
        >
          + Neuen Befund anlegen
        </button>
      )}
    </div>
  );
}
