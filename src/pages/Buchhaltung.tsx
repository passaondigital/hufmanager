import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Receipt, Scale, Share2, Archive, ShieldCheck, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EuerOverview } from "@/components/buchhaltung/EuerOverview";
import { UStVoranmeldung } from "@/components/buchhaltung/UStVoranmeldung";
import { ExportCenter } from "@/components/buchhaltung/ExportCenter";
import { SteuerberaterAccess } from "@/components/buchhaltung/SteuerberaterAccess";
import { BelegArchiv } from "@/components/buchhaltung/BelegArchiv";
import { DataImportSection } from "@/components/buchhaltung/DataImportSection";

export default function Buchhaltung() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("euer");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buchhaltung</h1>
        <p className="text-muted-foreground">
          Professionelle Buchhaltung – GoBD-konform, exportbereit, steuerberater-tauglich
        </p>
      </div>

      {/* Privacy & Data Sovereignty Banner */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground text-sm">
                  Ihre Daten gehören Ihnen – 100% Datensouveränität
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground flex-shrink-0"
                  onClick={() => setShowPrivacy(!showPrivacy)}
                >
                  {showPrivacy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                HufManager hat <strong>keinen Zugriff</strong> auf Ihre Buchhaltungsdaten. Alle Daten werden verschlüsselt gespeichert und sind ausschließlich für Sie einsehbar.
              </p>

              {showPrivacy && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        icon: EyeOff,
                        title: "Kein Zugriff durch HufManager",
                        desc: "Wir können Ihre Rechnungen, Ausgaben und Belege weder einsehen noch verarbeiten. Ihre Daten werden nicht für Marketing, Analysen oder andere Zwecke genutzt.",
                      },
                      {
                        icon: Lock,
                        title: "Verschlüsselte Speicherung",
                        desc: "Alle Daten werden verschlüsselt auf EU-Servern gespeichert (DSGVO-konform). Die Datenübertragung erfolgt ausschließlich über TLS-verschlüsselte Verbindungen.",
                      },
                      {
                        icon: Scale,
                        title: "Keine steuerliche Beratung",
                        desc: "HufManager bietet Werkzeuge zur Buchhaltungs-Unterstützung, ersetzt jedoch keine steuerliche Beratung. Für verbindliche Auskünfte wenden Sie sich an Ihren Steuerberater.",
                      },
                      {
                        icon: ShieldCheck,
                        title: "Jederzeit exportieren & löschen",
                        desc: "Sie können Ihre Daten jederzeit vollständig exportieren oder unwiderruflich löschen lassen (Art. 17 DSGVO). Ihre Daten gehören ausschließlich Ihnen.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-2.5 p-3 rounded-lg bg-background border border-border">
                        <item.icon className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground text-xs">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Rechtlicher Hinweis</p>
                    <p>
                      Die Nutzung der Buchhaltungsfunktionen erfolgt auf eigene Verantwortung. HufManager übernimmt 
                      keine Haftung für die Richtigkeit oder Vollständigkeit der erfassten Daten. Die bereitgestellten 
                      Übersichten (EÜR, USt-VA) dienen ausschließlich als Hilfestellung und ersetzen keine 
                      ordnungsgemäße Buchführung durch einen Steuerberater. Für die Erfüllung steuerlicher Pflichten 
                      ist der Nutzer selbst verantwortlich. Rechtsgrundlage der Datenverarbeitung: Art. 6 Abs. 1 lit. b DSGVO 
                      (Vertragserfüllung).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import existing data */}
      <div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => setShowImport(!showImport)}
        >
          <Upload className="h-3.5 w-3.5" />
          Bestehende Buchhaltung importieren
          {showImport ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        {showImport && (
          <div className="mt-3">
            <DataImportSection />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="euer" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">EÜR</span>
            <span className="sm:hidden">EÜR</span>
          </TabsTrigger>
          <TabsTrigger value="ust" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">USt-VA</span>
            <span className="sm:hidden">USt</span>
          </TabsTrigger>
          <TabsTrigger value="archiv" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Belegarchiv</span>
            <span className="sm:hidden">Archiv</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </TabsTrigger>
          <TabsTrigger value="steuerberater" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Steuerberater</span>
            <span className="sm:hidden">StB</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="euer" className="mt-6">
          <EuerOverview />
        </TabsContent>
        <TabsContent value="ust" className="mt-6">
          <UStVoranmeldung />
        </TabsContent>
        <TabsContent value="archiv" className="mt-6">
          <BelegArchiv />
        </TabsContent>
        <TabsContent value="export" className="mt-6">
          <ExportCenter />
        </TabsContent>
        <TabsContent value="steuerberater" className="mt-6">
          <SteuerberaterAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
}
