import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Factory, Stethoscope, Package, GraduationCap, Landmark, AlertTriangle } from "lucide-react";

const DEMO_CONFIG: Record<string, {
  title: string;
  icon: typeof Shield;
  color: string;
  widgets: { label: string; value: string }[];
  features: string[];
}> = {
  versicherung: {
    title: "Versicherungs-Portal",
    icon: Shield,
    color: "text-blue-400",
    widgets: [
      { label: "Aktive Policen", value: "2.847" },
      { label: "Offene Schäden", value: "23" },
      { label: "Präventions-Score", value: "78%" },
      { label: "Portfolio-Wert", value: "4,2M €" },
    ],
    features: ["Policen-Verwaltung", "Schadensmeldungen", "Präventions-Score Dashboard", "Portfolio-Analyse", "Automatische Verlängerungen"],
  },
  hersteller: {
    title: "Hersteller-Portal",
    icon: Factory,
    color: "text-orange-400",
    widgets: [
      { label: "Produkte", value: "48" },
      { label: "Empfehlungen", value: "1.234" },
      { label: "Aktive Händler", value: "89" },
      { label: "Umsatz/Monat", value: "34.500 €" },
    ],
    features: ["Produktkatalog", "Empfehlungs-Analytics", "Händlernetz-Verwaltung", "Bestell-Statistiken", "Material-Tracking"],
  },
  tierarzt: {
    title: "Tierarzt- & Klinik-Portal",
    icon: Stethoscope,
    color: "text-green-400",
    widgets: [
      { label: "Patienten", value: "456" },
      { label: "SOAP-Befunde", value: "1.890" },
      { label: "Impfungen fällig", value: "34" },
      { label: "Klinik-Score", value: "92%" },
    ],
    features: ["Patienten-Verwaltung", "SOAP-Befunde", "PMS-Sync", "Impf-Management", "Klinik-Finder"],
  },
  lieferant: {
    title: "Lieferanten-Portal",
    icon: Package,
    color: "text-purple-400",
    widgets: [
      { label: "Offene Bestellungen", value: "12" },
      { label: "Fulfillment-Rate", value: "96%" },
      { label: "Lagerbestand", value: "2.340" },
      { label: "Retouren", value: "3" },
    ],
    features: ["Bestell-Management", "Fulfillment-Dashboard", "Lager-Anbindung", "Retouren-Verwaltung", "Lieferzeiten-Tracking"],
  },
  ausbildung: {
    title: "Ausbildungs-Portal",
    icon: GraduationCap,
    color: "text-yellow-400",
    widgets: [
      { label: "Kurse", value: "4" },
      { label: "Schüler", value: "28" },
      { label: "Lernfälle", value: "12" },
      { label: "Prüfungen", value: "3" },
    ],
    features: ["Kurs-Verwaltung", "Lernfälle in echter Umgebung", "Prüfungs-System", "Fortschritts-Tracking", "Dozenten-Portal"],
  },
  verband: {
    title: "Verbands-Portal",
    icon: Landmark,
    color: "text-cyan-400",
    widgets: [
      { label: "Mitglieder", value: "1.245" },
      { label: "Zertifikate", value: "456" },
      { label: "Standards", value: "12" },
      { label: "Events", value: "8" },
    ],
    features: ["Mitglieder-Verwaltung", "Zertifizierung", "Standards & Leitfäden", "Event-Management", "Statistik-Dashboard"],
  },
};

export default function PortalDemo() {
  const location = useLocation();
  const type = location.pathname.split("/portal/")[1]?.split("/")[0];
  const navigate = useNavigate();
  const config = DEMO_CONFIG[type || ""];

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold">Portal nicht gefunden</h1>
          <Button onClick={() => navigate("/portal/galerie")}>Zur Portal-Galerie</Button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">DEMO-MODUS</span>
            <span className="text-muted-foreground">– Dies ist eine Vorschau des {config.title}s. Alle Daten sind fiktiv.</span>
          </div>
          <Button size="sm" onClick={() => navigate("/portal/bewerben")}>
            Jetzt bewerben
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${config.color}`} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
              <p className="text-sm text-muted-foreground">Demo-Organisation GmbH</p>
            </div>
            <Badge variant="outline" className="ml-auto">Demo</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {config.widgets.map((w) => (
            <Card key={w.label}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-foreground">{w.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{w.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portal-Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In der Vollversion sehen Sie hier Echtzeit-Aktivitäten Ihrer Organisation.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button size="lg" onClick={() => navigate("/portal/bewerben")}>
            Eigenes {config.title} beantragen
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <div>
            <Button variant="ghost" onClick={() => navigate("/portal/galerie")} className="text-muted-foreground">
              ← Alle Portale ansehen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
