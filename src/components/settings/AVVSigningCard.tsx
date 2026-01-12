import { useState, useRef, useEffect } from "react";
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

const AVV_TEXT = `LOREM IPSUM AVV

Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO

1. Gegenstand und Dauer der Verarbeitung
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

2. Art und Zweck der Verarbeitung
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

3. Art der personenbezogenen Daten
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

4. Kategorien betroffener Personen
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

5. Pflichten des Auftragsverarbeiters
Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

6. Technische und organisatorische Maßnahmen
Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.

7. Unterauftragsverarbeiter
At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

8. Rechte der betroffenen Personen
Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

9. Meldepflichten bei Datenschutzvorfällen
Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.

10. Löschung und Rückgabe von Daten
Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.

11. Haftung
Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.

12. Schlussbestimmungen
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

interface ExistingAgreement {
  id: string;
  accepted_at: string | null;
  document_url: string | null;
  version: string | null;
}

export function AVVSigningCard() {
  const { user } = useAuth();
  const signaturePadRef = useRef<SignatureCanvas>(null);
  
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
          setFormData(prev => ({
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
                  penColor="hsl(var(--foreground))"
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
