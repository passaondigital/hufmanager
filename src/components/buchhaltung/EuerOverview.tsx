import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EÜR_CATEGORIES = {
  einnahmen: [
    { key: "leistungen", label: "Betriebseinnahmen (Leistungen)" },
    { key: "sonstige_einnahmen", label: "Sonstige betriebliche Einnahmen" },
  ],
  ausgaben: [
    { key: "material", label: "Wareneinkauf / Material" },
    { key: "treibstoff", label: "Kfz-Kosten / Treibstoff" },
    { key: "fortbildung", label: "Fortbildungskosten" },
    { key: "werkzeug", label: "Werkzeuge & Geräte" },
    { key: "versicherung", label: "Versicherungen" },
    { key: "telefon", label: "Telefon & Internet" },
    { key: "reisekosten", label: "Reisekosten" },
    { key: "sonstiges", label: "Sonstige betriebliche Ausgaben" },
  ],
};

const EXPENSE_TO_EÜR: Record<string, string> = {
  material: "material",
  treibstoff: "treibstoff",
  fortbildung: "fortbildung",
  werkzeug: "werkzeug",
  sonstiges: "sonstiges",
};

export function EuerOverview() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const year = parseInt(selectedYear);

  const yearStart = format(startOfYear(new Date(year, 0)), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(new Date(year, 0)), "yyyy-MM-dd");

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["euer-invoices", user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, issue_date, status")
        .eq("provider_id", user!.id)
        .gte("issue_date", yearStart)
        .lte("issue_date", yearEnd)
        .in("status", ["paid", "sent"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["euer-expenses", user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date, category")
        .eq("user_id", user!.id)
        .gte("expense_date", yearStart)
        .lte("expense_date", yearEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = invLoading || expLoading;

  const totalIncome = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const profit = totalIncome - totalExpenses;

  // Group expenses by EÜR category
  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = EXPENSE_TO_EÜR[e.category] || "sonstiges";
    acc[cat] = (acc[cat] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Einnahmen-Überschuss-Rechnung
          </h2>
          <p className="text-sm text-muted-foreground">
            Gemäß § 4 Abs. 3 EStG (Ist-Versteuerung)
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              Betriebseinnahmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{fmtCurrency(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{invoices.length} Rechnungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Betriebsausgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{fmtCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} Buchungen</p>
          </CardContent>
        </Card>

        <Card className={cn("border-2", profit >= 0 ? "border-emerald-500/30" : "border-destructive/30")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {profit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Gewinn / Verlust
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
              {fmtCurrency(profit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Vorläufiges Ergebnis {year}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed EÜR Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Aufstellung nach § 4 Abs. 3 EStG</CardTitle>
          <CardDescription>Steuerjahr {year}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Einnahmen */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Betriebseinnahmen
            </h3>
            <div className="space-y-2 ml-5">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-foreground">Einnahmen aus Leistungen</span>
                <span className="font-medium text-foreground">{fmtCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between py-2 font-semibold text-emerald-600">
                <span>Summe Betriebseinnahmen</span>
                <span>{fmtCurrency(totalIncome)}</span>
              </div>
            </div>
          </div>

          {/* Ausgaben */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              Betriebsausgaben
            </h3>
            <div className="space-y-2 ml-5">
              {EÜR_CATEGORIES.ausgaben.map((cat) => {
                const amount = expensesByCategory[cat.key] || 0;
                if (amount === 0) return null;
                return (
                  <div key={cat.key} className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-foreground">{cat.label}</span>
                    <span className="font-medium text-foreground">{fmtCurrency(amount)}</span>
                  </div>
                );
              })}
              {totalExpenses === 0 && (
                <p className="text-sm text-muted-foreground py-2">Keine Ausgaben erfasst</p>
              )}
              <div className="flex justify-between py-2 font-semibold text-destructive">
                <span>Summe Betriebsausgaben</span>
                <span>{fmtCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Ergebnis */}
          <div className={cn("p-4 rounded-lg", profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10")}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground text-lg">
                {profit >= 0 ? "Gewinn" : "Verlust"} (vorläufig)
              </span>
              <span className={cn("font-bold text-xl", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
                {fmtCurrency(Math.abs(profit))}
              </span>
            </div>
          </div>

          {/* Legal notice */}
          <div className="flex gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-xs">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Diese Übersicht dient als Hilfe für die Einnahmen-Überschuss-Rechnung gemäß § 4 Abs. 3 EStG.
              Sie ersetzt keine steuerliche Beratung. Bitte konsultieren Sie Ihren Steuerberater für die
              endgültige Steuererklärung.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
