import { Briefcase, Users, Heart, TrendingUp, Euro, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Pferde", value: "–", sub: "Im Bestand", icon: Heart, color: "text-primary" },
  { label: "Kunden", value: "–", sub: "Aktiv", icon: Users, color: "text-blue-500" },
  { label: "Umsatz", value: "–€", sub: "Diesen Monat", icon: Euro, color: "text-green-500" },
  { label: "Aufträge", value: "–", sub: "Offen", icon: Package, color: "text-amber-500" },
];

export default function ClientBusinessOverview() {
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Betriebsübersicht</h1>
        <p className="text-sm text-muted-foreground mt-1">Dein Gewerbebetrieb auf einen Blick</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Letzte Aufträge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <p className="text-sm">Noch keine Aufträge</p>
              <p className="text-xs mt-1">Aufträge und Buchungen erscheinen hier automatisch.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Offene Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <p className="text-sm">Keine offenen Rechnungen</p>
              <p className="text-xs mt-1">Ausgangsrechnungen werden hier angezeigt.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
