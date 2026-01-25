import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Footprints, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoofDetails, HoofDetailEntry } from "./types";
import { differenceInDays, addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";

interface HoofStatusGridProps {
  hoofDetails?: HoofDetails | null;
  lastAppointmentDate?: string | null;
  shoeingInterval?: number | null;
  horseName?: string;
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
  good: "bg-green-500",
  moderate: "bg-amber-500",
  poor: "bg-red-500",
  cracked: "bg-red-600",
};

export function HoofStatusGrid({
  hoofDetails,
  lastAppointmentDate,
  shoeingInterval = 6,
  horseName,
}: HoofStatusGridProps) {
  // Calculate progress to next appointment
  const calculateProgress = () => {
    if (!lastAppointmentDate || !shoeingInterval) return null;

    const lastDate = new Date(lastAppointmentDate);
    const nextDue = addWeeks(lastDate, shoeingInterval);
    const today = new Date();
    
    const totalDays = differenceInDays(nextDue, lastDate);
    const daysPassed = differenceInDays(today, lastDate);
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    const daysUntilDue = differenceInDays(nextDue, today);

    return {
      progress,
      daysUntilDue,
      nextDue,
      isOverdue: daysUntilDue < 0,
    };
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Footprints className="h-4 w-4 text-primary" />
          Huf-Status
          {hasAnyIssues && (
            <Badge variant="destructive" className="text-xs ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Hinweise
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interval Progress Bar */}
        {progressData && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
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
          </div>
        )}

        {/* 4-Hoof Grid */}
        <div className="grid grid-cols-2 gap-3">
          {HOOF_POSITIONS.map((pos) => {
            const hoof = getHoofData(pos.key);
            const hasIssues = hoof?.issues && hoof.issues.length > 0;
            const conditionColor = hoof?.condition 
              ? CONDITION_COLORS[hoof.condition] || "bg-gray-400"
              : "bg-gray-300";

            return (
              <div
                key={pos.key}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  hasIssues 
                    ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" 
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", conditionColor)} />
                    <span className="font-medium text-sm">{pos.shortLabel}</span>
                  </div>
                  {hasIssues ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : hoof?.condition === "good" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground mb-1">{pos.label}</p>

                {hoof?.size && (
                  <p className="text-xs font-mono text-muted-foreground">
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
                            issueInfo.severity === "error" && "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/30",
                            issueInfo.severity === "warning" && "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30",
                            issueInfo.severity === "info" && "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                          )}
                        >
                          {issueInfo.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {!hoof && (
                  <p className="text-xs text-muted-foreground italic">
                    Keine Daten
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!hoofDetails && !lastAppointmentDate && (
          <div className="text-center py-4 text-muted-foreground">
            <Footprints className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Huf-Details dokumentiert</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
