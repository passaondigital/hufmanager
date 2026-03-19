import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logHorseAction } from "@/utils/auditLog";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PFERDEAKTE_HELP } from "./pferdeakteHelpTexts";

interface XrayUploadProps {
  horseId: string;
  horseName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

const BODY_REGIONS = [
  { value: "vl_huf", label: "Vorne links — Huf" },
  { value: "vr_huf", label: "Vorne rechts — Huf" },
  { value: "hl_huf", label: "Hinten links — Huf" },
  { value: "hr_huf", label: "Hinten rechts — Huf" },
  { value: "halswirbel", label: "Halswirbelsäule" },
  { value: "ruecken", label: "Rücken" },
  { value: "becken", label: "Becken" },
  { value: "vl_bein", label: "Vorne links — Bein" },
  { value: "vr_bein", label: "Vorne rechts — Bein" },
  { value: "hl_bein", label: "Hinten links — Bein" },
  { value: "hr_bein", label: "Hinten rechts — Bein" },
  { value: "kopf", label: "Kopf / Kiefer" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function XrayUpload({ horseId, horseName, onComplete, onCancel }: XrayUploadProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [region, setRegion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vetName, setVetName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name}: Max. 20 MB`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!user || !region || !date || files.length === 0) return;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const path = `xray/${horseId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("horse-documents").upload(path, file);
        if (!error) {
          uploadedUrls.push(path);
        } else {
          console.error("Upload error:", error);
        }
      }

      if (uploadedUrls.length === 0) {
        toast.error("Upload fehlgeschlagen");
        return;
      }

      // Store as horse_documents with xray category
      for (const url of uploadedUrls) {
        await supabase.from("horse_documents").insert({
          horse_id: horseId,
          uploaded_by: user.id,
          file_name: url.split("/").pop() || "xray",
          file_url: url,
          file_type: "image",
          category: "xray",
          notes: [
            `Region: ${BODY_REGIONS.find((r) => r.value === region)?.label || region}`,
            vetName ? `Tierarzt: ${vetName}` : null,
            notes || null,
          ]
            .filter(Boolean)
            .join(" | "),
          document_date: date,
        } as any);
      }

      // Audit log
      await logHorseAction(horseId, "upload_xray", {
        count: uploadedUrls.length,
        region,
        vet: vetName || null,
      });

      toast.success(`${uploadedUrls.length} Röntgenbild(er) hochgeladen`);
      onComplete?.();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">🔬 Röntgenbild hochladen</h3>
        <InfoTooltip {...PFERDEAKTE_HELP.sections.xray} />
      </div>

      <div className="space-y-3">
        <div>
          <Label>Körperregion *</Label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Region wählen..." />
            </SelectTrigger>
            <SelectContent>
              {BODY_REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Aufnahmedatum *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label>Tierarzt (optional)</Label>
          <Input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Name der Praxis / Klinik" className="mt-1" />
        </div>

        <div>
          <Label>Befund / Notizen (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Befundtext, Diagnose..." className="mt-1" rows={2} />
        </div>

        {/* File upload */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Röntgenbilder * (max. 5 Dateien, je 20 MB)</Label>
            <InfoTooltip content="Unterstützte Formate: JPEG, PNG, PDF (DICOM bitte als JPEG exportieren). Die Bilder werden verschlüsselt im Tresor gespeichert." />
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="xray-upload"
            />
            <label htmlFor="xray-upload" className="cursor-pointer">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm">Dateien wählen</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                  <Badge variant="outline" className="shrink-0">
                    {f.name.split(".").pop()?.toUpperCase()}
                  </Badge>
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button onClick={() => removeFile(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        )}
        <Button onClick={submit} disabled={!region || !date || files.length === 0 || uploading} className="flex-1">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Hochladen
        </Button>
      </div>
    </div>
  );
}
