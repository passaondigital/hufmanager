import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface ChangelogEntry {
  date: string;
  title: string;
  items: { icon: string; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "März 2026",
    title: "Pferdeakte & Tresor Launch",
    items: [
      { icon: "🐴", text: "Pferdeakte – Die weltweit erste Multi-Dienstleister-Akte" },
      { icon: "📊", text: "Timeline mit allen Behandlungen an einem Ort" },
      { icon: "📈", text: "Strukturierte Hufwerte mit Verlaufskurven" },
      { icon: "🤝", text: "Cross-Provider Empfehlungen & Kompetenzteam" },
      { icon: "📄", text: "AKU-Mappe als PDF-Export" },
      { icon: "🔒", text: "Premium-Tresor mit PIN & PostIdent" },
      { icon: "🚨", text: "QR-Notfall-Zugang am Stalltor" },
      { icon: "🤖", text: "HufiAI Sprachnotiz → strukturierter Befund" },
      { icon: "🛡️", text: "Versicherungs-Perspektive (Beta)" },
      { icon: "🔍", text: "Dienstleister-Suche für Pferdebesitzer" },
      { icon: "👥", text: "Besitzer-Hoheit: Team-Freigabe & Berechtigungsmodell" },
    ],
  },
  {
    date: "Februar 2026",
    title: "Dashboard & Insights",
    items: [
      { icon: "📊", text: "Dashboard-Insights mit Pferdeakte-KPIs" },
      { icon: "🗺️", text: "Smarte Tour-Vorschläge & Routenoptimierung" },
      { icon: "📱", text: "PWA-Installation & Offline-Modus" },
      { icon: "💬", text: "Hufi KI-Assistent für alle Rollen" },
      { icon: "🧾", text: "Automatische Rechnungserstellung" },
    ],
  },
  {
    date: "Januar 2026",
    title: "Partner-Netzwerk",
    items: [
      { icon: "🤝", text: "Partner-App für Osteopathen, Physios & Tierärzte" },
      { icon: "📝", text: "Strukturierte Behandlungsnotizen mit Body-Map" },
      { icon: "👷", text: "Mitarbeiter-App mit Check-in/Check-out" },
      { icon: "🌐", text: "Botschafter-Programm & Empfehlungslinks" },
    ],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Was ist neu?</h1>
          <p className="text-muted-foreground mt-2">
            Alle Neuerungen bei Hufi
          </p>
        </div>

        <div className="space-y-10">
          {changelog.map((entry) => (
            <div key={entry.date}>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className="text-xs">
                  {entry.date}
                </Badge>
                <h2 className="font-semibold text-foreground">{entry.title}</h2>
              </div>
              <div className="border rounded-lg divide-y bg-card">
                {entry.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
