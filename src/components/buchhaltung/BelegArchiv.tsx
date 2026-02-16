import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, FileText, Receipt, Image, CheckCircle2, AlertCircle, Loader2, Shield } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DocType = "all" | "invoice" | "expense";

export function BelegArchiv() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState<DocType>("all");

  // Fetch invoices with receipts
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["archiv-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, total_amount, status, pdf_url")
        .eq("provider_id", user!.id)
        .order("issue_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch expenses with receipts
  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["archiv-expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, description, expense_date, amount, category, receipt_url")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = invLoading || expLoading;

  // Combine into unified document list
  type ArchiveDoc = {
    id: string;
    type: "invoice" | "expense";
    date: string;
    label: string;
    amount: number;
    hasFile: boolean;
    status?: string;
    category?: string;
  };

  const allDocs: ArchiveDoc[] = [
    ...invoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      date: inv.issue_date,
      label: inv.invoice_number || `Rechnung ${inv.id.substring(0, 8)}`,
      amount: Number(inv.total_amount || 0),
      hasFile: !!inv.pdf_url,
      status: inv.status || undefined,
    })),
    ...expenses.map((exp) => ({
      id: exp.id,
      type: "expense" as const,
      date: exp.expense_date,
      label: exp.description || `Ausgabe ${exp.id.substring(0, 8)}`,
      amount: Number(exp.amount || 0),
      hasFile: !!exp.receipt_url,
      category: exp.category,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter
  const filteredDocs = allDocs.filter((doc) => {
    if (docType !== "all" && doc.type !== docType) return false;
    if (search && !doc.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalDocs = allDocs.length;
  const docsWithFiles = allDocs.filter((d) => d.hasFile).length;
  const completionRate = totalDocs > 0 ? Math.round((docsWithFiles / totalDocs) * 100) : 0;

  // GoBD retention: 10 years
  const retentionEnd = new Date().getFullYear() + 10;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Belegarchiv</h2>
        <p className="text-sm text-muted-foreground">
          GoBD-konformes Belegarchiv – Aufbewahrungsfrist bis {retentionEnd}
        </p>
      </div>

      {/* GoBD Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalDocs}</p>
                <p className="text-xs text-muted-foreground">Belege gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{docsWithFiles}</p>
                <p className="text-xs text-muted-foreground">Mit Datei-Nachweis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", completionRate >= 80 ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                <Shield className={cn("h-5 w-5", completionRate >= 80 ? "text-emerald-500" : "text-amber-500")} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                <p className="text-xs text-muted-foreground">GoBD-Vollständigkeit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Beleg suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Belege</SelectItem>
            <SelectItem value="invoice">Rechnungen</SelectItem>
            <SelectItem value="expense">Ausgaben</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Belegübersicht</CardTitle>
          <CardDescription>{filteredDocs.length} Belege</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Keine Belege gefunden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.slice(0, 50).map((doc) => (
                <div
                  key={`${doc.type}-${doc.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "p-1.5 rounded",
                      doc.type === "invoice" ? "bg-primary/10" : "bg-amber-500/10"
                    )}>
                      {doc.type === "invoice" ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <Receipt className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.date), "dd.MM.yyyy")}
                        {doc.category && ` · ${doc.category}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {doc.hasFile ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                      {doc.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        doc.type === "invoice" ? "border-primary/30 text-primary" : "border-amber-500/30 text-amber-500"
                      )}
                    >
                      {doc.type === "invoice" ? "Rechnung" : "Ausgabe"}
                    </Badge>
                  </div>
                </div>
              ))}
              {filteredDocs.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  + {filteredDocs.length - 50} weitere Belege
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
