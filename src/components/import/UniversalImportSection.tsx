import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileJson,
  ContactRound,
  ClipboardPaste,
  Download,
  Check,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { ContactCategory, ParsedContact, ImportResult, ImportStep } from "./types";
import { CATEGORY_CONFIG } from "./types";
import { parseFile, parsePlainText, validateContact } from "./parsers";
import ImportDataValidator from "./ImportDataValidator";
import ImportProgressBar from "./ImportProgressBar";
import ImportInvitationPanel from "./ImportInvitationPanel";

const ACCEPTED_FORMATS = ".csv,.tsv,.txt,.xlsx,.xls,.vcf,.json";
const FORMAT_INFO = [
  { ext: "CSV / TSV", desc: "Komma/Semikolon/Tab-getrennt" },
  { ext: "Excel (.xlsx, .xls)", desc: "Tabellenkalkulationen" },
  { ext: "vCard (.vcf)", desc: "Kontakt-Export vom Handy" },
  { ext: "JSON", desc: "Strukturierte Datendatei" },
  { ext: "Text / Copy & Paste", desc: "Freitext mit Namen, E-Mails, Nummern" },
];

const UniversalImportSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [category, setCategory] = useState<ContactCategory>("client");
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validCount = contacts.filter(c => c.status !== "error").length;
  const errorCount = contacts.filter(c => c.status === "error").length;

  const handleFileRead = useCallback((file: File) => {
    setFileName(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result;
        if (!result) return;
        const parsed = await parseFile(file, result);
        if (parsed.length === 0) {
          toast({ title: "Keine Daten erkannt", description: "Die Datei enthält keine verwertbaren Kontakte.", variant: "destructive" });
          return;
        }
        setContacts(parsed);
        setStep("validate");
        toast({ title: `${parsed.length} Kontakte erkannt`, description: `${parsed.filter(c => c.status === "error").length} mit Fehlern` });
      } catch {
        toast({ title: "Fehler beim Parsen", description: "Die Datei konnte nicht gelesen werden.", variant: "destructive" });
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, [handleFileRead]);

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parsePlainText(pasteText);
    if (parsed.length === 0) {
      toast({ title: "Keine Kontakte erkannt", variant: "destructive" });
      return;
    }
    setContacts(parsed);
    setFileName("Eingefügter Text");
    setStep("validate");
    setPasteMode(false);
    toast({ title: `${parsed.length} Kontakte erkannt` });
  };

  const startImport = async () => {
    if (!user?.id) return;
    const toImport = contacts.filter(c => c.status !== "error");
    setStep("importing");
    setImportProgress({ current: 0, total: toImport.length });
    const results: ImportResult[] = [];

    const BATCH = 20;
    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH);
      const rows = batch.map(c => ({
        provider_id: user.id,
        category,
        full_name: c.full_name,
        email: c.email || null,
        phone: c.phone || null,
        company_name: c.company_name || null,
        street: c.street || null,
        notes: c.notes || null,
        source: "file_import",
      }));

      const { error } = await supabase.from("contacts").insert(rows);
      batch.forEach(c => {
        results.push({ contact: c, success: !error, error: error?.message });
      });
      setImportProgress({ current: Math.min(i + BATCH, toImport.length), total: toImport.length });
    }

    // Add skipped error contacts
    contacts.filter(c => c.status === "error").forEach(c => {
      results.push({ contact: c, success: false, error: c.errors.join(", ") });
    });

    setImportResults(results);
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    const successCount = results.filter(r => r.success).length;
    toast({ title: "Import abgeschlossen", description: `${successCount} von ${contacts.length} Kontakten importiert` });
  };

  const reset = () => {
    setStep("upload");
    setContacts([]);
    setFileName("");
    setPasteText("");
    setPasteMode(false);
    setImportResults([]);
    setImportProgress({ current: 0, total: 0 });
  };

  const downloadTemplate = () => {
    const tpl = "Name;Email;Telefon;Straße;Firma;Notizen\nMax Mustermann;max@example.com;0123456789;Musterstraße 123;Musterfirma;Beispiel";
    const blob = new Blob([tpl], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kontakte-vorlage.csv";
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Universeller Datenimport
        </CardTitle>
        <CardDescription>
          CSV, Excel, vCard, JSON oder per Copy & Paste – alle gängigen Formate unterstützt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection - always visible */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Importieren als:</label>
          <Select value={category} onValueChange={(v) => setCategory(v as ContactCategory)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                    {cfg.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
              className="hidden"
            />

            {!pasteMode ? (
              <>
                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium text-foreground">Datei hierher ziehen oder klicken</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {[
                      { icon: FileSpreadsheet, label: "CSV/Excel" },
                      { icon: ContactRound, label: "vCard" },
                      { icon: FileJson, label: "JSON" },
                      { icon: FileText, label: "Text" },
                    ].map(f => (
                      <Badge key={f.label} variant="secondary" className="gap-1 text-xs">
                        <f.icon className="h-3 w-3" /> {f.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPasteMode(true)} className="gap-1.5">
                    <ClipboardPaste className="h-4 w-4" /> Text einfügen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5">
                    <Download className="h-4 w-4" /> CSV-Vorlage
                  </Button>
                </div>
              </>
            ) : (
              /* Paste mode */
              <div className="space-y-3">
                <Textarea
                  placeholder={"Namen, E-Mails und Telefonnummern einfügen...\n\nz.B.:\nMax Mustermann max@example.com 0171-1234567\nErika Muster erika@test.de 0172-9876543"}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handlePaste} disabled={!pasteText.trim()} className="gap-1.5">
                    <Check className="h-4 w-4" /> Kontakte erkennen
                  </Button>
                  <Button variant="ghost" onClick={() => setPasteMode(false)}>Abbrechen</Button>
                </div>
              </div>
            )}

            {/* Format info */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2 text-sm">Unterstützte Formate:</h4>
              <div className="grid gap-1">
                {FORMAT_INFO.map(f => (
                  <div key={f.ext} className="flex items-baseline gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{f.ext}</span>
                    <span>— {f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP: Validate */}
        {step === "validate" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Datei: <span className="font-medium text-foreground">{fileName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {validCount} importierbar · {errorCount} fehlerhaft (können bearbeitet werden)
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
                <RotateCcw className="h-3 w-3" /> Neu starten
              </Button>
            </div>

            <ImportDataValidator contacts={contacts} onUpdate={setContacts} />

            <div className="flex gap-2">
              <Button
                onClick={startImport}
                disabled={validCount === 0}
                className="flex-1 gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {validCount} Kontakte importieren
                {errorCount > 0 && <span className="text-xs opacity-75">({errorCount} übersprungen)</span>}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Importing */}
        {step === "importing" && (
          <ImportProgressBar
            current={importProgress.current}
            total={importProgress.total}
            phase="importing"
          />
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div className="space-y-6">
            <ImportProgressBar
              current={importProgress.total}
              total={importProgress.total}
              phase="done"
            />

            {/* Results summary */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Check className="h-4 w-4" />
                {importResults.filter(r => r.success).length} erfolgreich
              </div>
              {importResults.filter(r => !r.success).length > 0 && (
                <div className="flex items-center gap-1.5 text-destructive">
                  {importResults.filter(r => !r.success).length} fehlgeschlagen
                </div>
              )}
            </div>

            {/* Invitation panel */}
            {importResults.filter(r => r.success).length > 0 && (
              <ImportInvitationPanel results={importResults} />
            )}

            <Button variant="outline" onClick={reset} className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Weiteren Import starten
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UniversalImportSection;
