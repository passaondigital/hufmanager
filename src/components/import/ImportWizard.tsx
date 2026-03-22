import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import type { ContactCategory, ParsedContact, ImportResult, ImportStep } from "./types";
import { CATEGORY_CONFIG } from "./types";
import { parseFile, parsePlainText } from "./parsers";
import ImportDataValidator from "./ImportDataValidator";
import ImportProgressBar from "./ImportProgressBar";
import ImportInvitationPanel from "./ImportInvitationPanel";

type WizardStep = "welcome" | "format" | "upload" | "validate" | "importing" | "done";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "welcome", label: "Start" },
  { key: "format", label: "Format" },
  { key: "upload", label: "Hochladen" },
  { key: "validate", label: "Prüfen" },
  { key: "importing", label: "Import" },
  { key: "done", label: "Fertig" },
];

const ACCEPTED_FORMATS = ".csv,.tsv,.txt,.xlsx,.xls,.vcf,.json";

interface ImportWizardProps {
  /** Hide the category selector and force a specific category */
  forceCategory?: ContactCategory;
}

const ImportWizard = ({ forceCategory }: ImportWizardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("welcome");
  const [category, setCategory] = useState<ContactCategory>(forceCategory || "client");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validCount = contacts.filter(c => c.status !== "error").length;
  const errorCount = contacts.filter(c => c.status === "error").length;
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const handleFileRead = useCallback((file: File) => {
    setFileName(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (!result) return;
        const parsed = parseFile(file, result);
        if (parsed.length === 0) {
          toast({ title: "Keine Daten erkannt", description: "Die Datei enthält keine verwertbaren Kontakte.", variant: "destructive" });
          return;
        }
        setContacts(parsed);
        setStep("validate");
        toast({ title: `${parsed.length} Kontakte erkannt` });
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
    setStep("welcome");
    setContacts([]);
    setFileName("");
    setPasteText("");
    setSelectedFormat(null);
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

  // Stepper
  const Stepper = () => (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const isCompleted = i < stepIndex;
        const isCurrent = i === stepIndex;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors ${
                isCompleted ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mx-1 ${isCompleted ? "bg-emerald-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const formatOptions = [
    { id: "csv", icon: FileSpreadsheet, label: "CSV / TSV", desc: "Komma- oder Semikolon-getrennt", accept: ".csv,.tsv,.txt" },
    { id: "excel", icon: FileSpreadsheet, label: "Excel", desc: ".xlsx oder .xls Datei", accept: ".xlsx,.xls" },
    { id: "vcard", icon: ContactRound, label: "vCard (.vcf)", desc: "Kontakt-Export vom Handy", accept: ".vcf" },
    { id: "json", icon: FileJson, label: "JSON", desc: "Strukturierte Datendatei", accept: ".json" },
    { id: "paste", icon: ClipboardPaste, label: "Copy & Paste", desc: "Text direkt einfügen" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stepper */}
      <Stepper />

      {/* STEP 1: Welcome */}
      {step === "welcome" && (
        <div className="space-y-6">
          <div className="text-center space-y-2 py-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Import-Assistent</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Ich führe dich Schritt für Schritt durch den Import deiner Kontakte. Keine Sorge – du kannst jederzeit zurückgehen.
            </p>
          </div>

          {/* Category Selection */}
          {!forceCategory && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Was möchtest du importieren?</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key as ContactCategory)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                      category === key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => setStep("format")} className="w-full gap-2" size="lg">
            Los geht's <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STEP 2: Format Selection */}
      {step === "format" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">In welchem Format liegen deine Daten vor?</h3>
            <p className="text-sm text-muted-foreground mt-1">Wähle das passende Format aus – wir kümmern uns um den Rest.</p>
          </div>

          <div className="grid gap-2">
            {formatOptions.map(fmt => (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === fmt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <fmt.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{fmt.label}</p>
                  <p className="text-xs text-muted-foreground">{fmt.desc}</p>
                </div>
                {selectedFormat === fmt.id && <Check className="h-4 w-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("welcome")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
            <Button
              onClick={() => setStep("upload")}
              disabled={!selectedFormat}
              className="flex-1 gap-1.5"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="w-full gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> CSV-Vorlage herunterladen
          </Button>
        </div>
      )}

      {/* STEP 3: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={formatOptions.find(f => f.id === selectedFormat)?.accept || ACCEPTED_FORMATS}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
            className="hidden"
          />

          {selectedFormat === "paste" ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Daten einfügen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Füge Namen, E-Mails und Telefonnummern ein – eine Person pro Zeile.
                </p>
              </div>
              <Textarea
                placeholder={"Max Mustermann max@example.com 0171-1234567\nErika Muster erika@test.de 0172-9876543"}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("format")} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </Button>
                <Button onClick={handlePaste} disabled={!pasteText.trim()} className="flex-1 gap-1.5">
                  Kontakte erkennen <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Datei hochladen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ziehe deine {formatOptions.find(f => f.id === selectedFormat)?.label}-Datei hierher oder klicke zum Auswählen.
                </p>
              </div>

              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground">Datei hierher ziehen</p>
                <p className="text-sm text-muted-foreground mt-1">oder klicken zum Auswählen</p>
              </div>

              <Button variant="outline" onClick={() => setStep("format")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Zurück
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Validate */}
      {step === "validate" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Daten prüfen & korrigieren</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fileName} · {validCount} OK · {errorCount} fehlerhaft
              </p>
            </div>
          </div>

          <ImportDataValidator contacts={contacts} onUpdate={setContacts} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setContacts([]); setStep("upload"); }} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
            <Button
              onClick={startImport}
              disabled={validCount === 0}
              className="flex-1 gap-2"
            >
              {validCount} importieren <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Importing */}
      {step === "importing" && (
        <div className="space-y-4 py-6">
          <div className="text-center mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Daten werden importiert...</h3>
            <p className="text-sm text-muted-foreground">Bitte Fenster nicht schließen.</p>
          </div>
          <ImportProgressBar
            current={importProgress.current}
            total={importProgress.total}
            phase="importing"
          />
        </div>
      )}

      {/* STEP 6: Done */}
      {step === "done" && (
        <div className="space-y-6">
          <div className="text-center py-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-lg">Import abgeschlossen!</h3>
            <p className="text-sm text-muted-foreground">
              {importResults.filter(r => r.success).length} von {importResults.length} Kontakten erfolgreich importiert.
            </p>
          </div>

          <ImportProgressBar
            current={importProgress.total}
            total={importProgress.total}
            phase="done"
          />

          {/* Invitation panel */}
          {importResults.filter(r => r.success).length > 0 && (
            <ImportInvitationPanel results={importResults} />
          )}

          <Button variant="outline" onClick={reset} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Neuen Import starten
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
