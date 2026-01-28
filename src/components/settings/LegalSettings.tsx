import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Clock, 
  Loader2,
  ExternalLink
} from "lucide-react";
import { AVVSigningCard } from "./AVVSigningCard";
import { TaxCountryCard } from "./TaxCountryCard";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface LegalAgreement {
  id: string;
  agreement_type: string;
  document_url: string | null;
  version: string;
}

interface TaxInfo {
  vat_id: string;
  tax_number: string;
}

export function LegalSettings() {
  const [agbAgreement, setAgbAgreement] = useState<LegalAgreement | null>(null);
  const [agbSignedUrl, setAgbSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [taxInfo, setTaxInfo] = useState<TaxInfo>({ vat_id: "", tax_number: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAgreements();
    fetchTaxInfo();
  }, []);

  const fetchTaxInfo = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('business_settings')
      .select('vat_id, tax_number')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (data) {
      setTaxInfo({
        vat_id: data.vat_id || "",
        tax_number: data.tax_number || "",
      });
    }
  };

  const handleSaveTaxInfo = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setSavingTax(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .update({
          vat_id: taxInfo.vat_id || null,
          tax_number: taxInfo.tax_number || null,
        })
        .eq('user_id', userData.user.id);

      if (error) throw error;
      toast({ title: "Steuerdaten gespeichert" });
    } catch (error: any) {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingTax(false);
    }
  };

  const fetchAgreements = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('legal_agreements')
      .select('*')
      .eq('provider_id', userData.user.id);

    if (data) {
      const agb = data.find(a => a.agreement_type === 'agb') || null;
      setAgbAgreement(agb);
      
      // Get signed URL for AGB if exists
      if (agb?.document_url) {
        const signedUrl = await getStorageUrl('legal-documents', agb.document_url);
        setAgbSignedUrl(signedUrl);
      }
    }
    setLoading(false);
  };

  const handleAGBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Nur PDF erlaubt",
        description: "Bitte lade deine AGB als PDF-Datei hoch.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    try {
      // Use UUID for unpredictable file names
      const fileName = `${userData.user.id}/agb_${crypto.randomUUID()}.pdf`;
      
      const { path, error: uploadError } = await uploadFile('legal-documents', fileName, file);
      if (uploadError || !path) throw uploadError || new Error("Upload failed");

      if (agbAgreement) {
        await supabase
          .from('legal_agreements')
          .update({ document_url: path }) // Store path, not URL
          .eq('id', agbAgreement.id);
      } else {
        await supabase
          .from('legal_agreements')
          .insert({
            provider_id: userData.user.id,
            agreement_type: 'agb',
            document_url: path, // Store path, not URL
            version: '1.0',
          });
      }

      toast({ title: "AGB erfolgreich hochgeladen" });
      fetchAgreements();
    } catch (error: any) {
      toast({
        title: "Fehler beim Hochladen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DACH Tax Country Selection */}
      <TaxCountryCard />

      {/* Tax Information for ZUGFeRD / E-Invoicing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Steuerdaten für E-Rechnungen (ZUGFeRD)
          </CardTitle>
          <CardDescription>
            Pflichtangaben für B2B-Rechnungen nach EU-Norm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vat_id">USt-IdNr. (Umsatzsteuer-ID)</Label>
              <Input
                id="vat_id"
                placeholder="DE123456789"
                value={taxInfo.vat_id}
                onChange={(e) => setTaxInfo({ ...taxInfo, vat_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Erforderlich für B2B-Rechnungen innerhalb der EU
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_number">Steuernummer</Label>
              <Input
                id="tax_number"
                placeholder="12/345/67890"
                value={taxInfo.tax_number}
                onChange={(e) => setTaxInfo({ ...taxInfo, tax_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Alternative für lokale Geschäfte ohne USt-IdNr.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveTaxInfo} disabled={savingTax}>
            {savingTax ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Steuerdaten speichern
          </Button>
        </CardContent>
      </Card>

      {/* AVV Section - New Signing Card */}
      <AVVSigningCard />

      {/* AGB Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Deine AGB (Allgemeine Geschäftsbedingungen)
          </CardTitle>
          <CardDescription>
            Werden dem Kunden bei der Terminbuchung angezeigt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agbAgreement?.document_url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">AGB hochgeladen</p>
                  {agbSignedUrl && (
                    <a 
                      href={agbSignedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      PDF anzeigen
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAGBUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Neue Version hochladen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border-dashed border-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Keine AGB hochgeladen</p>
                  <p className="text-sm text-muted-foreground">
                    Optional: Lade deine AGB als PDF hoch
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAGBUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                AGB als PDF hochladen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-1">Warum ist das wichtig?</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>
              <strong>AVV:</strong> Pflicht nach DSGVO, wenn du Kundendaten in HufManager verarbeitest
            </li>
            <li>
              <strong>AGB:</strong> Schützen dich rechtlich und regeln die Geschäftsbeziehung mit deinen Kunden
            </li>
            <li>
              <strong>Werkvertrag:</strong> Die digitale Unterschrift bei Terminabschluss dokumentiert die Abnahme
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
