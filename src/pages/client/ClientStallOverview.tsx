import { Building2, Users, Heart, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Stallplätze", value: "–", sub: "Gesamt", icon: Building2, color: "text-primary" },
  { label: "Belegt", value: "–", sub: "Pferde", icon: Heart, color: "text-green-500" },
  { label: "Einsteller", value: "–", sub: "Aktive Kunden", icon: Users, color: "text-blue-500" },
  { label: "Auslastung", value: "–%", sub: "Kapazität", icon: TrendingUp, color: "text-amber-500" },
];

export default function ClientStallOverview() {
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Betriebsübersicht</h1>
        <p className="text-sm text-muted-foreground mt-1">Dein Stall auf einen Blick</p>
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
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Anstehende Aufgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm">Alles erledigt!</p>
              <p className="text-xs mt-1">Aufgaben erscheinen hier automatisch.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Letzte Aktivitäten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <p className="text-sm">Noch keine Aktivitäten</p>
              <p className="text-xs mt-1">Aktivitäten deiner Einsteller und Pferde erscheinen hier.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
