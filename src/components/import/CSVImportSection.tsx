import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Upload,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";

type ContactCategory = "client" | "partner" | "supplier" | "lead";

interface ParsedRow {
  full_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  notes?: string;
}

const CSVImportSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<ContactCategory>("client");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const contactsToInsert = parsedData.map((row) => ({
        provider_id: user.id,
        category,
        full_name: row.full_name,
        email: row.email || null,
        phone: row.phone || null,
        company_name: row.company_name || null,
        notes: row.notes || null,
        source: "csv_import",
      }));

      const { error } = await supabase
        .from("contacts")
        .insert(contactsToInsert);

      if (error) throw error;
      return contactsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ 
        title: "Import erfolgreich", 
        description: `${count} Kontakte als ${getCategoryLabel(category)} importiert` 
      });
      setParsedData([]);
      setFileName("");
    },
    onError: () => {
      toast({ 
        title: "Fehler", 
        description: "Kontakte konnten nicht importiert werden", 
        variant: "destructive" 
      });
    },
  });

  const getCategoryLabel = (cat: ContactCategory) => {
    switch (cat) {
      case "client": return "Kunden";
      case "partner": return "Partner";
      case "supplier": return "Lieferanten";
      case "lead": return "Interessenten";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        setParsedData(rows);
        toast({ title: `${rows.length} Zeilen erkannt` });
      } catch (error) {
        toast({
          title: "Fehler beim Parsen",
          description: "Bitte prüfe das CSV-Format",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(/[,;]/).map((h) => h.trim().replace(/"/g, ""));

    // Find column indices
    const nameIdx = headers.findIndex((h) => 
      h.includes("name") || h.includes("vorname") || h.includes("nachname")
    );
    const emailIdx = headers.findIndex((h) => h.includes("mail"));
    const phoneIdx = headers.findIndex((h) => 
      h.includes("tel") || h.includes("phone") || h.includes("handy") || h.includes("mobil")
    );
    const companyIdx = headers.findIndex((h) => 
      h.includes("firma") || h.includes("company") || h.includes("unternehmen")
    );
    const notesIdx = headers.findIndex((h) => 
      h.includes("notiz") || h.includes("note") || h.includes("bemerkung")
    );

    // Parse rows
    return lines.slice(1).map((line) => {
      const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ""));
      return {
        full_name: cols[nameIdx] || cols[0] || "Unbekannt",
        email: emailIdx >= 0 ? cols[emailIdx] : undefined,
        phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
        company_name: companyIdx >= 0 ? cols[companyIdx] : undefined,
        notes: notesIdx >= 0 ? cols[notesIdx] : undefined,
      };
    }).filter((row) => row.full_name && row.full_name !== "Unbekannt");
  };

  const downloadTemplate = () => {
    const template = "Name,Email,Telefon,Firma,Notizen\nMax Mustermann,max@example.com,0123456789,Musterfirma,Beispiel-Notiz";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kontakte-vorlage.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          CSV/Excel Import
        </CardTitle>
        <CardDescription>
          Importiere eine große Anzahl von Kontakten aus einer CSV-Datei.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Diese Liste importieren als:</label>
          <Select value={category} onValueChange={(v) => setCategory(v as ContactCategory)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Kunden
                </div>
              </SelectItem>
              <SelectItem value="partner">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Partner (Tierarzt/Schmied)
                </div>
              </SelectItem>
              <SelectItem value="supplier">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Lieferanten
                </div>
              </SelectItem>
              <SelectItem value="lead">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  Interessenten
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              CSV-Datei auswählen
            </Button>

            <Button variant="ghost" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Vorlage herunterladen
            </Button>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span>{fileName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setParsedData([]);
                  setFileName("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{parsedData.length} Kontakte erkannt</h4>
              <Badge>{getCategoryLabel(category)}</Badge>
            </div>

            <div className="rounded-lg border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Firma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell>{row.email || "-"}</TableCell>
                      <TableCell>{row.phone || "-"}</TableCell>
                      <TableCell>{row.company_name || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        ... und {parsedData.length - 10} weitere
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? "Importiere..." : `${parsedData.length} Kontakte importieren`}
            </Button>
          </div>
        )}

        {/* Format Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Unterstützte Formate:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
            <li>CSV-Dateien mit Komma oder Semikolon als Trennzeichen</li>
            <li>Erste Zeile als Header (Name, Email, Telefon, Firma, Notizen)</li>
            <li>Excel-Export als CSV speichern</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVImportSection;
