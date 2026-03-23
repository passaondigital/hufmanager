import { Settings, Bell, Clock, Shield, Palette } from "lucide-react";
import { SectionHeader } from "@/components/dashboard-zones";

const SETTING_GROUPS = [
  {
    title: "Allgemein",
    items: [
      { icon: Settings, label: "Stall-Informationen", desc: "Name, Adresse, Kontaktdaten, Betriebsart" },
      { icon: Clock, label: "Öffnungszeiten", desc: "Reitplatz, Führanlage, Stallzeiten" },
      { icon: Palette, label: "Branding", desc: "Logo, Farben, Außendarstellung" },
    ],
  },
  {
    title: "Benachrichtigungen",
    items: [
      { icon: Bell, label: "Push & E-Mail", desc: "Termin-Erinnerungen, Lagerwarnung, Neue Anfragen" },
    ],
  },
  {
    title: "Sicherheit",
    items: [
      { icon: Shield, label: "Zugriffsrechte", desc: "Mitarbeiter-Berechtigungen, Einsteller-Sichtbarkeit" },
    ],
  },
];

export default function StallSettings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Stall-Einstellungen</h1>

      {SETTING_GROUPS.map(group => (
        <div key={group.title}>
          <SectionHeader title={group.title} />
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {group.items.map(item => (
              <button key={item.label} className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
