import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  Euro,
  Users,
  Calculator,
  Download,
  PiggyBank,
  Plus,
  Trash2,
  Receipt,
  BarChart3,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

interface PlanCounts {
  starter: number;
  pro: number;
  duo: number;
  team: number;
}

const PLAN_PRICES: Record<keyof PlanCounts, number> = {
  starter: 9.9,
  pro: 29,
  duo: 49,
  team: 79,
};

const PLAN_LABELS: Record<keyof PlanCounts, string> = {
  starter: "Starter (9,90 €)",
  pro: "Pro (29 €)",
  duo: "Duo (49 €)",
  team: "Team (79 €)",
};

const PLAN_COLORS: Record<keyof PlanCounts, string> = {
  starter: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pro: "bg-primary/10 text-primary border-primary/30",
  duo: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  team: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const EXPENSE_CATEGORIES = [
  "Hosting & Infrastruktur",
  "Software & Lizenzen",
  "Marketing",
  "CopeCart Gebühren",
  "Steuerberater",
  "Sonstiges",
];

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string | null;
}

export function AdminRevenue() {
  const [counts, setCounts] = useState<PlanCounts>({ starter: 0, pro: 0, duo: 0, team: 0 });
  const [dbCounts, setDbCounts] = useState<PlanCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Sonstiges", description: "", expense_date: new Date().toISOString().slice(0, 10) });

  // Fetch subscription counts from profiles
  useEffect(() => {
    fetchSubscriptionCounts();
    fetchExpenses();
  }, []);

  const fetchSubscriptionCounts = async () => {
    setLoadingCounts(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .not("deleted_at", "is", null)
        .is("deleted_at", null);

      // Fallback: count all non-deleted profiles with subscription_plan
      const { data: allProfiles, error: err2 } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .is("deleted_at", null);

      if (err2) throw err2;

      const planCounts: PlanCounts = { starter: 0, pro: 0, duo: 0, team: 0 };
      (allProfiles || []).forEach((p: any) => {
        const plan = p.subscription_plan?.toLowerCase();
        if (plan && plan in planCounts) {
          planCounts[plan as keyof PlanCounts]++;
        }
      });

      setDbCounts(planCounts);
      setCounts(planCounts);
    } catch (err) {
      console.error("Error fetching subscription counts:", err);
    } finally {
      setLoadingCounts(false);
    }
  };

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from("admin_expenses")
        .select("id, title, amount, category, expense_date, description")
        .order("expense_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const addExpense = async () => {
    if (!newExpense.title || !newExpense.amount) {
      toast.error("Titel und Betrag sind Pflicht.");
      return;
    }
    try {
      const { error } = await supabase.from("admin_expenses").insert({
        title: newExpense.title,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description || null,
        expense_date: newExpense.expense_date,
      });
      if (error) throw error;
      toast.success("Ausgabe gespeichert");
      setShowExpenseDialog(false);
      setNewExpense({ title: "", amount: "", category: "Sonstiges", description: "", expense_date: new Date().toISOString().slice(0, 10) });
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("admin_expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Ausgabe gelöscht");
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    }
  };

  const totalSubs = Object.values(counts).reduce((a, b) => a + b, 0);
  const monthlyRevenue = Object.entries(counts).reduce(
    (sum, [plan, count]) => sum + count * PLAN_PRICES[plan as keyof PlanCounts], 0
  );
  const yearlyRevenue = monthlyRevenue * 12;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Generate 6-month trend data (simulated based on current data)
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      // Expenses for this month
      const monthExpenses = expenses.filter((e) => {
        const ed = new Date(e.expense_date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).reduce((s, e) => s + e.amount, 0);

      // Revenue estimate: current for last month, scaled for older
      const factor = i === 0 ? 1 : Math.max(0.3, 1 - i * 0.1);
      months.push({
        month: label,
        einnahmen: Math.round(monthlyRevenue * factor * 100) / 100,
        ausgaben: monthExpenses,
        gewinn: Math.round((monthlyRevenue * factor - monthExpenses) * 100) / 100,
      });
    }
    return months;
  }, [monthlyRevenue, expenses]);

  const updateCount = (plan: keyof PlanCounts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts((prev) => ({ ...prev, [plan]: Math.max(0, num) }));
  };

  const exportCSV = () => {
    const rows = [
      ["=== EINNAHMEN ===", "", "", "", ""],
      ["Plan", "Preis/Monat", "Anzahl Abos", "Monatlich", "Jährlich"],
      ...Object.entries(counts).map(([plan, count]) => {
        const price = PLAN_PRICES[plan as keyof PlanCounts];
        return [plan.charAt(0).toUpperCase() + plan.slice(1), `${price.toFixed(2)}`, count.toString(), `${(count * price).toFixed(2)}`, `${(count * price * 12).toFixed(2)}`];
      }),
      ["Gesamt", "", totalSubs.toString(), `${monthlyRevenue.toFixed(2)}`, `${yearlyRevenue.toFixed(2)}`],
      ["", "", "", "", ""],
      ["=== AUSGABEN ===", "", "", "", ""],
      ["Titel", "Kategorie", "Betrag", "Datum", ""],
      ...expenses.map((e) => [e.title, e.category, e.amount.toFixed(2), e.expense_date, ""]),
      ["Gesamt Ausgaben", "", totalExpenses.toFixed(2), "", ""],
      ["", "", "", "", ""],
      ["=== EÜR ===", "", "", "", ""],
      ["Einnahmen (Monat)", "", monthlyRevenue.toFixed(2), "", ""],
      ["Ausgaben (Gesamt)", "", totalExpenses.toFixed(2), "", ""],
      ["Gewinn/Verlust", "", (monthlyRevenue - totalExpenses).toFixed(2), "", ""],
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hufmanager-eur-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary" />
            Einnahmen-Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {loadingCounts ? "Lade Abo-Daten..." : `${totalSubs} aktive Abos aus der Datenbank`} · § 19 UStG
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          CSV/EÜR Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktive Abos</p>
                <p className="text-3xl font-bold">{loadingCounts ? <Loader2 className="w-6 h-6 animate-spin" /> : totalSubs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Euro className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-3xl font-bold">{monthlyRevenue.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ARR</p>
                <p className="text-3xl font-bold">{yearlyRevenue.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ausgaben (ges.)</p>
                <p className="text-3xl font-bold">{totalExpenses.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Calculator className="w-4 h-4" />Übersicht</TabsTrigger>
          <TabsTrigger value="trend" className="gap-2"><BarChart3 className="w-4 h-4" />6-Monats-Trend</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2"><Receipt className="w-4 h-4" />Ausgaben</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Plan Input Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Abo-Anzahl pro Plan
              </CardTitle>
              <CardDescription>
                {dbCounts ? "Automatisch aus der Datenbank geladen. Manuelle Anpassung möglich." : "Trage die aktuelle Anzahl aktiver Abonnements pro Plan ein."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map((plan) => (
                  <div key={plan} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className={PLAN_COLORS[plan]}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{PLAN_PRICES[plan].toFixed(2)} €/Mo.</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={counts[plan]}
                      onChange={(e) => updateCount(plan, e.target.value)}
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      = {(counts[plan] * PLAN_PRICES[plan]).toFixed(2)} €/Mo.
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Table */}
          <Card>
            <CardHeader><CardTitle>Aufschlüsselung</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Preis</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Abos</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Monatlich</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Jährlich</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map((plan) => {
                      const monthly = counts[plan] * PLAN_PRICES[plan];
                      return (
                        <tr key={plan} className="border-b last:border-0">
                          <td className="py-2 px-3"><Badge variant="outline" className={PLAN_COLORS[plan]}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge></td>
                          <td className="py-2 px-3 text-right font-mono">{PLAN_PRICES[plan].toFixed(2)} €</td>
                          <td className="py-2 px-3 text-right font-mono">{counts[plan]}</td>
                          <td className="py-2 px-3 text-right font-mono">{monthly.toFixed(2)} €</td>
                          <td className="py-2 px-3 text-right font-mono">{(monthly * 12).toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td className="py-2 px-3 font-bold">Gesamt</td>
                      <td className="py-2 px-3" />
                      <td className="py-2 px-3 text-right font-bold font-mono">{totalSubs}</td>
                      <td className="py-2 px-3 text-right font-bold font-mono text-primary">{monthlyRevenue.toFixed(2)} €</td>
                      <td className="py-2 px-3 text-right font-bold font-mono text-primary">{yearlyRevenue.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* EÜR Summary */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Einnahmen-Überschuss-Rechnung (EÜR)</CardTitle>
              <CardDescription>Vereinfachte Gewinnermittlung nach § 4 Abs. 3 EStG</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Einnahmen (monatlich)</span>
                  <span className="font-mono font-bold text-emerald-500">+ {monthlyRevenue.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Ausgaben (gesamt erfasst)</span>
                  <span className="font-mono font-bold text-destructive">- {totalExpenses.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-2 text-lg">
                  <span className="font-bold">Gewinn/Verlust</span>
                  <span className={`font-mono font-bold ${monthlyRevenue - totalExpenses >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {(monthlyRevenue - totalExpenses).toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                6-Monats-Trend
              </CardTitle>
              <CardDescription>Einnahmen vs. Ausgaben (ältere Monate geschätzt basierend auf aktuellem MRR)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => `${value.toFixed(2)} €`}
                    />
                    <Legend />
                    <Bar dataKey="einnahmen" name="Einnahmen" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ausgaben" name="Ausgaben" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gewinn-Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => `${value.toFixed(2)} €`}
                    />
                    <Line type="monotone" dataKey="gewinn" name="Gewinn" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ausgaben-Verwaltung</h3>
            <Button onClick={() => setShowExpenseDialog(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Neue Ausgabe
            </Button>
          </div>

          {loadingExpenses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Noch keine Ausgaben erfasst.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Titel</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Kategorie</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Betrag</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Datum</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{e.title}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">{e.category}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-destructive">{e.amount.toFixed(2)} €</td>
                          <td className="py-3 px-4 text-muted-foreground">{new Date(e.expense_date).toLocaleDateString("de-DE")}</td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="icon" onClick={() => deleteExpense(e.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td className="py-3 px-4 font-bold" colSpan={2}>Gesamt</td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-destructive">{totalExpenses.toFixed(2)} €</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Tax Notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">§ 19 UStG – Kleinunternehmerregelung:</strong>{" "}
            Es wird keine Umsatzsteuer erhoben. Alle Preise sind Bruttopreise = Nettopreise.
            CopeCart übernimmt Zahlungsabwicklung & Rechnungsstellung.
          </p>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Ausgabe erfassen</DialogTitle>
            <DialogDescription>Trage eine Betriebsausgabe für die EÜR ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input value={newExpense.title} onChange={(e) => setNewExpense((p) => ({ ...p, title: e.target.value }))} placeholder="z.B. Supabase Pro Plan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (€) *</Label>
                <Input type="number" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))} placeholder="25.00" />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense((p) => ({ ...p, expense_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={newExpense.category} onValueChange={(v) => setNewExpense((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea value={newExpense.description} onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Abbrechen</Button>
            <Button onClick={addExpense}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
