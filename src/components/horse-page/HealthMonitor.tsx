import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface HealthMonitorProps {
  horseId: string;
}

export function HealthMonitor({ horseId }: HealthMonitorProps) {
  const { data } = useQuery({
    queryKey: ["horse-health-monitor", horseId],
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

  const statusLabel = score >= 4 ? "Stabil" : score >= 3 ? "Okay" : "Auffällig";
  const statusColor = score >= 4 ? "var(--hp-green)" : score >= 3 ? "var(--hp-yellow)" : "var(--hp-red)";

  return (
    <div className="px-4">
      <div className="hp-section-header">
        <span className="hp-section-title">Gesundheits-Monitor</span>
        <span className="hp-section-link">Analyse vergleichen →</span>
      </div>

      <div className="hp-health-monitor">
        {/* Top Row */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Score Ring */}
          <div className="relative flex-shrink-0">
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={maxScore}
            >
              <circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" className="score-ring-track" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                strokeWidth="3"
                className="score-ring-value"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                transform="rotate(-90 22 22)"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
              style={{ color: "var(--hp-amber)" }}
            >
              {score}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--hp-text)]">Hufzustand gesamt</p>
            <p className="text-[11px] text-[var(--hp-text3)] mt-0.5">
              {data?.latest?.date
                ? `Letzte Analyse: ${format(new Date(data.latest.date), "dd.MM.yyyy", { locale: de })}`
                : "Noch keine Analyse"}
            </p>
          </div>

          {/* Status Badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0"
            style={{ background: `${statusColor}15`, color: statusColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>
        </div>

        {/* Timeline */}
        {data?.timeline && data.timeline.length > 0 && (
          <div className="flex gap-2 mt-4 relative z-10">
            {data.timeline.map((entry: any, i: number) => {
              const val = entry.wellbeing as number;
              const entryColor = val >= 4 ? "var(--hp-green)" : val >= 3 ? "var(--hp-yellow)" : "var(--hp-red)";
              const entryLabel = val >= 4 ? "Gut" : val >= 3 ? "Okay" : "Befund";
              return (
                <div key={i} className="hp-timeline-card flex-1">
                  <p className="text-[10px] text-[var(--hp-text3)]">
                    {format(new Date(entry.date), "dd. MMM", { locale: de })}
                  </p>
                  <p className="text-[11px] font-medium mt-1 flex items-center gap-1" style={{ color: entryColor }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {entryLabel}
                  </p>
                  {entry.notes && (
                    <p className="text-[10px] text-[var(--hp-text3)] mt-1 truncate">{entry.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {(!data?.timeline || data.timeline.length === 0) && (
          <p className="text-[11px] text-[var(--hp-text3)] mt-3 text-center relative z-10">
            Noch keine Gesundheitsdaten erfasst
          </p>
        )}
      </div>
    </div>
  );
}
