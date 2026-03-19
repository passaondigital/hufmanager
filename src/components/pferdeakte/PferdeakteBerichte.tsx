import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Footprints, Activity, Syringe, Shield, Loader2, FileDown, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PFERDEAKTE_HELP } from "./pferdeakteHelpTexts";
import { toast } from "sonner";
import type { PferdeakteUserRole } from "./types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
}

const REPORTS = [
  {
    id: "full",
    title: "Gesamtbericht",
    description: "Vollständige Pferdeakte als PDF-Export",
    icon: FileText,
    tags: ["Huf", "Vet", "Therapie", "Stammdaten"],
    edgeFunction: "generate-full-horse-report",
    body: {},
  },
  {
    id: "huf",
    title: "Huf-Verlaufsbericht",
    description: "Alle Hufbearbeitungen mit Messwerten und Fotos",
    icon: Footprints,
    tags: ["Huf", "Fotos", "Messwerte"],
    edgeFunction: "generate-completion-report",
    body: {},
  },
  {
    id: "therapy",
    title: "Therapie-Übersicht",
    description: "Alle Partner-Behandlungsnotizen gruppiert nach Fachrichtung",
    icon: Activity,
    tags: ["Osteo", "Physio", "Chiro"],
    edgeFunction: "generate-partner-report",
    body: {},
  },
  {
    id: "vaccination",
    title: "Impfprotokoll",
    description: "Impfungen und Entwurmungen mit Fälligkeitsdaten",
    icon: Syringe,
    tags: ["Impfung", "Entwurmung"],
    edgeFunction: "generate-vaccination-report",
    body: {},
  },
  {
    id: "aku",
    title: "Verkaufsbericht / AKU-Mappe",
    description: "Vollständiger Gesundheitsbericht für Käufer inkl. aller Messwerte.",
    icon: Shield,
    tags: ["AKU", "Gesundheit", "Huf", "Vet"],
    edgeFunction: "generate-full-horse-report",
    body: { mode: "aku" },
    hint: "Die AKU-Mappe enthält den vollständigen Gesundheitsverlauf. Tresor-Dokumente (Röntgen, TÜV) sind separat im geschützten Tresor verfügbar.",
  },
];

export function PferdeakteBerichte({ horseId, userRole }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (report: typeof REPORTS[0]) => {
    setLoading(report.id);
    try {
      const { data, error } = await supabase.functions.invoke(report.edgeFunction, {
        body: { horse_id: horseId, ...report.body },
      });
      if (error) throw error;
      if (data?.pdf_url || data?.url) {
        window.open(data.pdf_url || data.url, "_blank");
        toast.success("Bericht erstellt");
      } else {
        toast.info(data?.message || "Bericht wird erstellt...");
      }
    } catch {
      toast.error("Fehler beim Erstellen des Berichts");
    } finally {
      setLoading(null);
    }
  };

  // Partners and employees can only see limited reports
  const visibleReports = (userRole === "partner" || userRole === "employee")
    ? REPORTS.filter(r => r.id !== "full" && r.id !== "aku")
    : REPORTS;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <InfoTooltip {...PFERDEAKTE_HELP.tabs.berichte} />
        <span className="text-xs text-muted-foreground">
          {userRole === "partner" || userRole === "employee"
            ? "Eingeschränkte Berichtsauswahl — Vollberichte nur für Besitzer und Hufbearbeiter."
            : "Wähle einen Bericht zum Exportieren."}
        </span>
      </div>
      {visibleReports.map((report) => {
        const Icon = report.icon;
        return (
          <Card key={report.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {report.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                  {report.hint && (
                    <div className="flex items-start gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      {report.hint}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(report)}
                  disabled={loading === report.id}
                  className="flex-shrink-0 gap-1"
                >
                  {loading === report.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
