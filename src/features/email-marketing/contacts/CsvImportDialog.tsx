import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useEmailLists } from "../hooks/useEmailLists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

export function CsvImportDialog({ open, onOpenChange, onSuccess }: CsvImportDialogProps) {
  const { lists } = useEmailLists();
  const fileRef = useRef<HTMLInputElement>(null);
  const [listId, setListId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; duplicates: number; errors: number } | null>(null);

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    const separator = lines[0].includes(";") ? ";" : ",";
    const hdrs = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ""));
    setHeaders(hdrs);
    const parsed = lines.slice(1).map(line => {
      const vals = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ""));
      const row: ParsedRow = {};
      hdrs.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    }).filter(r => Object.values(r).some(v => v));
    setRows(parsed);

    // Auto-map common headers
    const autoMap: Record<string, string> = {};
    const emailMatch = hdrs.find(h => /e-?mail/i.test(h));
    if (emailMatch) autoMap.email = emailMatch;
    const fnMatch = hdrs.find(h => /vorname|first.?name|firstname/i.test(h));
    if (fnMatch) autoMap.first_name = fnMatch;
    const lnMatch = hdrs.find(h => /nachname|last.?name|lastname|name/i.test(h));
    if (lnMatch) autoMap.last_name = lnMatch;
    setMapping(autoMap);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => parseCsv(ev.target?.result as string);
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!listId) return toast.error("Bitte wähle eine Ziel-Liste");
    if (!mapping.email) return toast.error("E-Mail-Spalte muss zugeordnet sein");

    setImporting(true);
    let success = 0, duplicates = 0, errors = 0;

    const batch = rows.map(r => ({
      list_id: listId,
      email: r[mapping.email]?.toLowerCase().trim(),
      first_name: mapping.first_name ? r[mapping.first_name]?.trim() || null : null,
      last_name: mapping.last_name ? r[mapping.last_name]?.trim() || null : null,
      source: "csv_import",
      status: "subscribed" as const,
    })).filter(r => r.email && r.email.includes("@"));

    // Insert in chunks of 50
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error, data } = await supabase.from("email_subscribers").insert(chunk).select("id");
      if (error) {
        if (error.code === "23505") duplicates += chunk.length;
        else errors += chunk.length;
      } else {
        success += data?.length || 0;
      }
    }

    setResult({ success, duplicates, errors });
    setImporting(false);
    if (success > 0) {
      toast.success(`${success} Kontakte importiert!`);
      onSuccess();
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  };

  const fields = [
    { key: "email", label: "E-Mail *" },
    { key: "first_name", label: "Vorname" },
    { key: "last_name", label: "Nachname" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-black">Kontakte importieren (CSV)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* List Selection */}
          <div className="space-y-2">
            <Label className="text-black">Ziel-Liste</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Liste auswählen" /></SelectTrigger>
              <SelectContent>
                {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          {!file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#F47B20] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-black font-medium">CSV-Datei hochladen</p>
              <p className="text-xs text-muted-foreground mt-1">Klicken oder Datei hierher ziehen</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <FileText className="w-5 h-5 text-[#F47B20]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{rows.length} Zeilen erkannt</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs">Ändern</Button>
            </div>
          )}

          {/* Field Mapping */}
          {headers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-black text-sm font-medium">Spalten zuordnen</Label>
              {fields.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-sm text-black w-24 shrink-0">{f.label}</span>
                  <Select value={mapping[f.key] || ""} onValueChange={(v) => setMapping(prev => ({ ...prev, [f.key]: v }))}>
                    <SelectTrigger className="bg-white flex-1"><SelectValue placeholder="— Nicht zuordnen —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Nicht zuordnen —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && mapping.email && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Vorschau (erste 3 Einträge):</p>
              {rows.slice(0, 3).map((r, i) => (
                <p key={i} className="text-sm text-black truncate">
                  {r[mapping.email]} {mapping.first_name ? `— ${r[mapping.first_name]}` : ""} {mapping.last_name ? r[mapping.last_name] : ""}
                </p>
              ))}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {result.success} erfolgreich importiert
                </div>
              )}
              {result.duplicates > 0 && (
                <div className="flex items-center gap-2 text-yellow-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {result.duplicates} Duplikate übersprungen
                </div>
              )}
              {result.errors > 0 && (
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {result.errors} Fehler
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Abbrechen</Button>
            <Button
              className="bg-[#F47B20] hover:bg-[#e06a10] text-white"
              onClick={handleImport}
              disabled={importing || !file || !mapping.email || !listId}
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {rows.length} Kontakte importieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
