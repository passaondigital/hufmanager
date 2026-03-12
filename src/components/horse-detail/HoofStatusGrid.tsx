import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Footprints, Calendar, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoofDetails, HoofDetailEntry } from "./types";
import { differenceInDays, addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface HoofStatusGridProps {
  hoofDetails?: HoofDetails | null;
  lastAppointmentDate?: string | null;
  shoeingInterval?: number | null;
  horseName?: string;
  horseId?: string;
  onQuickBook?: () => void;
}

const HOOF_POSITIONS = [
  { key: "vl", label: "Vorne Links", shortLabel: "VL" },
  { key: "vr", label: "Vorne Rechts", shortLabel: "VR" },
  { key: "hl", label: "Hinten Links", shortLabel: "HL" },
  { key: "hr", label: "Hinten Rechts", shortLabel: "HR" },
] as const;

const ISSUE_LABELS: Record<string, { label: string; severity: "warning" | "error" | "info" }> = {
  thrush: { label: "Strahlfäule", severity: "error" },
  white_line: { label: "White-Line", severity: "warning" },
  cracks: { label: "Risse", severity: "warning" },
  abscess: { label: "Abszess", severity: "error" },
  laminitis: { label: "Hufrehe", severity: "error" },
  seedy_toe: { label: "Hornfäule", severity: "warning" },
  bruise: { label: "Bluterguss", severity: "info" },
  flare: { label: "Ausbruch", severity: "info" },
};

const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-400",
  moderate: "bg-amber-400",
  poor: "bg-red-400",
  cracked: "bg-red-500",
};

export function HoofStatusGrid({
  hoofDetails,
  lastAppointmentDate,
  shoeingInterval = 6,
  horseName,
  horseId,
  onQuickBook,
}: HoofStatusGridProps) {
  const navigate = useNavigate();
  
  const calculateProgress = () => {
    if (!lastAppointmentDate || !shoeingInterval) return null;
    const lastDate = new Date(lastAppointmentDate);
    const nextDue = addWeeks(lastDate, shoeingInterval);
    const today = new Date();
    const totalDays = differenceInDays(nextDue, lastDate);
    const daysPassed = differenceInDays(today, lastDate);
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    const daysUntilDue = differenceInDays(nextDue, today);
    return { progress, daysUntilDue, nextDue, isOverdue: daysUntilDue < 0 };
  };

  const progressData = calculateProgress();
  const details = hoofDetails || {};

  const getHoofData = (key: string): HoofDetailEntry | undefined => {
    return details[key as keyof HoofDetails];
  };

  const hasAnyIssues = HOOF_POSITIONS.some(pos => {
    const hoof = getHoofData(pos.key);
    return hoof?.issues && hoof.issues.length > 0;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Huf-Status</h3>
          {hasAnyIssues && (
            <Badge variant="destructive" className="text-xs ml-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Hinweise
            </Badge>
          )}
        </div>
        {lastAppointmentDate && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(lastAppointmentDate), "dd.MM.yyyy", { locale: de })}
          </span>
        )}
      </div>

      {/* Interval Progress Bar */}
      {progressData && (
        <div className="p-3 rounded-xl bg-secondary/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Nächster Termin fällig</span>
            </div>
            <span className={cn(
              "font-medium",
              progressData.isOverdue ? "text-destructive" : "text-foreground"
            )}>
              {progressData.isOverdue 
                ? `${Math.abs(progressData.daysUntilDue)} Tage überfällig`
                : progressData.daysUntilDue === 0 
                  ? "Heute"
                  : `in ${progressData.daysUntilDue} Tagen`
              }
            </span>
          </div>
          <Progress 
            value={progressData.progress} 
            className={cn(
              "h-2",
              progressData.isOverdue && "[&>div]:bg-destructive"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Letzter Termin: {format(new Date(lastAppointmentDate!), "dd.MM.yyyy", { locale: de })}
            </span>
            <span>
              Intervall: {shoeingInterval} Wochen
            </span>
          </div>
          
          {progressData.isOverdue && (
            <Button
              size="sm"
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (onQuickBook) {
                  onQuickBook();
                } else if (horseId) {
                  navigate(`/kalender?horse=${horseId}&action=new`);
                }
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Schnelltermin buchen
            </Button>
          )}
        </div>
      )}

      {/* 4-Hoof Grid */}
      <div className="grid grid-cols-2 gap-3">
        {HOOF_POSITIONS.map((pos) => {
          const hoof = getHoofData(pos.key);
          const hasIssues = hoof?.issues && hoof.issues.length > 0;
          const conditionColor = hoof?.condition 
            ? CONDITION_COLORS[hoof.condition] || "bg-muted-foreground"
            : "bg-muted-foreground/40";

          return (
            <div
              key={pos.key}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer",
                "bg-secondary/30 hover:border-primary/30",
                hasIssues 
                  ? "border-amber-500/40" 
                  : "border-border"
              )}
            >
              {/* Label */}
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                {pos.shortLabel}
              </p>
              <p className="text-xs text-muted-foreground mb-2">{pos.label}</p>

              {/* Condition Dot */}
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", conditionColor)} />
                {hasIssues ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                ) : hoof?.condition === "good" ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    {hoof ? (hoof.condition || "leer") : "leer"}
                  </span>
                )}
              </div>

              {hoof?.size && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Größe: {hoof.size}mm
                </p>
              )}

              {/* Issue Tags */}
              {hasIssues && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {hoof!.issues!.map((issue: string) => {
                    const issueInfo = ISSUE_LABELS[issue] || { label: issue, severity: "info" };
                    return (
                      <Badge
                        key={issue}
                        variant="outline"
                        className={cn(
                          "text-xs py-0",
                          issueInfo.severity === "error" && "border-red-400 text-red-500 bg-red-500/10",
                          issueInfo.severity === "warning" && "border-amber-400 text-amber-500 bg-amber-500/10",
                          issueInfo.severity === "info" && "border-blue-400 text-blue-400 bg-blue-500/10"
                        )}
                      >
                        {issueInfo.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!hoofDetails && !lastAppointmentDate && (
        <div className="text-center py-6 text-muted-foreground">
          <Footprints className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Noch keine Huf-Details</p>
          <p className="text-xs mt-1">Huf-Details werden nach der ersten Behandlung dokumentiert.</p>
        </div>
      )}
    </div>
  );
}
