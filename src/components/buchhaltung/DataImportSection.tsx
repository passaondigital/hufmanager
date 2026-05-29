import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Info, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ParsedExpense {
  expense_date: string;
  amount: number;
  category: string;
  description: string;
  valid: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  material: "material",
  wareneinkauf: "material",
  einkauf: "material",
  treibstoff: "treibstoff",
  benzin: "treibstoff",
  diesel: "treibstoff",
  tanken: "treibstoff",
  kfz: "treibstoff",
  fortbildung: "fortbildung",
  seminar: "fortbildung",
  kurs: "fortbildung",
  weiterbildung: "fortbildung",
  werkzeug: "werkzeug",
  ausrüstung: "werkzeug",
  geräte: "werkzeug",
  sonstiges: "sonstiges",
};

function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return "sonstiges";
}

function parseCSV(content: string): ParsedExpense[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Try to detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.replace(/"/g, "").trim().toLowerCase());

  // Find column indices
  const dateIdx = headers.findIndex((h) => h.includes("datum") || h.includes("date"));
  const amountIdx = headers.findIndex((h) => h.includes("betrag") || h.includes("amount") || h.includes("summe"));
  const catIdx = headers.findIndex((h) => h.includes("kategorie") || h.includes("category") || h.includes("art"));
  const descIdx = headers.findIndex((h) => h.includes("beschreibung") || h.includes("description") || h.includes("text") || h.includes("bezeichnung"));

  if (dateIdx === -1 || amountIdx === -1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.replace(/"/g, "").trim());
    try {
      // Parse date (try dd.MM.yyyy and yyyy-MM-dd)
      let dateStr = cols[dateIdx] || "";
      let parsedDate: Date | null = null;

      if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split(".");
        parsedDate = new Date(Number(y), Number(m) - 1, Number(d));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        parsedDate = new Date(dateStr);
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return { expense_date: "", amount: 0, category: "sonstiges", description: dateStr, valid: false, error: "Ungültiges Datum" };
      }

      // Parse amount
      let amountStr = cols[amountIdx] || "0";
      amountStr = amountStr.replace(/[€\s]/g, "").replace(",", ".");
      const amount = Math.abs(parseFloat(amountStr));
      if (isNaN(amount) || amount === 0) {
        return { expense_date: format(parsedDate, "yyyy-MM-dd"), amount: 0, category: "sonstiges", description: "", valid: false, error: "Ungültiger Betrag" };
      }

      const description = catIdx !== -1 && descIdx !== -1 ? cols[descIdx] || "" : cols[descIdx] || cols[catIdx] || "";
      const categoryHint = catIdx !== -1 ? cols[catIdx] || "" : description;
      const category = guessCategory(categoryHint);

      return {
        expense_date: format(parsedDate, "yyyy-MM-dd"),
        amount,
        category,
        description: description.substring(0, 200),
        valid: true,
      };
    } catch {
      return { expense_date: "", amount: 0, category: "sonstiges", description: "", valid: false, error: "Parsefehler" };
    }
  });
}

export function DataImportSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedExpense[] | null>(null);
  const [fileName, setFileName] = useState("");

  const importMutation = useMutation({
    mutationFn: async (expenses: ParsedExpense[]) => {
      const validExpenses = expenses.filter((e) => e.valid);
      const { error } = await supabase.from("expenses").insert(
        validExpenses.map((e) => ({
          user_id: user!.id,
          expense_date: e.expense_date,
          amount: e.amount,
          category: e.category,
          description: e.description || null,
          is_recurring: false,
        }))
      );
      if (error) throw error;
      return validExpenses.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["euer-expenses"] });
      toast.success(`${count} Ausgaben erfolgreich importiert`);
      setParsedData(null);
      setFileName("");
    },
    onError: () => {
      toast.error("Import fehlgeschlagen");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseCSV(content);
      if (parsed.length === 0) {
        toast.error("Keine Daten erkannt. Bitte prüfen Sie das CSV-Format.");
        return;
      }
      setParsedData(parsed);
    };
    reader.readAsText(file, "utf-8");
    // Reset input
    e.target.value = "";
  };

  const validCount = parsedData?.filter((d) => d.valid).length || 0;
  const invalidCount = parsedData?.filter((d) => !d.valid).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Bestehende Daten importieren
        </CardTitle>
        <CardDescription>
          Importieren Sie Ausgaben aus einer CSV-Datei (z.B. aus Excel, DATEV oder anderen Buchhaltungsprogrammen)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy notice */}
        <div className="flex gap-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Ihre importierten Daten werden <strong>ausschließlich in Ihrem Konto</strong> gespeichert. 
            Hufi hat keinen Zugriff auf die importierten Inhalte. Die Datei wird nur lokal 
            in Ihrem Browser verarbeitet und nicht an unsere Server übertragen.
          </p>
        </div>

        {/* Format hint */}
        <div className="p-3 rounded-lg border border-border text-sm space-y-2">
          <p className="font-medium text-foreground">Unterstütztes Format:</p>
          <p className="text-muted-foreground text-xs">
            CSV-Datei mit Semikolon (;) oder Komma (,) als Trennzeichen. 
            Die Datei sollte mindestens folgende Spalten enthalten:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">Datum *</Badge>
            <Badge variant="secondary" className="text-xs">Betrag *</Badge>
            <Badge variant="outline" className="text-xs">Kategorie</Badge>
            <Badge variant="outline" className="text-xs">Beschreibung</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Datumsformate: <code className="bg-muted px-1 rounded">TT.MM.JJJJ</code> oder <code className="bg-muted px-1 rounded">JJJJ-MM-TT</code>
          </p>
        </div>

        {/* File picker */}
        {!parsedData && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="gap-2 w-full border-dashed h-20"
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">CSV-Datei auswählen</p>
                <p className="text-xs text-muted-foreground">Datei wird nur lokal verarbeitet</p>
              </div>
            </Button>
          </div>
        )}

        {/* Preview */}
        {parsedData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setParsedData(null); setFileName(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {validCount} gültig
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} fehlerhaft
                </Badge>
              )}
            </div>

            {/* Sample rows */}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Datum</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Kategorie</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Beschreibung</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Betrag</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((row, i) => (
                    <tr key={i} className={cn("border-t border-border", !row.valid && "bg-destructive/5")}>
                      <td className="p-2 text-foreground">{row.expense_date || "-"}</td>
                      <td className="p-2 text-foreground">{row.category}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[150px]">{row.description || "-"}</td>
                      <td className="p-2 text-right text-foreground">{row.valid ? `${row.amount.toFixed(2)} €` : "-"}</td>
                      <td className="p-2 text-center">
                        {row.valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-destructive text-xs">{row.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 20 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  + {parsedData.length - 20} weitere Zeilen
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => importMutation.mutate(parsedData)}
                disabled={validCount === 0 || importMutation.isPending}
                className="gap-2 flex-1"
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {validCount} Ausgaben importieren
              </Button>
              <Button variant="outline" onClick={() => { setParsedData(null); setFileName(""); }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
