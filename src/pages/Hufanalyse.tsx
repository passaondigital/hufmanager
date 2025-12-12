import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ClipboardList, Eye, FileText } from "lucide-react";
import { LTZAnalysisWizard, LTZAnalysisHistory, LTZComparisonView } from "@/components/hoof-analysis";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const Hufanalyse = () => {
  const { user } = useAuth();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch horses the provider has access to
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing analyses
  const { data: analyses = [] } = useQuery({
    queryKey: ["hoof-analyses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("hoof_analyses")
        .select(`
          *,
          horses:horse_id(name, breed)
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  const handleStartAnalysis = () => {
    if (!selectedHorseId) return;
    setShowWizard(true);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hufanalyse</h1>
        <p className="text-muted-foreground mt-1">
          Professionelle Bearbeitungsbögen nach dem Leipziger Modell
        </p>
      </div>

      {/* Start New Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Neue Analyse starten
          </CardTitle>
          <CardDescription>
            Wählen Sie ein Pferd aus, um einen neuen Bearbeitungsbogen zu erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedHorseId || ""} onValueChange={setSelectedHorseId}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Pferd auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name} {horse.breed ? `(${horse.breed})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStartAnalysis} disabled={!selectedHorseId} className="gap-2">
              <Plus className="h-4 w-4" />
              Analyse starten
            </Button>
            {selectedHorseId && selectedHorse && (
              <Button variant="outline" onClick={() => setShowComparison(true)} className="gap-2">
                <Eye className="h-4 w-4" />
                Vergleich
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis History */}
      {selectedHorseId && selectedHorse && (
        <LTZAnalysisHistory horseId={selectedHorseId} horseName={selectedHorse.name} />
      )}

      {/* Recent Analyses Overview */}
      {analyses.length > 0 && !selectedHorseId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Letzte Analysen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyses.slice(0, 5).map((analysis: any) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedHorseId(analysis.horse_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{analysis.horses?.name || "Unbekannt"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(analysis.created_at), "dd.MM.yyyy", { locale: de })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={analysis.status === "completed" ? "default" : "secondary"}>
                    {analysis.status === "completed" ? "Abgeschlossen" : "Entwurf"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard Modal */}
      {selectedHorse && (
        <LTZAnalysisWizard
          isOpen={showWizard}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          onClose={handleWizardClose}
        />
      )}

      {/* Comparison View */}
      {selectedHorseId && selectedHorse && (
        <LTZComparisonView
          isOpen={showComparison}
          horseId={selectedHorseId}
          horseName={selectedHorse.name}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};

export default Hufanalyse;