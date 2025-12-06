import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Info,
  Lightbulb,
  Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { LTZPdfExport } from "@/components/hoof-analysis/LTZPdfExport";

interface ClientHealthStatusCardProps {
  horseId: string;
  horseName: string;
}

interface LTZHoofData {
  hornQuality?: string;
  toeAxis?: string;
  frogCondition?: string;
  hoofWallCondition?: string;
}

interface HoofAnalysis {
  id: string;
  created_at: string;
  stance_front: string | null;
  stance_rear: string | null;
  hoof_data_vl: LTZHoofData | null;
  hoof_data_vr: LTZHoofData | null;
  hoof_data_hl: LTZHoofData | null;
  hoof_data_hr: LTZHoofData | null;
  notes: string | null;
  recommendations: string[] | null;
}

// Health tips based on issues
const HEALTH_TIPS: Record<string, { title: string; tip: string }> = {
  poor_horn: {
    title: "Hornqualität",
    tip: "Regelmäßige Biotinzufuhr und ausgewogene Fütterung können die Hornqualität verbessern. Vermeide zu feuchte Untergründe.",
  },
  frog_thrush: {
    title: "Strahlfäule",
    tip: "Halte die Hufe sauber und trocken. Tägliches Auskratzen hilft. Dein Hufbearbeiter kann dir spezielle Pflegeprodukte empfehlen.",
  },
  hoof_wall: {
    title: "Hufwand",
    tip: "Ausgebrochene Hufwände können durch zu lange Bearbeitungsintervalle entstehen. Regelmäßige Termine sind wichtig.",
  },
  toe_axis: {
    title: "Zehenachse",
    tip: "Eine schiefe Zehenachse kann zu Fehlbelastungen führen. Dein Hufbearbeiter passt die Bearbeitung entsprechend an.",
  },
};

export function ClientHealthStatusCard({ horseId, horseName }: ClientHealthStatusCardProps) {
  const [showTips, setShowTips] = useState(false);

  // Fetch latest LTZ analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["latest-ltz-analysis", horseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hoof_analyses")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as HoofAnalysis | null;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Gesundheits-Status
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Noch keine Analyse vorhanden
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Bei deinem nächsten Termin erstellt dein Hufbearbeiter eine Bestandsaufnahme.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Analyze the data for issues
  const hoofData = [
    { key: "vl", label: "VL", data: analysis.hoof_data_vl as LTZHoofData | null },
    { key: "vr", label: "VR", data: analysis.hoof_data_vr as LTZHoofData | null },
    { key: "hl", label: "HL", data: analysis.hoof_data_hl as LTZHoofData | null },
    { key: "hr", label: "HR", data: analysis.hoof_data_hr as LTZHoofData | null },
  ];

  const issues: Array<{ type: string; hooves: string[]; severity: "warning" | "info" }> = [];

  hoofData.forEach(({ label, data }) => {
    if (!data) return;

    if (data.hornQuality === "poor" || data.hornQuality === "very_poor") {
      const existing = issues.find((i) => i.type === "poor_horn");
      if (existing) {
        existing.hooves.push(label);
      } else {
        issues.push({ type: "poor_horn", hooves: [label], severity: "warning" });
      }
    }

    if (data.frogCondition === "thrush" || data.frogCondition === "severe_thrush") {
      const existing = issues.find((i) => i.type === "frog_thrush");
      if (existing) {
        existing.hooves.push(label);
      } else {
        issues.push({ type: "frog_thrush", hooves: [label], severity: "warning" });
      }
    }

    if (data.hoofWallCondition === "cracked" || data.hoofWallCondition === "chipped") {
      const existing = issues.find((i) => i.type === "hoof_wall");
      if (existing) {
        existing.hooves.push(label);
      } else {
        issues.push({ type: "hoof_wall", hooves: [label], severity: "info" });
      }
    }

    if (data.toeAxis && data.toeAxis !== "straight") {
      const existing = issues.find((i) => i.type === "toe_axis");
      if (existing) {
        existing.hooves.push(label);
      } else {
        issues.push({ type: "toe_axis", hooves: [label], severity: "info" });
      }
    }
  });

  const hasWarnings = issues.some((i) => i.severity === "warning");
  const hasIssues = issues.length > 0;

  // Calculate overall status
  const overallStatus = hasWarnings
    ? "attention"
    : hasIssues
    ? "good"
    : "excellent";

  const statusConfig = {
    excellent: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Ausgezeichnet",
      message: "Keine Auffälligkeiten bei der letzten Analyse.",
    },
    good: {
      icon: Info,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Gut",
      message: "Kleinere Hinweise, aber insgesamt guter Zustand.",
    },
    attention: {
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      label: "Aufmerksamkeit",
      message: "Es gibt Punkte, die Beachtung benötigen.",
    },
  };

  const status = statusConfig[overallStatus];
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Gesundheits-Status
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {format(parseISO(analysis.created_at), "dd.MM.yyyy", { locale: de })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Banner */}
        <div className={cn("rounded-lg p-4", status.bgColor)}>
          <div className="flex items-start gap-3">
            <StatusIcon className={cn("h-6 w-6 mt-0.5", status.color)} />
            <div className="flex-1">
              <p className={cn("font-semibold", status.color)}>{status.label}</p>
              <p className="text-sm text-foreground/80 mt-0.5">{status.message}</p>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {issues.length > 0 && (
          <Collapsible open={showTips} onOpenChange={setShowTips}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  {issues.length} Hinweis{issues.length > 1 ? "e" : ""} & Tipps
                </span>
                <Badge variant="secondary">{showTips ? "Ausblenden" : "Anzeigen"}</Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {issues.map((issue, i) => {
                const tip = HEALTH_TIPS[issue.type];
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg p-3 border-l-4",
                      issue.severity === "warning"
                        ? "bg-amber-500/5 border-amber-500"
                        : "bg-blue-500/5 border-blue-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{tip?.title || issue.type}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {issue.hooves.join(", ")}
                      </Badge>
                    </div>
                    {tip && <p className="text-xs text-muted-foreground">{tip.tip}</p>}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommendations from Provider */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Empfehlungen deines Hufbearbeiters:
            </p>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Download Button */}
        <LTZPdfExport 
          analysis={analysis as any} 
          horseName={horseName}
          variant="button"
        />
      </CardContent>
    </Card>
  );
}
