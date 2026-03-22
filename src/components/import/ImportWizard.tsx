import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileSpreadsheet,
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
  Loader2,
  Bot,
  Wand2,
} from "lucide-react";
import type { ContactCategory, ParsedContact, ImportResult } from "./types";
import { CATEGORY_CONFIG } from "./types";
import { parseFile, parsePlainText } from "./parsers";
import ImportDataValidator from "./ImportDataValidator";
import ImportProgressBar from "./ImportProgressBar";
import ImportInvitationPanel from "./ImportInvitationPanel";
import ImportDuplicateCheck, { type DuplicateMatch } from "./ImportDuplicateCheck";
import AiImportReview, { type AiProcessedContact, type AiImportSummary } from "./AiImportReview";
import { checkDuplicates } from "./useImportDuplicateCheck";

type WizardStep = "welcome" | "format" | "upload" | "validate" | "ai-processing" | "ai-review" | "duplicates" | "importing" | "done";

const STEPS_MANUAL: { key: WizardStep; label: string }[] = [
  { key: "welcome", label: "Start" },
  { key: "format", label: "Format" },
  { key: "upload", label: "Hochladen" },
  { key: "validate", label: "Prüfen" },
  { key: "duplicates", label: "Duplikate" },
  { key: "importing", label: "Import" },
  { key: "done", label: "Fertig" },
];

const STEPS_AI: { key: WizardStep; label: string }[] = [
  { key: "welcome", label: "Start" },
  { key: "format", label: "Format" },
  { key: "upload", label: "Hochladen" },
  { key: "ai-processing", label: "KI-Analyse" },
  { key: "ai-review", label: "Prüfen" },
  { key: "importing", label: "Import" },
  { key: "done", label: "Fertig" },
];

const ACCEPTED_FORMATS = ".csv,.tsv,.txt,.xlsx,.xls,.vcf,.json";

interface ImportWizardProps {
  forceCategory?: ContactCategory;
}

const ImportWizard = ({ forceCategory }: ImportWizardProps) => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProPlus = plan === "pro" || plan === "duo" || plan === "team";

  const [step, setStep] = useState<WizardStep>("welcome");
  const [useAi, setUseAi] = useState(isProPlus);
  const [category, setCategory] = useState<ContactCategory>(forceCategory || "client");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Duplicate state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [newContacts, setNewContacts] = useState<ParsedContact[]>([]);

  // AI state
  const [aiContacts, setAiContacts] = useState<AiProcessedContact[]>([]);
  const [aiSummary, setAiSummary] = useState<AiImportSummary | null>(null);

  const steps = useAi ? STEPS_AI : STEPS_MANUAL;
  const validCount = contacts.filter(c => c.status !== "error").length;
  const errorCount = contacts.filter(c => c.status === "error").length;
  const stepIndex = steps.findIndex(s => s.key === step);

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
        if (useAi) {
          runAiProcessing(parsed);
        } else {
          setStep("validate");
        }
        toast({ title: `${parsed.length} Kontakte erkannt` });
      } catch {
        toast({ title: "Fehler beim Parsen", variant: "destructive" });
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, [useAi]);

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
    if (useAi) {
      runAiProcessing(parsed);
    } else {
      setStep("validate");
    }
    toast({ title: `${parsed.length} Kontakte erkannt` });
  };

  // AI Processing
  const runAiProcessing = async (parsedContacts: ParsedContact[]) => {
    if (!user?.id) return;
    setStep("ai-processing");
    try {
      // Fetch existing contacts for duplicate context
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, full_name, email, phone")
        .eq("provider_id", user.id)
        .limit(200);

      const { data: result, error } = await supabase.functions.invoke("ai-import-agent", {
        body: {
          contacts: parsedContacts.map(c => ({
            id: c.id,
            full_name: c.full_name,
            email: c.email,
            phone: c.phone,
            company_name: c.company_name,
            street: c.street,
            notes: c.notes,
          })),
          existingContacts: existing || [],
        },
      });

      if (error) throw error;

      setAiContacts(result.contacts || []);
      setAiSummary(result.summary || null);
      setStep("ai-review");
    } catch (err: any) {
      console.error("AI processing failed:", err);
      toast({
        title: "KI-Analyse fehlgeschlagen",
        description: "Wechsle zum manuellen Modus.",
        variant: "destructive",
      });
      setUseAi(false);
      setStep("validate");
    }
  };

  // Handle AI review accept
  const handleAiAccept = async (accepted: AiProcessedContact[]) => {
    if (!user?.id) return;
    setStep("importing");
    setImportProgress({ current: 0, total: accepted.length });
    const results: ImportResult[] = [];

    const BATCH = 20;
    for (let i = 0; i < accepted.length; i += BATCH) {
      const batch = accepted.slice(i, i + BATCH);
      const rows = batch.map(c => ({
        provider_id: user.id,
        category: c.suggested_category || category,
        full_name: c.full_name,
        email: c.email || null,
        phone: c.phone || null,
        company_name: c.company_name || null,
        street: c.street || null,
        notes: c.notes || null,
        source: "ai_import",
      }));

      const { error } = await supabase.from("contacts").insert(rows);
      batch.forEach(c => {
        results.push({
          contact: {
            id: c.id,
            full_name: c.full_name,
            email: c.email,
            phone: c.phone,
            company_name: c.company_name,
            street: c.street,
            notes: c.notes,
            status: c.status as any,
            errors: [],
          },
          success: !error,
          error: error?.message,
        });
      });
      setImportProgress({ current: Math.min(i + BATCH, accepted.length), total: accepted.length });
    }

    setImportResults(results);
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    toast({
      title: "Import abgeschlossen",
      description: `${results.filter(r => r.success).length} Kontakte importiert`,
    });
  };

  // Manual flow: check duplicates before import
  const checkAndImport = async () => {
    if (!user?.id) return;
    const toImport = contacts.filter(c => c.status !== "error");

    const { duplicates, newContacts: freshContacts } = await checkDuplicates(toImport, user.id);

    if (duplicates.length > 0) {
      setDuplicateMatches(duplicates);
      setNewContacts(freshContacts);
      setStep("duplicates");
    } else {
      await executeImport(toImport);
    }
  };

  // Resolve duplicates and import
  const handleDuplicateResolve = async (resolved: DuplicateMatch[]) => {
    if (!user?.id) return;

    const toImport: ParsedContact[] = [...newContacts];
    const toUpdate: { id: string; data: Partial<ParsedContact> }[] = [];

    for (const m of resolved) {
      if (m.action === "import") {
        toImport.push(m.importContact);
      } else if (m.action === "update") {
        toUpdate.push({
          id: m.existingContact.id,
          data: {
            full_name: m.importContact.full_name,
            email: m.importContact.email,
            phone: m.importContact.phone,
            company_name: m.importContact.company_name,
            street: m.importContact.street,
          },
        });
      }
      // skip = do nothing
    }

    // Update existing contacts
    for (const u of toUpdate) {
      await supabase.from("contacts").update({
        full_name: u.data.full_name,
        email: u.data.email || null,
        phone: u.data.phone || null,
        company_name: u.data.company_name || null,
        street: u.data.street || null,
      }).eq("id", u.id);
    }

    if (toImport.length > 0) {
      await executeImport(toImport);
    } else {
      const skipped = resolved.filter(m => m.action === "skip").length;
      const updated = toUpdate.length;
      setImportResults([]);
      setStep("done");
      toast({
        title: "Import abgeschlossen",
        description: `${updated} aktualisiert, ${skipped} übersprungen`,
      });
    }
  };

  const executeImport = async (toImport: ParsedContact[]) => {
    if (!user?.id) return;
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
    setDuplicateMatches([]);
    setNewContacts([]);
    setAiContacts([]);
    setAiSummary(null);
    setUseAi(isProPlus);
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
      {steps.map((s, i) => {
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
            {i < steps.length - 1 && (
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
              Ich führe dich Schritt für Schritt durch den Import deiner Kontakte.
            </p>
          </div>

          {/* AI Toggle for Pro+ */}
          {isProPlus && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">KI-Import-Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Automatische Kategorisierung, Bereinigung, Duplikat-Erkennung
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={useAi ? "default" : "outline"}
                  onClick={() => setUseAi(!useAi)}
                  className="gap-1.5"
                >
                  {useAi ? <><Check className="h-3.5 w-3.5" /> Aktiv</> : "Aktivieren"}
                </Button>
              </div>
            </div>
          )}

          {!isProPlus && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm text-foreground">KI-Import-Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Ab Pro-Plan verfügbar – automatische Analyse deiner Importdaten
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Pro</Badge>
              </div>
            </div>
          )}

          {/* Category Selection */}
          {!forceCategory && !useAi && (
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

          {useAi && !forceCategory && (
            <p className="text-xs text-muted-foreground text-center">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Die KI erkennt automatisch die passende Kategorie pro Kontakt.
            </p>
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
            <p className="text-sm text-muted-foreground mt-1">Wähle das passende Format aus.</p>
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
            <Button onClick={() => setStep("upload")} disabled={!selectedFormat} className="flex-1 gap-1.5">
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
                  {useAi ? <><Wand2 className="h-4 w-4" /> KI analysieren</> : <>Kontakte erkennen <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Datei hochladen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ziehe deine Datei hierher oder klicke zum Auswählen.
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
                {useAi ? (
                  <Bot className="h-12 w-12 mx-auto mb-3 text-primary" />
                ) : (
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                )}
                <p className="font-medium text-foreground">Datei hierher ziehen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {useAi ? "KI übernimmt nach dem Upload alles weitere" : "oder klicken zum Auswählen"}
                </p>
              </div>

              <Button variant="outline" onClick={() => setStep("format")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Zurück
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP: AI Processing */}
      {step === "ai-processing" && (
        <div className="space-y-4 py-8">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center h-20 w-20 mb-4">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <Bot className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">KI analysiert deine Daten...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Kategorisierung · Bereinigung · Duplikat-Erkennung
            </p>
          </div>
          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <span className="animate-pulse">⏳ {contacts.length} Kontakte werden analysiert</span>
          </div>
        </div>
      )}

      {/* STEP: AI Review */}
      {step === "ai-review" && aiSummary && (
        <AiImportReview
          processedContacts={aiContacts}
          summary={aiSummary}
          onAccept={handleAiAccept}
          onFallbackManual={() => {
            setUseAi(false);
            setStep("validate");
          }}
        />
      )}

      {/* STEP 4: Manual Validate */}
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
            <Button onClick={checkAndImport} disabled={validCount === 0} className="flex-1 gap-2">
              {validCount} importieren <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Duplicate Resolution */}
      {step === "duplicates" && (
        <ImportDuplicateCheck
          duplicates={duplicateMatches}
          onResolve={handleDuplicateResolve}
          newContacts={newContacts}
        />
      )}

      {/* STEP 5: Importing */}
      {step === "importing" && (
        <div className="space-y-4 py-6">
          <div className="text-center mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Daten werden importiert...</h3>
            <p className="text-sm text-muted-foreground">Bitte Fenster nicht schließen.</p>
          </div>
          <ImportProgressBar current={importProgress.current} total={importProgress.total} phase="importing" />
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

          <ImportProgressBar current={importProgress.total} total={importProgress.total} phase="done" />

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
