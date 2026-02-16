import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function GuV() {
  const { user } = useAuth();
  const now = new Date();

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["guv-expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date, category")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["guv-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, issue_date, status")
        .eq("provider_id", user!.id)
        .in("status", ["paid", "sent"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = expLoading || invLoading;

  const getMonthData = (monthsAgo: number) => {
    const date = subMonths(now, monthsAgo);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthIncome = invoices
      .filter((i) => {
        const d = new Date(i.issue_date);
        return d >= start && d <= end;
      })
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);

    const monthExpenses = expenses
      .filter((e) => {
        const d = new Date(e.expense_date);
        return d >= start && d <= end;
      })
      .reduce((s, e) => s + Number(e.amount), 0);

    return {
      label: format(date, "MMMM yyyy", { locale: de }),
      income: monthIncome,
      expenses: monthExpenses,
      profit: monthIncome - monthExpenses,
    };
  };

  const months = Array.from({ length: 6 }, (_, i) => getMonthData(i));
  const currentMonth = months[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gewinn- & Verlustrechnung</h1>
        <p className="text-muted-foreground">Übersicht deiner Einnahmen und Ausgaben</p>
      </div>

      {/* Current month summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              Einnahmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {currentMonth.income.toFixed(2)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{currentMonth.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Ausgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              -{currentMonth.expenses.toFixed(2)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{currentMonth.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", currentMonth.profit >= 0 ? "text-emerald-600" : "text-destructive")}>
              {currentMonth.profit >= 0 ? "+" : ""}{currentMonth.profit.toFixed(2)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">Indikatives Betriebsergebnis</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monatsverlauf (letzte 6 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {months.map((m) => {
              const maxVal = Math.max(...months.map((mo) => Math.max(mo.income, mo.expenses)), 1);
              return (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground w-36">{m.label}</span>
                    <span className={cn("font-semibold", m.profit >= 0 ? "text-emerald-600" : "text-destructive")}>
                      {m.profit >= 0 ? "+" : ""}{m.profit.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex gap-1 h-4">
                    <div
                      className="bg-emerald-500/80 rounded-sm"
                      style={{ width: `${(m.income / maxVal) * 100}%` }}
                      title={`Einnahmen: ${m.income.toFixed(2)} €`}
                    />
                    <div
                      className="bg-destructive/60 rounded-sm"
                      style={{ width: `${(m.expenses / maxVal) * 100}%` }}
                      title={`Ausgaben: ${m.expenses.toFixed(2)} €`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
              Einnahmen
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-destructive/60" />
              Ausgaben
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
