import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Camera, FileText, ArrowUpDown, ImageIcon, Mic, Footprints } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { HoofPhotoComparison } from "./HoofPhotoComparison";
import { HufiAIVoiceRecorder } from "./HufiAIVoiceRecorder";
import type { HoofFindingResult } from "./HufiAIVoiceRecorder";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PFERDEAKTE_HELP } from "./pferdeakteHelpTexts";
import type { PferdeakteUserRole } from "./types";
import { DemoFeatureHighlight } from "@/components/demo/DemoFeatureHighlight";
import { toast } from "sonner";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

export function PferdeakteHuf({ horseId, userRole }: Props) {
  const [showComparison, setShowComparison] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleFindingGenerated = async (finding: HoofFindingResult) => {
    if (!user) {
      toast.error("Nicht angemeldet — Befund kann nicht gespeichert werden.");
      return;
    }

    try {
      // Hoof-Entry für Verlaufshistorie
      const { error: entryError } = await supabase
        .from("hoof_entries")
        .insert({
          horse_id: horseId,
          type: "voice_befund",
          description: [finding.befund, finding.massnahme, finding.empfehlung]
            .filter(Boolean)
            .join(" | "),
          created_by: user.id,
          entry_date: new Date().toISOString().split("T")[0],
        });

      if (entryError) throw entryError;

      // Strukturierter Hoof-Analysis-Record mit Messwerten
      const { error: analysisError } = await supabase
        .from("hoof_analyses")
        .insert({
          horse_id: horseId,
          provider_id: user.id,
          notes: [finding.befund, finding.massnahme].filter(Boolean).join("\n"),
          recommendations: finding.empfehlung ? [finding.empfehlung] : [],
          hoof_data_vl: finding.huf_werte ?? null,
          status: finding.dringend_tierarzt ? "dringend_tierarzt"
            : finding.dringend_osteo ? "dringend_osteo"
            : "dokumentiert",
        });

      if (analysisError) throw analysisError;

      await queryClient.invalidateQueries({ queryKey: ["pferdeakte-hoof-analyses", horseId] });
      toast.success("Befund gespeichert");
    } catch (err) {
      console.error("Befund speichern fehlgeschlagen:", err);
      toast.error("Befund konnte nicht gespeichert werden.");
    }

    setShowVoiceRecorder(false);
  };
  // Fetch hoof analyses
  const { data: analyses, isLoading: loadingAnalyses } = useQuery({
    queryKey: ["pferdeakte-hoof-analyses", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoof_analyses")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  // Fetch latest hoof photos
  const { data: hoofPhotos } = useQuery({
    queryKey: ["pferdeakte-hoof-photos", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoof_photos")
        .select("id, photo_url, hoof_position, taken_at, appointment_id")
        .eq("horse_id", horseId)
        .order("taken_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  // Fetch recent appointments for hoof history
  const { data: hoofHistory } = useQuery({
    queryKey: ["pferdeakte-hoof-history", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, service_type, notes, completion_notes, edid")
        .eq("horse_id", horseId)
        .order("date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  // Parse hoof values from analyses
  const chartData = analyses?.map((a: any) => {
    const parseHoof = (data: any) => {
      if (!data) return {};
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        toeLength: parsed.toe_length_mm,
        heelHeight: parsed.heel_height_mm,
        hoofAngle: parsed.hoof_angle_degrees,
      };
    };

    const vl = parseHoof(a.hoof_data_vl);
    const vr = parseHoof(a.hoof_data_vr);

    return {
      date: new Date(a.created_at).toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      toeVL: vl.toeLength,
      toeVR: vr.toeLength,
      angleVL: vl.hoofAngle,
      angleVR: vr.hoofAngle,
    };
  }) || [];

  const latestAnalysis = analyses?.[analyses.length - 1];
  const prevAnalysis = analyses?.[analyses.length - 2];

  const getValueSummary = (field: string) => {
    if (!latestAnalysis) return null;
    const parse = (a: any) => {
      const vl = typeof a?.hoof_data_vl === "string" ? JSON.parse(a.hoof_data_vl) : a?.hoof_data_vl;
      const vr = typeof a?.hoof_data_vr === "string" ? JSON.parse(a.hoof_data_vr) : a?.hoof_data_vr;
      const avg = (vl?.[field] != null && vr?.[field] != null) ? (vl[field] + vr[field]) / 2 : vl?.[field] || vr?.[field];
      return avg;
    };

    const current = parse(latestAnalysis);
    const prev = prevAnalysis ? parse(prevAnalysis) : null;
    const delta = prev != null && current != null ? current - prev : null;

    return { current, delta };
  };

  const toeLength = getValueSummary("toe_length_mm");
  const heelHeight = getValueSummary("heel_height_mm");
  const hoofAngle = getValueSummary("hoof_angle_degrees");

  if (loadingAnalyses) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DemoFeatureHighlight label="Strukturierte Hufwerte mit Verlauf" delay={500} />
      {/* Current Values Grid */}
      {latestAnalysis && (
        <div className="grid grid-cols-2 gap-3">
          <ValueCard label="Zehenlänge" value={toeLength?.current} unit="mm" delta={toeLength?.delta} />
          <ValueCard label="Trachtenhöhe" value={heelHeight?.current} unit="mm" delta={heelHeight?.delta} />
          <ValueCard label="Hufwinkel VL" value={hoofAngle?.current} unit="°" delta={hoofAngle?.delta} />
          <Card className="flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">
              Letzter Termin: {new Date(latestAnalysis.created_at).toLocaleDateString("de-DE")}
            </p>
          </Card>
        </div>
      )}

      {!latestAnalysis && (
        <Card>
          <CardContent className="p-6 text-center">
            <Footprints className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground mb-1">Noch keine Hufanalyse-Daten</p>
            <p className="text-xs text-muted-foreground">Nach der ersten Bearbeitung erscheinen hier die Werte und Verlaufskurven.</p>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {hoofPhotos && hoofPhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Fotos letzter Termin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {hoofPhotos.slice(0, 4).map((photo: any) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={photo.photo_url} alt={photo.hoof_position || "Huf"} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {chartData.length >= 2 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Zehenlänge über Zeit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="toeVL" stroke="hsl(var(--primary))" name="VL" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="toeVR" stroke="#3b82f6" name="VR" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hufwinkel über Zeit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[45, 60]} />
                  <Tooltip />
                  <ReferenceLine y={50} stroke="hsl(var(--muted))" strokeDasharray="3 3" label={{ value: "Min", fontSize: 10 }} />
                  <ReferenceLine y={55} stroke="hsl(var(--muted))" strokeDasharray="3 3" label={{ value: "Max", fontSize: 10 }} />
                  <Line type="monotone" dataKey="angleVL" stroke="hsl(var(--primary))" name="VL" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="angleVR" stroke="#3b82f6" name="VR" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowComparison(true)}>
          <ImageIcon className="h-4 w-4" />
          Fotos vergleichen
        </Button>
        {userRole === "provider" && (
          <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}>
            <Mic className="h-4 w-4" />
            Sprachnotiz
          </Button>
        )}
      </div>

      {/* Voice Recorder */}
      {showVoiceRecorder && userRole === "provider" && (
        <HufiAIVoiceRecorder
          horseId={horseId}
          appointmentId={null}
          onFindingGenerated={handleFindingGenerated}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Photo Comparison Modal */}
      <HoofPhotoComparison horseId={horseId} open={showComparison} onClose={() => setShowComparison(false)} />

      {/* Hoof History */}
      {hoofHistory && hoofHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Huf-Bearbeitungshistorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hoofHistory.map((appt: any) => (
              <div key={appt.id} className="flex items-start gap-3 py-2 border-b border-border last:border-b-0">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {appt.service_type || "Hufbearbeitung"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(appt.date).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  {(appt.completion_notes || appt.notes) && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {appt.completion_notes || appt.notes}
                    </p>
                  )}
                  {appt.edid && (
                    <span className="text-[10px] font-mono text-muted-foreground">{appt.edid}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValueCard({ label, value, unit, delta }: { label: string; value: number | null | undefined; unit: string; delta: number | null | undefined }) {
  if (value == null) return null;

  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta == null ? "text-muted-foreground" : Math.abs(delta) < 1 ? "text-green-500" : "text-amber-500";

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-xl font-bold text-foreground">{typeof value === "number" ? value.toFixed(1) : value}</span>
          <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>
        </div>
        {delta != null && (
          <div className={`flex items-center gap-0.5 mt-1 text-xs ${deltaColor}`}>
            <DeltaIcon className="h-3 w-3" />
            <span>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
