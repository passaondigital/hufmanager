import { FileText, Download, Building2, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const reportTypes = [
  {
    title: "Bestandsmeldung Veterinäramt",
    description: "Aktuelle Pferdeliste mit Equidenpass-Nr., Chipnummer und Halter für die Behördenmeldung",
    icon: Shield,
    category: "Behörden",
  },
  {
    title: "Tierseuchenkasse-Meldung",
    description: "Stichtagsmeldung der gehaltenen Equiden für die Tierseuchenkasse",
    icon: Building2,
    category: "Behörden",
  },
  {
    title: "Stallbelegung & Auslastung",
    description: "Monatliche Auslastungsstatistik mit Ein-/Auszügen",
    icon: Calendar,
    category: "Betrieb",
  },
  {
    title: "Einsteller-Abrechnung",
    description: "Sammelübersicht aller offenen und bezahlten Stallmieten",
    icon: FileText,
    category: "Finanzen",
  },
];

export default function ClientStallReports() {
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Berichte & Behörden</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Offizielle Berichte für Veterinäramt, Tierseuchenkasse und interne Auswertungen
        </p>
      </div>

      <div className="grid gap-4">
        {reportTypes.map((report) => (
          <Card key={report.title} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <report.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {report.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{report.description}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed border-border">
        <CardContent className="p-6 text-center">
          <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Betriebs-Tresor</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Lade hier deine Betriebsgenehmigungen, Versicherungspolicen und behördliche Bescheide hoch.
            Alles sicher verschlüsselt und jederzeit abrufbar.
          </p>
          <Button variant="outline" size="sm" className="mt-3">
            Zum Tresor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
