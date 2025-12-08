import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ruler, CheckCircle2, AlertTriangle } from "lucide-react";

interface HoofMeasurementsCardProps {
  horseId: string;
}

interface HoofData {
  huflaenge?: string;
  hufbreite?: string;
  hornqualitaet?: string;
}

interface HoofAnalysis {
  id: string;
  created_at: string;
  hoof_data_vl: HoofData | null;
  hoof_data_vr: HoofData | null;
  hoof_data_hl: HoofData | null;
  hoof_data_hr: HoofData | null;
  recommendations: string[] | null;
  status: string | null;
}

const HOOF_LABELS: Record<string, string> = {
  vl: "Vorne Links",
  vr: "Vorne Rechts",
  hl: "Hinten Links",
  hr: "Hinten Rechts",
};

export function HoofMeasurementsCard({ horseId }: HoofMeasurementsCardProps) {
  const [analysis, setAnalysis] = useState<HoofAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      const { data } = await supabase
        .from("hoof_analyses")
        .select("id, created_at, hoof_data_vl, hoof_data_vr, hoof_data_hl, hoof_data_hr, recommendations, status")
        .eq("horse_id", horseId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setAnalysis(data as HoofAnalysis | null);
      setLoading(false);
    };

    fetchLatestAnalysis();
  }, [horseId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Ruler className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Noch keine Huf-Maße vorhanden
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dein Hufbearbeiter trägt die Maße nach der nächsten Analyse ein.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hooves = [
    { key: "vl", data: analysis.hoof_data_vl as HoofData | null },
    { key: "vr", data: analysis.hoof_data_vr as HoofData | null },
    { key: "hl", data: analysis.hoof_data_hl as HoofData | null },
    { key: "hr", data: analysis.hoof_data_hr as HoofData | null },
  ];

  const hasIssues = analysis.recommendations && analysis.recommendations.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            Huf-Maße & Status
          </CardTitle>
          {hasIssues ? (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Hinweise
            </Badge>
          ) : (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Alles okay
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hoof measurements grid */}
        <div className="grid grid-cols-2 gap-3">
          {hooves.map(({ key, data }) => (
            <div 
              key={key}
              className="bg-muted/50 rounded-lg p-3 text-center"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {HOOF_LABELS[key]}
              </p>
              {data?.huflaenge || data?.hufbreite ? (
                <p className="font-bold text-foreground">
                  {data.huflaenge || "—"} × {data.hufbreite || "—"} mm
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-600 mb-1">Empfehlungen:</p>
            <ul className="text-sm text-foreground space-y-1">
              {analysis.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          💡 Nutze diese Maße für die Bestellung von Hufschuhen
        </p>
      </CardContent>
    </Card>
  );
}
