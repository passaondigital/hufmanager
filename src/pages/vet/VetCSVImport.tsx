import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";

interface CSVRow {
  [key: string]: string;
}

const FIELD_MAPPINGS = {
  horse_name: ["Tiername", "Patient", "Name", "animal_name", "patient_name"],
  chip_number: ["Chipnummer", "Chip", "Mikrochip", "microchip", "chip_number"],
  date: ["Datum", "Behandlungsdatum", "Date", "date", "consultation_date"],
  diagnosis: ["Diagnose", "Befund", "diagnosis", "complaint"],
  treatment: ["Behandlung", "Therapie", "treatment", "treatment_performed"],
  notes: ["Notizen", "Bemerkung", "notes", "comment"],
  medication: ["Medikament", "Arzneimittel", "medication", "drug_name"],
  vaccination: ["Impfung", "Impfstoff", "vaccine", "vaccine_type"],
};

export default function VetCSVImport() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [sourceType, setSourceType] = useState("other");

  if (!user) return <Navigate to="/auth" replace />;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV muss mindestens eine Kopfzeile und eine Datenzeile haben");
        return;
      }

      const delimiter = lines[0].includes(";") ? ";" : ",";
      const hdrs = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(hdrs);

      const rows = lines.slice(1).map((line) => {
        const vals = line.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: CSVRow = {};
        hdrs.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });
      setCsvData(rows);

      // Auto-map
      const autoMappings: Record<string, string> = {};
      Object.entries(FIELD_MAPPINGS).forEach(([field, aliases]) => {
        const match = hdrs.find((h) =>
          aliases.some((a) => h.toLowerCase().includes(a.toLowerCase()))
        );
        if (match) autoMappings[field] = match;
      });
      setMappings(autoMappings);

      toast.success(`${rows.length} Zeilen erkannt`);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;

    try {
      for (const row of csvData) {
        try {
          const horseName = row[mappings.horse_name || ""] || "";
          const diagnosis = row[mappings.diagnosis || ""] || "";
          const treatment = row[mappings.treatment || ""] || "";
          const notes = row[mappings.notes || ""] || "";
          const dateStr = row[mappings.date || ""] || "";

          if (!horseName && !diagnosis) {
            failed++;
            continue;
          }

          // Try to find horse by name or chip
          const chipNumber = row[mappings.chip_number || ""] || "";
          let horseId: string | null = null;

          if (chipNumber) {
            const { data: horse } = await supabase
              .from("horses")
              .select("id")
              .eq("chip_number", chipNumber)
              .limit(1)
              .maybeSingle();
            horseId = horse?.id ?? null;
          }

          if (!horseId && horseName) {
            // Check if we have partner access to a horse with this name
            const { data: access } = await supabase
              .from("horse_partner_access")
              .select("horse_id, horses!horse_partner_access_horse_id_fkey(id, name)")
              .eq("partner_profile_id", user!.id)
              .eq("status", "active");

            const match = access?.find((a: any) => 
              a.horses?.name?.toLowerCase() === horseName.toLowerCase()
            );
            horseId = match?.horse_id ?? null;
          }

          if (!horseId) {
            failed++;
            continue;
          }

          // Insert as treatment note
          await supabase.from("partner_treatment_notes").insert([{
            horse_id: horseId,
            partner_id: user!.id,
            treatment_type: "csv_import",
            description: `Import: ${diagnosis || "Befund"}`,
            findings: [diagnosis, notes].filter(Boolean).join("\n"),
            treatment_performed: treatment || null,
            visible_to_kid: true,
            visible_to_pid: true,
          }] as any);

          // If medication present, also insert
          const medication = row[mappings.medication || ""] || "";
          if (medication) {
            await supabase.from("horse_medications").insert({
              horse_id: horseId,
              prescribed_by: user!.id,
              medication_name: medication,
              source: "csv",
              notes: `CSV-Import aus ${sourceType}`,
            });
          }

          success++;
        } catch {
          failed++;
        }
      }
    } finally {
      setImporting(false);
      setResult({ success, failed });
      if (success > 0) toast.success(`${success} Befunde importiert`);
      if (failed > 0) toast.warning(`${failed} Zeilen konnten nicht zugeordnet werden`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">CSV-Import</h1>
            <p className="text-xs text-muted-foreground">Befunde aus Praxissoftware importieren</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Source Selection */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Quelle der CSV-Datei</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ezyvet">ezyVet Export</SelectItem>
                  <SelectItem value="provet">Provet Cloud Export</SelectItem>
                  <SelectItem value="vetera">Vetera.net Export</SelectItem>
                  <SelectItem value="vet7">VET7.well Export</SelectItem>
                  <SelectItem value="debevet">debevet Export</SelectItem>
                  <SelectItem value="inbehandlung">inBehandlung Export</SelectItem>
                  <SelectItem value="easyvet">easyVET Export</SelectItem>
                  <SelectItem value="other">Andere Software</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSV-Datei hochladen</Label>
              <div
                className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Klicken oder Datei hierher ziehen
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV, max. 10 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mapping */}
        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feld-Zuordnung</CardTitle>
              <p className="text-xs text-muted-foreground">
                {csvData.length} Zeilen erkannt. Ordne die Spalten den HufManager-Feldern zu.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(FIELD_MAPPINGS).map(([field, _]) => (
                <div key={field} className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-sm capitalize">
                    {field.replace("_", " ")}
                    {(field === "horse_name" || field === "diagnosis") && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <Select
                    value={mappings[field] || ""}
                    onValueChange={(v) => setMappings((prev) => ({ ...prev, [field]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Spalte wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">– Nicht zuordnen –</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {/* Preview */}
              {csvData.length > 0 && (
                <div className="mt-4 rounded-lg border overflow-auto max-h-48">
                  <table className="text-xs w-full">
                    <thead className="bg-muted">
                      <tr>
                        {headers.slice(0, 6).map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {headers.slice(0, 6).map((h) => (
                            <td key={h} className="px-2 py-1 truncate max-w-[120px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleImport}
                disabled={importing || !mappings.horse_name}
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importiere...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" /> {csvData.length} Zeilen importieren</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className={result.failed > result.success ? "border-destructive" : "border-green-200"}>
            <CardContent className="p-4 flex items-center gap-4">
              {result.success > result.failed ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">Import abgeschlossen</p>
                <p className="text-xs text-muted-foreground">
                  {result.success} erfolgreich · {result.failed} fehlgeschlagen
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
