import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import SignatureCanvas from "react-signature-canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Download, FileSignature, Eraser, Loader2, Shield } from "lucide-react";
import { getStorageUrl } from "@/lib/storage";

const AVV_TEXT = `AUFTRAGSVERARBEITUNGSVERTRAG (AVV)
nach Art. 28 DSGVO für die Nutzung von HufManager

1. Vertragsparteien

Dieser Vertrag wird geschlossen zwischen:

Auftraggeber (Verantwortlicher im Sinne der DSGVO):
Der jeweilige Nutzer von HufManager (z. B. Hufbearbeiter, Dienstleister, Partner).

und

Auftragsverarbeiter:
HufManager – betrieben durch
Pascal Schmid, Barhufserviceschmid, Einzelunternehmen, c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven (D)
support@hufmanager.de
– nachfolgend „HufManager" genannt –

2. Gegenstand und Dauer der Verarbeitung

Gegenstand dieses Vertrages ist die Verarbeitung personenbezogener Daten durch HufManager im Auftrag des Auftraggebers im Rahmen der Nutzung der Softwareplattform „HufManager".

Die Verarbeitung erfolgt für die Dauer des jeweiligen Nutzungsvertrages.

3. Art und Zweck der Verarbeitung

Die Verarbeitung umfasst insbesondere:
• Erheben
• Erfassen
• Organisieren
• Ordnen
• Speichern
• Anpassen
• Auslesen
• Verwenden
• Offenlegen durch Übermittlung (nach Freigabe)
• Abgleichen
• Einschränken
• Löschen

Zweck der Verarbeitung ist die Bereitstellung eines digitalen Systems zur:
• Kunden- und Pferdeverwaltung
• Termin- und Leistungsorganisation
• Dokumentation
• Kommunikation
• Abrechnungsunterstützung
• professionellen, tierschutzkonformen Betreuung von Equiden
• systematischen Nachvollziehbarkeit von Betreuung, Historie und Vitaldaten

4. Kategorien betroffener Personen

• Pferdebesitzer / Tierhalter
• Kunden des Auftraggebers
• Mitarbeiter des Auftraggebers
• Hufbearbeiter und Dienstleister

5. Arten personenbezogener Daten

• Stammdaten (Name, Adresse, Kontaktdaten)
• Vertrags- und Nutzungsdaten
• Termin- und Leistungsdaten
• Kommunikationsdaten
• Rechnungsrelevante Daten
• Dokumentationsdaten
• Dateien, Notizen, Bilder
• Systemkennungen und IDs

Eine Verarbeitung besonderer Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO ist nicht vorgesehen.

6. HufManager-ID-System (besondere Systemarchitektur)

HufManager nutzt ein mehrstufiges ID-System zur strukturellen Trennung, Sicherung und kontrollierten Verknüpfung von Daten:
• #kid – KundenID / Pferdebesitzer
• #equid – EquidenID
• #pid – ProfiID
• #prid – PartnerID

Grundprinzipien:
• IDs dienen als zusätzliche Schutz- und Organisationsebene personenbezogener Daten.
• Die Verknüpfung oder Weitergabe von IDs erfolgt ausschließlich auf Grundlage aktiver Freigaben durch den jeweiligen ID-Inhaber.
• Die EquidenID kann bei Verkauf oder Übergabe eines Pferdes auf neue Besitzer oder Dienstleister übertragen werden.
• HufManager übernimmt keine Haftung für die Richtigkeit extern weitergegebener IDs, empfiehlt jedoch die Aufnahme der EquidenID in Kauf- oder Übergabeverträge.

Ziel ist eine lückenlose, professionelle, tierschutzkonforme Dokumentation über den gesamten Lebenszyklus eines Equiden.

7. Offenlegung gegenüber Behörden

Personenbezogene Daten werden ausschließlich auf Grundlage rechtlich wirksamer, schriftlicher Anordnungen (z. B. Gerichtsbeschluss, behördliche Verfügung) an staatliche Stellen übermittelt.

Die betroffene Person wird unverzüglich informiert, sofern keine gesetzliche Verpflichtung oder Gefahr im Verzug dem entgegensteht.

8. Löschung, Sperrung und Wiedervergabe von IDs

Nach Vertragsende oder Löschung eines Accounts gelten folgende Fristen:

EquidenID (#equid): Speicherung bis maximal 90 Tage nach Löschung oder nachgewiesenem Ableben, anschließend vollständige Löschung und mögliche Neuvergabe.

Kunden-, Profi- und PartnerIDs (#kid, #pid, #prid): Speicherung bis maximal 180 Tage, anschließend vollständige Löschung und mögliche Neuvergabe.

Während dieser Fristen erfolgt keine aktive Nutzung der Daten.

9. Markt-, Forschungs- und Bedarfsanalysen

HufManager ist berechtigt, vollständig anonymisierte und nicht rückführbare Kennzahlen für Markt-, Branchen- und Bedarfsanalysen zu verarbeiten und zu veröffentlichen.

Beispiele:
• Rasse- und Artverteilungen
• Berufsgattungen
• Anzahl Pferde pro Halter
• Regionale Auswertungen
• Haltungsbedingungen
• Angebotsarten
• Durchschnittspreise

Eine Identifizierung einzelner Personen, Unternehmen oder Tiere ist ausgeschlossen.

Ziel ist die Förderung von Branchenstandards, Transparenz, Versorgungsqualität und Fachkräfteentwicklung.

10. Unterauftragsverarbeiter

Der Auftraggeber erteilt hiermit die allgemeine Genehmigung zur Beauftragung folgender Sub-Dienstleister:
• Supabase – Backend- und Datenbank-Infrastruktur
• Resend – E-Mail-Kommunikation
• All-inkl.com – Domains und Subdomains
• CopeCart – Zahlungsabwicklung, Zugangsverwaltung, Affiliate-Auszahlungen

11. Technische und organisatorische Maßnahmen (TOM)

HufManager verpflichtet sich zur Umsetzung geeigneter technischer und organisatorischer Maßnahmen, insbesondere:
• Rollen- und Rechtesystem
• Zugriffsbeschränkungen
• Trennung von Datenbereichen
• Verschlüsselung
• Backup- und Wiederherstellungssysteme
• Protokollierung
• Lösch- und Sperrkonzepte
• Schutz durch ID-Systemarchitektur
• organisatorische Zugriffskontrollen

Die jeweils aktuellen TOMs sind Bestandteil dieses Vertrages.

12. Pflichten des Auftragsverarbeiters

HufManager verpflichtet sich insbesondere:
• personenbezogene Daten ausschließlich auf dokumentierte Weisung zu verarbeiten
• Vertraulichkeit zu wahren
• Datenschutzverletzungen unverzüglich zu melden

13. Haftung

Die Haftung richtet sich nach den gesetzlichen Vorschriften der DSGVO.

HufManager übernimmt keine Verantwortung für Inhalte, Eingaben, Zahlungsabwicklungen oder Geschäftsbeziehungen der Nutzer.

14. Vertragsende

Nach Beendigung des Nutzungsverhältnisses werden alle personenbezogenen Daten entsprechend den in Punkt 8 genannten Fristen gelöscht, sofern keine gesetzliche Aufbewahrungspflicht besteht.

15. Schlussbestimmungen

Änderungen dieses Vertrages bedürfen der Textform. HufManager behält sich vor, diesen Vertrag anzupassen, sofern dies aus rechtlichen, technischen oder organisatorischen Gründen erforderlich ist. Nutzer werden hierüber informiert und zur Zustimmung aufgefordert.`;

interface ExistingAgreement {
  id: string;
  accepted_at: string | null;
  document_url: string | null;
  version: string | null;
}

export function AVVSigningCard() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const signaturePadRef = useRef<SignatureCanvas>(null);

  const [signaturePenColor, setSignaturePenColor] = useState<string>("#000000");

  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [existingAgreement, setExistingAgreement] = useState<ExistingAgreement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    street: "",
    zipCode: "",
    city: "",
    signatureCity: "",
  });

  useEffect(() => {
    // Canvas kann keine CSS-Variablen (var(--...)) auflösen, deshalb echten Wert auslesen.
    const root = document.documentElement;
    const foreground = getComputedStyle(root).getPropertyValue("--foreground").trim();
    setSignaturePenColor(foreground ? `hsl(${foreground})` : "#000000");
  }, [resolvedTheme]);

  // Fetch existing agreement and profile data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Check for existing AVV agreement
        const { data: agreement } = await supabase
          .from("legal_agreements")
          .select("id, accepted_at, document_url, version")
          .eq("provider_id", user.id)
          .eq("agreement_type", "AVV")
          .maybeSingle();

        if (agreement?.accepted_at) {
          setExistingAgreement(agreement);
        }

        // Get profile for pre-fill
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, city")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFormData((prev) => ({
            ...prev,
            name: profile.full_name || "",
            signatureCity: profile.city || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePDF = async (): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Auftragsverarbeitungsvertrag (AVV)", margin, 25);
    doc.text("gemäß Art. 28 DSGVO", margin, 33);
    
    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 38, pageWidth - margin, 38);
    
    // Contract parties
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Auftraggeber:", margin, 50);
    doc.setFont("helvetica", "normal");
    doc.text(formData.name, margin, 57);
    doc.text(formData.street, margin, 64);
    doc.text(`${formData.zipCode} ${formData.city}`, margin, 71);
    
    doc.setFont("helvetica", "bold");
    doc.text("Auftragsverarbeiter:", margin, 85);
    doc.setFont("helvetica", "normal");
    doc.text("HufManager GmbH", margin, 92);
    doc.text("Musterstraße 123", margin, 99);
    doc.text("12345 Musterstadt", margin, 106);
    
    // Contract text (simplified for PDF)
    doc.setFontSize(9);
    let yPos = 120;
    const lines = doc.splitTextToSize(AVV_TEXT, contentWidth);
    
    for (const line of lines) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 25;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }
    
    // Signature page
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Unterschrift des Auftraggebers", margin, 30);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Ort: ${formData.signatureCity}`, margin, 45);
    doc.text(`Datum: ${format(new Date(), "dd.MM.yyyy", { locale: de })}`, margin, 52);
    
    // Add signature image
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const signatureData = signaturePadRef.current.toDataURL("image/png");
      doc.addImage(signatureData, "PNG", margin, 60, 80, 40);
    }
    
    doc.setFontSize(8);
    doc.text("_".repeat(50), margin, 105);
    doc.text(formData.name, margin, 112);
    
    return doc.output("blob");
  };

  const handleSign = async () => {
    if (!user?.id) {
      toast.error("Du musst eingeloggt sein");
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error("Bitte gib deinen Namen ein");
      return;
    }
    
    if (!formData.street.trim() || !formData.zipCode.trim() || !formData.city.trim()) {
      toast.error("Bitte fülle alle Adressfelder aus");
      return;
    }
    
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error("Bitte unterschreibe den Vertrag");
      return;
    }
    
    setIsSigning(true);
    
    try {
      // Generate PDF
      const pdfBlob = await generatePDF();
      
      // Upload to storage
      const timestamp = Date.now();
      const filePath = `${user.id}/avv_${timestamp}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from("legal-documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Create or update legal_agreements entry
      const { data: existingEntry } = await supabase
        .from("legal_agreements")
        .select("id")
        .eq("provider_id", user.id)
        .eq("agreement_type", "AVV")
        .maybeSingle();
      
      if (existingEntry) {
        const { error: updateError } = await supabase
          .from("legal_agreements")
          .update({
            accepted_at: new Date().toISOString(),
            document_url: filePath,
            version: "1.0",
          })
          .eq("id", existingEntry.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("legal_agreements")
          .insert({
            provider_id: user.id,
            agreement_type: "AVV",
            version: "1.0",
            accepted_at: new Date().toISOString(),
            document_url: filePath,
          });
        
        if (insertError) throw insertError;
      }
      
      // Download PDF for user
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AVV_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Update state
      setExistingAgreement({
        id: existingEntry?.id || "",
        accepted_at: new Date().toISOString(),
        document_url: filePath,
        version: "1.0",
      });
      
      toast.success("AVV erfolgreich unterzeichnet!");
    } catch (error) {
      console.error("Error signing AVV:", error);
      toast.error("Fehler beim Unterzeichnen des AVV");
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!existingAgreement?.document_url) {
      toast.error("Kein Dokument gefunden");
      return;
    }
    
    try {
      const signedUrl = await getStorageUrl("legal-documents", existingAgreement.document_url);
      
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        toast.error("Dokument konnte nicht geladen werden");
      }
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Fehler beim Herunterladen");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already signed view
  if (existingAgreement?.accepted_at) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-green-700 dark:text-green-400">
                AVV unterzeichnet
              </CardTitle>
              <CardDescription>
                Du hast den Auftragsverarbeitungsvertrag am{" "}
                <strong>
                  {format(new Date(existingAgreement.accepted_at), "dd. MMMM yyyy", { locale: de })}
                </strong>{" "}
                unterzeichnet.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Vertrag herunterladen
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Signing form view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Auftragsverarbeitungsvertrag (AVV)</CardTitle>
            <CardDescription>
              Gemäß Art. 28 DSGVO – bitte lies den Vertrag und unterzeichne digital
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contract Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Vertragstext</Label>
            <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                {AVV_TEXT}
              </div>
            </ScrollArea>
          </div>
          
          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name des Auftraggebers</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Max Mustermann"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="street">Straße & Hausnummer</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => handleInputChange("street", e.target.value)}
                placeholder="Musterstraße 123"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="zipCode">PLZ</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder="12345"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Musterstadt"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="signatureCity">Ort der Unterschrift</Label>
                <Input
                  id="signatureCity"
                  value={formData.signatureCity}
                  onChange={(e) => handleInputChange("signatureCity", e.target.value)}
                  placeholder="Musterstadt"
                />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  value={format(new Date(), "dd.MM.yyyy", { locale: de })}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            
            {/* Signature Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unterschrift</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  className="h-8 gap-1 text-xs"
                >
                  <Eraser className="h-3 w-3" />
                  Löschen
                </Button>
              </div>
              <div className="rounded-lg border-2 border-dashed bg-background p-1">
                <SignatureCanvas
                  ref={signaturePadRef}
                  canvasProps={{
                    className: "w-full h-32 rounded cursor-crosshair",
                    style: { width: "100%", height: "128px" },
                  }}
                  backgroundColor="transparent"
                  penColor={signaturePenColor}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Unterschreibe mit der Maus oder dem Finger im Feld oben
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-end">
          <Button
            onClick={handleSign}
            disabled={isSigning}
            size="lg"
            className="gap-2"
          >
            {isSigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird unterzeichnet...
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4" />
                Vertrag rechtssicher unterzeichnen & PDF generieren
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
