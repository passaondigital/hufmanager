import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Upload, Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, getStorageUrl } from "@/lib/storage";

interface SuccessionData {
  id?: string;
  authorized_person_name: string;
  authorized_person_email: string;
  authorized_person_phone: string;
  lawyer_name: string;
  lawyer_firm: string;
  lawyer_email: string;
  lawyer_phone: string;
  last_will_instructions: string;
  document_url: string | null;
}

const EMPTY: SuccessionData = {
  authorized_person_name: "",
  authorized_person_email: "",
  authorized_person_phone: "",
  lawyer_name: "",
  lawyer_firm: "",
  lawyer_email: "",
  lawyer_phone: "",
  last_will_instructions: "",
  document_url: null,
};

export function PlatformSuccession() {
  const [data, setData] = useState<SuccessionData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("platform_succession")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (rows) {
      setData(rows as any);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (data.id) {
        const { error } = await supabase
          .from("platform_succession")
          .update({
            authorized_person_name: data.authorized_person_name || null,
            authorized_person_email: data.authorized_person_email || null,
            authorized_person_phone: data.authorized_person_phone || null,
            lawyer_name: data.lawyer_name || null,
            lawyer_firm: data.lawyer_firm || null,
            lawyer_email: data.lawyer_email || null,
            lawyer_phone: data.lawyer_phone || null,
            last_will_instructions: data.last_will_instructions || null,
            document_url: data.document_url,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_succession")
          .insert({
            authorized_person_name: data.authorized_person_name || null,
            authorized_person_email: data.authorized_person_email || null,
            authorized_person_phone: data.authorized_person_phone || null,
            lawyer_name: data.lawyer_name || null,
            lawyer_firm: data.lawyer_firm || null,
            lawyer_email: data.lawyer_email || null,
            lawyer_phone: data.lawyer_phone || null,
            last_will_instructions: data.last_will_instructions || null,
            document_url: data.document_url,
          } as any);
        if (error) throw error;
      }
      toast.success("Nachfolge-Daten gespeichert");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `succession/${crypto.randomUUID()}.${fileExt}`;
      const { path, error } = await uploadFile('horse-vault', fileName, file);
      if (error || !path) throw error || new Error("Upload fehlgeschlagen");
      setData(d => ({ ...d, document_url: path }));
      toast.success("Dokument hochgeladen");
    } catch (err: any) {
      toast.error(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-amber-600" />
          Plattform-Nachfolge
        </CardTitle>
        <CardDescription className="text-xs">
          Diese Informationen sind ausschließlich für den Fall hinterlegt, dass der Plattformbetreiber 
          nicht mehr handlungsfähig ist. Sie werden nur im dokumentierten Ernstfall aktiviert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authorized Person */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Bevollmächtigte Person</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={data.authorized_person_name} onChange={e => setData(d => ({ ...d, authorized_person_name: e.target.value }))} placeholder="Max Mustermann" maxLength={100} /></div>
            <div><Label>Telefon</Label><Input type="tel" value={data.authorized_person_phone} onChange={e => setData(d => ({ ...d, authorized_person_phone: e.target.value }))} maxLength={20} /></div>
          </div>
          <div><Label>E-Mail</Label><Input type="email" value={data.authorized_person_email} onChange={e => setData(d => ({ ...d, authorized_person_email: e.target.value }))} maxLength={100} /></div>
        </div>

        {/* Lawyer */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground">Beauftragter Anwalt</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={data.lawyer_name} onChange={e => setData(d => ({ ...d, lawyer_name: e.target.value }))} maxLength={100} /></div>
            <div><Label>Kanzlei</Label><Input value={data.lawyer_firm} onChange={e => setData(d => ({ ...d, lawyer_firm: e.target.value }))} maxLength={100} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input type="email" value={data.lawyer_email} onChange={e => setData(d => ({ ...d, lawyer_email: e.target.value }))} maxLength={100} /></div>
            <div><Label>Telefon</Label><Input type="tel" value={data.lawyer_phone} onChange={e => setData(d => ({ ...d, lawyer_phone: e.target.value }))} maxLength={20} /></div>
          </div>
        </div>

        {/* Last Will */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground">Letzter Wille / Anweisung</h4>
          <Textarea
            value={data.last_will_instructions}
            onChange={e => setData(d => ({ ...d, last_will_instructions: e.target.value }))}
            placeholder="Anweisungen für den Ernstfall..."
            rows={4}
            maxLength={5000}
          />
        </div>

        {/* Document Upload */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground">Notarielles Dokument</h4>
          <input type="file" ref={fileInputRef} onChange={handleDocUpload} accept=".pdf" className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {data.document_url ? "Dokument ersetzen" : "PDF hochladen"}
          </Button>
          {data.document_url && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Dokument hinterlegt
            </p>
          )}
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Speichern
        </Button>
      </CardContent>
    </Card>
  );
}
