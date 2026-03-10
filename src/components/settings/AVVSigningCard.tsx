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

const getAvvText = (name: string, street: string, zipCity: string) => {
  const auftraggeber = name || "[Firma oder Vor- und Zuname des Auftraggebers]";
  const auftrStrasse = street || "[Straße, Nr.]";
  const auftrOrt = zipCity || "[Postleitzahl] [Ort]";

  return `Vertrag über Auftragsverarbeitung
im Sinne von Art. 28 Abs. 3 DSGVO

zwischen

${auftraggeber}
${auftrStrasse}
${auftrOrt}

nachfolgend „Auftraggeber"

und

Barhufserviceschmid
Pascal Schmid
Emsdettener Str. 10
c/o Postflex #10643
48268 Greven

nachfolgend „Auftragnehmer"


1. Allgemeine Bestimmungen und Vertragsgegenstand

1.1 Gegenstand des vorliegenden Vertrags ist die Verarbeitung personenbezogener Daten im Auftrag durch den Auftragnehmer (Art. 28 DSGVO). Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ist der Auftraggeber.

1.2 Inhalt des Auftrags, Kategorien betroffener Personen und Datenarten sowie Zweck der Vereinbarung sind Anlage 1 zu entnehmen.

1.3 Die Verarbeitung der Daten durch den Auftragnehmer findet ausschließlich auf dem Gebiet der Bundesrepublik Deutschland, einem Mitgliedsstaat der Europäischen Union oder einem Vertragsstaat des EWR-Abkommens statt. Die Verarbeitung außerhalb dieser Staaten erfolgt nur unter den Voraussetzungen von Kapitel 5 der DSGVO (Art. 44 ff.) und mit vorheriger Zustimmung oder nach vorheriger Weisung des Auftraggebers.


2. Vertragslaufzeit und Kündigung

Der vorliegende Vertrag wird auf unbestimmte Zeit geschlossen und kann von jeder Vertragspartei mit einer Frist von drei Monaten ordentlich gekündigt werden. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.


3. Weisungen des Auftraggebers

3.1 Dem Auftraggeber steht ein umfassendes Weisungsrecht in Bezug auf Art, Umfang und Modalitäten der Datenverarbeitung ggü. dem Auftragnehmer zu. Der Auftragnehmer informiert den Auftraggeber unverzüglich, falls eine Weisung gegen gesetzliche Vorschriften verstößt.

3.2 Eine abweichende Verarbeitung ist nur zulässig, wenn der Auftragnehmer nach EU- oder nationalem Recht dazu verpflichtet ist.

3.3 Weisungen sind grundsätzlich schriftlich oder elektronisch zu erteilen.

3.4 Der Auftraggeber benennt auf Verlangen weisungsberechtigte Personen.


4. Kontrollbefugnisse des Auftraggebers

4.1 Der Auftraggeber ist berechtigt, die Einhaltung der Datenschutzvorschriften regelmäßig zu kontrollieren.

4.2 Die Ergebnisse der Kontrollen sind vom Auftraggeber zu protokollieren.


5. Allgemeine Pflichten des Auftragnehmers

5.1 Die Verarbeitung erfolgt ausschließlich auf Grundlage der vertraglichen Vereinbarungen und der Weisungen des Auftraggebers.

5.2 Der Auftragnehmer gewährleistet, dass alle zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet sind (Art. 28 Abs. 3 lit. b DSGVO).


6. Technische und organisatorische Maßnahmen

Der Auftragnehmer hat geeignete technische und organisatorische Maßnahmen festgelegt (siehe Anlage 2). Diese wurden unter Beachtung von Art. 32 DSGVO ausgewählt und werden regelmäßig überprüft.


7. Unterstützungspflichten des Auftragnehmers

Der Auftragnehmer unterstützt den Auftraggeber bei der Wahrung der Betroffenenrechte (Art. 12–22 DSGVO) sowie bei den Pflichten nach Art. 32–36 DSGVO.


8. Einsatz von Unterauftragsverarbeitern (Subunternehmer)

8.1 Der Auftragnehmer ist zum Einsatz von Subunternehmern berechtigt. Bestehende Subunternehmer sind in Anlage 3 aufgeführt.

8.2 Neue Subunternehmer werden dem Auftraggeber mindestens zwei Wochen vorher angezeigt. Bei ausbleibendem Widerspruch gilt die Zustimmung als erteilt.

8.3 Subunternehmer werden sorgfältig ausgewählt und vertraglich zur DSGVO-Konformität verpflichtet.

8.4 Die Beauftragung von Subunternehmern in Drittstaaten ist nur unter den Voraussetzungen der Art. 44 ff. DSGVO zulässig.


9. Mitteilungspflichten des Auftragnehmers

9.1 Datenschutzverstöße sind dem Auftraggeber unverzüglich mitzuteilen.

9.2 Anfragen von Betroffenen oder Behörden werden unverzüglich weitergeleitet.

9.3 Der Auftragnehmer informiert unverzüglich über bevorstehende Behördenmaßnahmen oder Datengefährdungen.


10. Vertragsbeendigung, Löschung und Rückgabe der Daten

Nach Vertragsende werden alle personenbezogenen Daten nach Wahl des Auftraggebers gelöscht oder zurückgegeben.


11. Datengeheimnis und Vertraulichkeit

Der Auftragnehmer behandelt alle Daten unbefristet vertraulich und verpflichtet seine Mitarbeiter entsprechend.


12. Schlussbestimmungen

12.1 Änderungen bedürfen der Schriftform.

12.2 Gerichtsstand ist der Sitz des Auftragnehmers.

12.3 Verweise gelten auch für Nachfolgeregelungen der DSGVO.

12.4 Unwirksame Klauseln berühren die übrigen nicht.

12.5 Alle Anlagen sind Vertragsbestandteil.


---

ANLAGE 1 – Auftragsdetails

Leistung: SaaS-Plattform HufManager

Verarbeitete Datenarten:
- Name und Kontaktdaten der Nutzer
- E-Mail-Adressen
- Pferdeakten und Behandlungsdaten
- Termindaten
- IP-Adressen
- Zahlungsdaten

Betroffene Personenkategorien:
- Hufbearbeiter
- Pferdebesitzer
- Tierärzte
- Physiotherapeuten
- Mitarbeiter der Auftraggeber


---

ANLAGE 2 – Technische und organisatorische Maßnahmen (TOMs)

1. Zutrittskontrolle: Homeoffice-Betrieb, kein öffentlicher Zugang zum Arbeitsbereich

2. Zugangskontrolle IT-Systeme:
- Passwortvergabe und Passwort-Richtlinien
- Zugriffsregeln / Berechtigungskonzept
- Software-Firewall

3. Eingabekontrolle:
- Protokollierung der Aktionen einzelner Nutzer
- Nachvollziehbarkeit von Eingabe, Änderung und Löschung durch individuelle Benutzernamen

4. Sichere Löschung: Löschkonzept

5. Subunternehmer-Datenschutz:
- Sorgfältige Auswahl
- DSGVO-konforme AVVs
- Subunternehmer: Supabase Inc. (USA), Vercel Inc. (USA), Anthropic PBC (USA), ALL-INKL.COM (Deutschland)

6. Weitergabekontrolle: Alle Datenübertragungen ausschließlich über HTTPS/TLS

7. Backup & Wiederherstellung:
- Backup- & Wiederherstellungskonzept
- Automatische Backups durch Supabase

8. Überprüfung der TOMs: jährlich und anlassbezogen


---

ANLAGE 3 – Subunternehmer

1. ALL-INKL.COM – Neue Medien Münnich, Hauptstraße 68, 02742 Friedersdorf, Deutschland | Domain und Webhosting | Deutschland

2. Supabase Inc., 970 Trestle Glen Rd, Oakland, CA 94610, USA | Datenbankhosting und Backend | USA

3. Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA | Frontend-Hosting | USA

4. Anthropic PBC, 548 Market St, PMB 90375, San Francisco, CA 94104, USA | KI-Assistent „Hufi" auf Basis der Claude API | USA`;
};

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
    doc.text("Vertrag über Auftragsverarbeitung", margin, 25);
    doc.text("im Sinne von Art. 28 Abs. 3 DSGVO", margin, 33);
    
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
    doc.text("Pascal Schmid (Barhufserviceschmid)", margin, 92);
    doc.text("c/o Postflex #10643, Emsdettener Str. 10", margin, 99);
    doc.text("48268 Greven", margin, 106);
    
    // Contract text (simplified for PDF)
    doc.setFontSize(9);
    let yPos = 120;
    const avvContent = getAvvText(formData.name, formData.street, `${formData.zipCode} ${formData.city}`);
    const lines = doc.splitTextToSize(avvContent, contentWidth);
    
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
