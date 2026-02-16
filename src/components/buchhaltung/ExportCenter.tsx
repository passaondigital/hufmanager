import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Database, Loader2, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { downloadDatevExport, downloadSimpleExport } from "@/lib/datevExport";

type ExportRange = "month" | "quarter" | "year" | "custom";

export function ExportCenter() {
  const { user } = useAuth();
  const now = new Date();
  const [range, setRange] = useState<ExportRange>("month");
  const [exporting, setExporting] = useState<string | null>(null);

  // Calculate date range
  let rangeStart: Date, rangeEnd: Date, rangeLabel: string;
  switch (range) {
    case "quarter":
      rangeStart = startOfQuarter(now);
      rangeEnd = endOfQuarter(now);
      rangeLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
      break;
    case "year":
      rangeStart = startOfYear(now);
      rangeEnd = endOfYear(now);
      rangeLabel = String(now.getFullYear());
      break;
    default:
      rangeStart = startOfMonth(now);
      rangeEnd = endOfMonth(now);
      rangeLabel = format(now, "MMMM yyyy", { locale: de });
  }

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["export-invoices", user?.id, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, issue_date, due_date, total_amount, status, notes,
          contacts!invoices_contact_id_fkey(full_name, readable_id),
          horses(name)
        `)
        .eq("provider_id", user!.id)
        .gte("issue_date", startStr)
        .lte("issue_date", endStr)
        .order("issue_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((inv: any) => ({
        ...inv,
        client: inv.contacts,
        horse: inv.horses,
      }));
    },
    enabled: !!user,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["export-expenses", user?.id, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user!.id)
        .gte("expense_date", startStr)
        .lte("expense_date", endStr)
        .order("expense_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleDatevExport = () => {
    setExporting("datev");
    try {
      downloadDatevExport(invoices, user!.id);
      toast.success("DATEV-Export heruntergeladen");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
    setExporting(null);
  };

  const handleCsvExport = () => {
    setExporting("csv");
    try {
      downloadSimpleExport(invoices);
      toast.success("CSV-Export heruntergeladen");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
    setExporting(null);
  };

  const handleExpenseCsvExport = () => {
    setExporting("expenses");
    try {
      const headers = ["Datum", "Kategorie", "Beschreibung", "Betrag (EUR)", "Beleg"];
      const rows = expenses.map((e: any) => [
        format(new Date(e.expense_date), "dd.MM.yyyy"),
        e.category,
        (e.description || "").replace(/[\n\r;]+/g, " "),
        Number(e.amount).toFixed(2).replace(".", ","),
        e.receipt_url ? "Ja" : "Nein",
      ]);
      const csv = [headers.join(";"), ...rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(";"))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ausgaben_${format(rangeStart, "yyyy-MM-dd")}_bis_${format(rangeEnd, "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Ausgaben-Export heruntergeladen");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
    setExporting(null);
  };

  const handleJsonExport = () => {
    setExporting("json");
    try {
      const exportData = {
        meta: {
          exported_at: new Date().toISOString(),
          period: { from: startStr, to: endStr },
          provider_id: user!.id,
        },
        invoices: invoices.map((inv: any) => ({
          number: inv.invoice_number,
          date: inv.issue_date,
          due_date: inv.due_date,
          amount: inv.total_amount,
          tax: inv.tax_amount,
          status: inv.status,
          client: inv.client?.full_name,
          horse: inv.horse?.name,
        })),
        expenses: expenses.map((e: any) => ({
          date: e.expense_date,
          category: e.category,
          description: e.description,
          amount: e.amount,
          has_receipt: !!e.receipt_url,
        })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Buchhaltung_${format(rangeStart, "yyyy-MM-dd")}_${format(rangeEnd, "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("JSON-Export heruntergeladen");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
    setExporting(null);
  };

  const exportFormats = [
    {
      id: "datev",
      title: "DATEV Buchungsstapel",
      description: "Direkter Import in DATEV oder andere Buchhaltungssoftware. GoBD-konform.",
      icon: Database,
      badge: "Empfohlen",
      badgeClass: "bg-primary/10 text-primary",
      action: handleDatevExport,
      count: invoices.length,
      type: "Rechnungen",
    },
    {
      id: "csv",
      title: "Rechnungen CSV",
      description: "Einfaches CSV-Format mit allen Rechnungsdaten. Öffenbar in Excel/Numbers.",
      icon: FileSpreadsheet,
      action: handleCsvExport,
      count: invoices.length,
      type: "Rechnungen",
    },
    {
      id: "expenses",
      title: "Ausgaben CSV",
      description: "Alle Betriebsausgaben als CSV. Ideal für die Übergabe an den Steuerberater.",
      icon: FileSpreadsheet,
      action: handleExpenseCsvExport,
      count: expenses.length,
      type: "Ausgaben",
    },
    {
      id: "json",
      title: "Komplett-Backup (JSON)",
      description: "Vollständiger Export aller Buchungsdaten als strukturiertes JSON für Archivierung.",
      icon: FileText,
      action: handleJsonExport,
      count: invoices.length + expenses.length,
      type: "Gesamt",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Datenexport</h2>
          <p className="text-sm text-muted-foreground">
            Zeitraum: <span className="font-medium text-foreground">{rangeLabel}</span>
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as ExportRange)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Aktueller Monat</SelectItem>
            <SelectItem value="quarter">Aktuelles Quartal</SelectItem>
            <SelectItem value="year">Ganzes Jahr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportFormats.map((fmt) => (
          <Card key={fmt.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <fmt.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{fmt.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmt.count} {fmt.type}
                    </p>
                  </div>
                </div>
                {fmt.badge && (
                  <Badge variant="secondary" className={fmt.badgeClass}>
                    {fmt.badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">{fmt.description}</p>
              <Button
                onClick={fmt.action}
                disabled={!!exporting || fmt.count === 0}
                variant={fmt.badge ? "default" : "outline"}
                className="w-full gap-2"
              >
                {exporting === fmt.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Herunterladen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
