import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Shield, Factory, Stethoscope, Package, GraduationCap, Landmark, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PORTALS = [
  {
    id: "versicherung",
    icon: Shield,
    title: "Versicherungs-Portal",
    features: ["Policen-Verwaltung", "Schadensfälle", "Präventions-Score", "Portfolio-Analyse"],
    examples: "Fischer, Uelzener, Allianz",
    path: "/portal/versicherung",
  },
  {
    id: "hersteller",
    icon: Factory,
    title: "Hersteller-Portal",
    features: ["Produkte", "Empfehlungen", "Nutzungs-Analytics", "Händlernetz"],
    examples: "Duplo, Mustad, Vettec, Effol",
    path: "/portal/hersteller",
  },
  {
    id: "tierarzt",
    icon: Stethoscope,
    title: "Tierarzt- & Klinik-Portal",
    features: ["Patienten", "SOAP-Befunde", "PMS-Sync", "Klinik-Finder"],
    examples: "Praxen, Kliniken, GPM",
    path: "/portal/tierarzt",
  },
  {
    id: "lieferant",
    icon: Package,
    title: "Lieferanten-Portal",
    features: ["Bestellungen", "Fulfillment", "Lager-Anbindung", "Retouren"],
    examples: "Reitsport-Shops, Großhändler",
    path: "/portal/lieferant",
  },
  {
    id: "ausbildung",
    icon: GraduationCap,
    title: "Ausbildungs-Portal",
    features: ["Kurse", "Lernfälle", "Prüfungen in echter Hufi-Umgebung"],
    examples: "DHG-Schulen, Hufakademien",
    path: "/portal/ausbildung",
  },
  {
    id: "verband",
    icon: Landmark,
    title: "Verbands-Portal",
    features: ["Standards", "Zertifikate", "Mitglieder-Verwaltung", "Statistiken"],
    examples: "FN, DHG, BVHK, GPM",
    path: "/portal/verband",
  },
];

export default function PortalGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Hufi Business Portal</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Wähle das Portal das zu dir passt. Erkunde die Features im Demo-Modus oder bewirb dich für dein eigenes Portal.
          </p>
        </div>
      </div>

      {/* Portal Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-primary/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">{portal.title}</h2>
                <ul className="space-y-1">
                  {portal.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Für: <span className="text-foreground font-medium">{portal.examples}</span>
                </p>
                <Button
                  variant="outline"
                  className="w-full group-hover:border-primary group-hover:text-primary"
                  onClick={() => navigate(portal.path)}
                >
                  Erkunden
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Du möchtest ein eigenes Portal auf der Hufi-Plattform betreiben?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Versicherungen, Hersteller, Verbände, Kliniken, Schulen und Lieferanten –
            betreibe dein Business auf dem Betriebssystem der Pferdewelt.
          </p>
          <Button size="lg" onClick={() => navigate("/portal/bewerben")}>
            Jetzt bewerben
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={async () => {
            await logout();
          }} className="text-muted-foreground">
            ← Zurück zum Login
          </Button>
        </div>
      </div>
    </div>
  );
}
