import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface LegalAgreement {
  id: string;
  agreement_type: string;
  accepted_at: string | null;
  document_url: string | null;
  version: string;
}

export function LegalSettings() {
  const [avvAgreement, setAvvAgreement] = useState<LegalAgreement | null>(null);
  const [agbAgreement, setAgbAgreement] = useState<LegalAgreement | null>(null);
  const [agbSignedUrl, setAgbSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avvAccepted, setAvvAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('legal_agreements')
      .select('*')
      .eq('provider_id', userData.user.id);

    if (data) {
      const avv = data.find(a => a.agreement_type === 'avv') || null;
      const agb = data.find(a => a.agreement_type === 'agb') || null;
      setAvvAgreement(avv);
      setAgbAgreement(agb);
      
      // Get signed URL for AGB if exists
      if (agb?.document_url) {
        const signedUrl = await getStorageUrl('legal-documents', agb.document_url);
        setAgbSignedUrl(signedUrl);
      }
    }
    setLoading(false);
  };

  const handleAcceptAVV = async () => {
    if (!avvAccepted) {
      toast({
        title: "Bitte bestätigen",
        description: "Du musst den AVV-Vertrag bestätigen.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    try {
      if (avvAgreement) {
        await supabase
          .from('legal_agreements')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', avvAgreement.id);
      } else {
        await supabase
          .from('legal_agreements')
          .insert({
            provider_id: userData.user.id,
            agreement_type: 'avv',
            accepted_at: new Date().toISOString(),
            version: '1.0',
          });
      }
      
      toast({ title: "AVV erfolgreich bestätigt" });
      fetchAgreements();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      {/* AVV Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Auftragsverarbeitungsvertrag (AVV)
          </CardTitle>
          <CardDescription>
            DSGVO-konformer Vertrag zwischen dir und Passaon (HufManager-Betreiber)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {avvAgreement?.accepted_at ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">AVV bestätigt</p>
                <p className="text-sm text-green-700">
                  Am {format(new Date(avvAgreement.accepted_at), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">AVV noch nicht bestätigt</p>
                    <p className="text-amber-700 mt-1">
                      Als Auftragsverarbeiter bist du verpflichtet, einen AVV abzuschließen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <a 
                  href="https://docs.google.com/document/d/AVV-TEMPLATE" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  AVV-Vertrag lesen
                  <ExternalLink className="h-3 w-3" />
                </a>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="avv-accept"
                    checked={avvAccepted}
                    onCheckedChange={(checked) => setAvvAccepted(checked as boolean)}
                  />
                  <Label htmlFor="avv-accept" className="text-sm cursor-pointer leading-relaxed">
                    Ich habe den Auftragsverarbeitungsvertrag (AVV) gelesen und akzeptiere 
                    die Bedingungen zur Verarbeitung personenbezogener Daten im Auftrag.
                  </Label>
                </div>

                <Button onClick={handleAcceptAVV} disabled={saving || !avvAccepted}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  AVV digital bestätigen
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
