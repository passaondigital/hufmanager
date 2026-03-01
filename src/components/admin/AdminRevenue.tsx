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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
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
  Upload,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Calendar,
  Banknote,
  Scale,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";

// ── Plan Config (single source of truth) ──
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

const PLAN_COLORS_BADGE: Record<keyof PlanCounts, string> = {
  starter: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pro: "bg-primary/10 text-primary border-primary/30",
  duo: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  team: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(221, 83%, 53%)", "hsl(271, 91%, 65%)"];

const EXPENSE_CATEGORIES = [
  "Hosting & Infrastruktur",
  "Software & Lizenzen",
  "Marketing",
  "CopeCart Gebühren",
  "Steuerberater",
  "Personal",
  "Büro & Arbeitsmittel",
  "Versicherungen",
  "Sonstiges",
];

// ── Types ──
interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
}

interface RevenueLogEntry {
  id: string;
  event_type: string;
  amount: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  plan_name: string | null;
  transaction_id: string | null;
  created_at: string;
}

// ── Component ──
export function AdminRevenue() {
  const [counts, setCounts] = useState<PlanCounts>({ starter: 0, pro: 0, duo: 0, team: 0 });
  const [dbCounts, setDbCounts] = useState<PlanCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [revenueLog, setRevenueLog] = useState<RevenueLogEntry[]>([]);
  const [loadingRevLog, setLoadingRevLog] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Sonstiges", description: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  useEffect(() => {
    fetchSubscriptionCounts();
    fetchExpenses();
    fetchRevenueLog();
  }, []);

  // ── Data Fetching ──
  const fetchSubscriptionCounts = async () => {
    setLoadingCounts(true);
    try {
      // Count providers per plan from profiles
      const { data: allProfiles, error } = await supabase
        .from("profiles")
        .select("subscription_plan, plan_override")
        .is("deleted_at", null);
      if (error) throw error;

      const planCounts: PlanCounts = { starter: 0, pro: 0, duo: 0, team: 0 };
      
      // Map overrides and subscription_plan to the 4-tier model
      const OVERRIDE_MAP: Record<string, keyof PlanCounts> = {
        copecart_starter: "starter",
        copecart_pro: "pro",
        copecart_duo: "duo",
        copecart_team: "team",
        copecart_anfaenger: "starter",
        copecart_fortgeschritten: "pro",
        copecart_profi: "duo",
      };

      (allProfiles || []).forEach((p: any) => {
        let plan: keyof PlanCounts | null = null;
        
        if (p.plan_override && OVERRIDE_MAP[p.plan_override]) {
          plan = OVERRIDE_MAP[p.plan_override];
        } else if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") {
          plan = "team";
        } else if (p.subscription_plan) {
          const sp = p.subscription_plan.toLowerCase();
          if (sp in planCounts) plan = sp as keyof PlanCounts;
        }
        
        if (plan) planCounts[plan]++;
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
        .select("id, title, amount, category, expense_date, description, receipt_url")
        .order("expense_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchRevenueLog = async () => {
    setLoadingRevLog(true);
    try {
      const { data, error } = await supabase
        .from("admin_revenue_log")
        .select("id, event_type, amount, currency, customer_name, customer_email, plan_name, transaction_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setRevenueLog((data || []) as RevenueLogEntry[]);
    } catch (err) {
      console.error("Error fetching revenue log:", err);
    } finally {
      setLoadingRevLog(false);
    }
  };

  // ── CRUD ──
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

  // ── Computed Data ──
  const totalSubs = Object.values(counts).reduce((a, b) => a + b, 0);
  const monthlyRevenue = Object.entries(counts).reduce(
    (sum, [plan, count]) => sum + count * PLAN_PRICES[plan as keyof PlanCounts], 0
  );
  const yearlyRevenue = monthlyRevenue * 12;

  // Monthly expenses for selected month
  const selectedMonthStart = startOfMonth(parseISO(selectedMonth + "-01"));
  const selectedMonthEnd = endOfMonth(selectedMonthStart);

  const monthlyExpenses = useMemo(() => 
    expenses.filter(e => {
      const d = parseISO(e.expense_date);
      return isWithinInterval(d, { start: selectedMonthStart, end: selectedMonthEnd });
    }), [expenses, selectedMonth]
  );

  const totalMonthlyExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Expenses by category for pie chart
  const expenseByCat = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = !expenseSearch || e.title.toLowerCase().includes(expenseSearch.toLowerCase()) || e.description?.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchCat = expenseCategoryFilter === "all" || e.category === expenseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  // CopeCart reconciliation: compare webhook log vs expected
  const copecartStats = useMemo(() => {
    const payments = revenueLog.filter(r => r.event_type === "payment" || r.event_type === "subscription_payment");
    const refunds = revenueLog.filter(r => r.event_type === "refund" || r.event_type === "chargeback");
    const totalWebhookRevenue = payments.reduce((s, r) => s + r.amount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);
    return {
      totalPayments: payments.length,
      totalWebhookRevenue,
      totalRefunds,
      netRevenue: totalWebhookRevenue - totalRefunds,
      refundCount: refunds.length,
      lastEvent: revenueLog[0]?.created_at || null,
    };
  }, [revenueLog]);

  // 6-month trend with REAL data from revenue_log + expenses
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const label = format(d, "MMM yy", { locale: de });

      const monthExpenses = expenses.filter(e => {
        const ed = parseISO(e.expense_date);
        return isWithinInterval(ed, { start: mStart, end: mEnd });
      }).reduce((s, e) => s + e.amount, 0);

      const monthPayments = revenueLog.filter(r => {
        const rd = parseISO(r.created_at);
        return isWithinInterval(rd, { start: mStart, end: mEnd }) && (r.event_type === "payment" || r.event_type === "subscription_payment");
      }).reduce((s, r) => s + r.amount, 0);

      // Only show real data - no estimates
      const einnahmen = monthPayments;

      months.push({
        month: label,
        einnahmen: Math.round(einnahmen * 100) / 100,
        ausgaben: monthExpenses,
        gewinn: Math.round((einnahmen - monthExpenses) * 100) / 100,
      });
    }
    return months;
  }, [monthlyRevenue, expenses, revenueLog]);

  const updateCount = (plan: keyof PlanCounts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [plan]: Math.max(0, num) }));
  };

  // ── Exports ──
  const exportCSV = () => {
    const rows = [
      ["=== HufManager Finanz-Export ===", "", "", "", format(new Date(), "dd.MM.yyyy HH:mm")],
      [""],
      ["=== EINNAHMEN (Abo-basiert) ===", "", "", "", ""],
      ["Plan", "Preis/Monat", "Anzahl Abos", "Monatlich", "Jährlich"],
      ...Object.entries(counts).map(([plan, count]) => {
        const price = PLAN_PRICES[plan as keyof PlanCounts];
        return [plan.charAt(0).toUpperCase() + plan.slice(1), `${price.toFixed(2)}`, count.toString(), `${(count * price).toFixed(2)}`, `${(count * price * 12).toFixed(2)}`];
      }),
      ["Gesamt", "", totalSubs.toString(), `${monthlyRevenue.toFixed(2)}`, `${yearlyRevenue.toFixed(2)}`],
      [""],
      ["=== COPECART WEBHOOK-LOG ===", "", "", "", ""],
      ["Datum", "Typ", "Betrag", "Kunde", "Transaktion"],
      ...revenueLog.map(r => [
        format(parseISO(r.created_at), "dd.MM.yyyy HH:mm"),
        r.event_type,
        r.amount.toFixed(2),
        r.customer_name || r.customer_email || "-",
        r.transaction_id || "-",
      ]),
      [""],
      ["=== AUSGABEN ===", "", "", "", ""],
      ["Titel", "Kategorie", "Betrag", "Datum", "Beschreibung"],
      ...expenses.map(e => [e.title, e.category, e.amount.toFixed(2), e.expense_date, e.description || ""]),
      ["Gesamt Ausgaben", "", totalExpenses.toFixed(2), "", ""],
      [""],
      ["=== EÜR (Vereinfacht) ===", "", "", "", ""],
      ["Einnahmen (CopeCart netto)", "", copecartStats.netRevenue.toFixed(2), "", ""],
      ["Einnahmen (MRR-basiert/Monat)", "", monthlyRevenue.toFixed(2), "", ""],
      ["Ausgaben (Gesamt)", "", totalExpenses.toFixed(2), "", ""],
      ["Gewinn/Verlust (MRR - Ausgaben)", "", (monthlyRevenue - totalExpenses).toFixed(2), "", ""],
      [""],
      ["Hinweis: § 19 UStG – Keine USt. Alle Beträge brutto = netto.", "", "", "", ""],
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hufmanager-finanzbericht-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      planCounts: counts,
      mrr: monthlyRevenue,
      arr: yearlyRevenue,
      copecartStats,
      revenueLog,
      expenses,
      trendData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hufmanager-finanzdaten-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV Import ──
  const handleExpenseImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) {
          toast.error("CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten");
          return;
        }
        
        // Parse header
        const sep = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
        
        const titleIdx = headers.findIndex(h => h.includes("titel") || h.includes("title") || h.includes("bezeichnung"));
        const amountIdx = headers.findIndex(h => h.includes("betrag") || h.includes("amount") || h.includes("summe"));
        const dateIdx = headers.findIndex(h => h.includes("datum") || h.includes("date"));
        const catIdx = headers.findIndex(h => h.includes("kategorie") || h.includes("category"));
        
        if (titleIdx === -1 || amountIdx === -1) {
          toast.error("CSV muss 'Titel' und 'Betrag' Spalten enthalten");
          return;
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
          if (!cols[titleIdx] || !cols[amountIdx]) continue;
          
          rows.push({
            title: cols[titleIdx],
            amount: parseFloat(cols[amountIdx].replace(",", ".")) || 0,
            expense_date: dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10),
            category: catIdx >= 0 && cols[catIdx] ? cols[catIdx] : "Sonstiges",
          });
        }

        if (rows.length === 0) {
          toast.error("Keine gültigen Zeilen gefunden");
          return;
        }

        const { error } = await supabase.from("admin_expenses").insert(rows);
        if (error) throw error;
        
        toast.success(`${rows.length} Ausgaben importiert`);
        fetchExpenses();
      } catch (err: any) {
        toast.error(err.message || "Import fehlgeschlagen");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary" />
            Finanz-Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {loadingCounts ? "Lade Abo-Daten..." : `${totalSubs} aktive Abos`} · § 19 UStG · CopeCart-Reconciliation
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { fetchSubscriptionCounts(); fetchExpenses(); fetchRevenueLog(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2">
            <Download className="w-4 h-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Abos</p>
                <p className="text-2xl font-bold">{loadingCounts ? <Loader2 className="w-5 h-5 animate-spin" /> : totalSubs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Euro className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold">{monthlyRevenue.toFixed(0)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ARR</p>
                <p className="text-2xl font-bold">{yearlyRevenue.toFixed(0)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ausgaben</p>
                <p className="text-2xl font-bold">{totalExpenses.toFixed(0)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CopeCart netto</p>
                <p className="text-2xl font-bold">{copecartStats.netRevenue.toFixed(0)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm"><Calculator className="w-4 h-4" />Übersicht</TabsTrigger>
            <TabsTrigger value="copecart" className="gap-2 text-xs sm:text-sm"><Banknote className="w-4 h-4" />CopeCart</TabsTrigger>
            <TabsTrigger value="trend" className="gap-2 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" />Trend</TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2 text-xs sm:text-sm"><Receipt className="w-4 h-4" />Ausgaben</TabsTrigger>
            <TabsTrigger value="euer" className="gap-2 text-xs sm:text-sm"><Scale className="w-4 h-4" />EÜR</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plan Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Abo-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map(plan => (
                    <div key={plan} className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className={PLAN_COLORS_BADGE[plan]}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </Badge>
                        <span className="text-muted-foreground">{PLAN_PRICES[plan].toFixed(2)} €</span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={counts[plan]}
                        onChange={e => updateCount(plan, e.target.value)}
                        className="text-center font-mono h-10"
                      />
                      <p className="text-[10px] text-muted-foreground text-center">
                        = {(counts[plan] * PLAN_PRICES[plan]).toFixed(2)} €/Mo.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Plan-Verteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {Object.keys(counts).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead className="text-right">Abos</TableHead>
                    <TableHead className="text-right">Monatlich</TableHead>
                    <TableHead className="text-right">Jährlich</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map(plan => {
                    const monthly = counts[plan] * PLAN_PRICES[plan];
                    return (
                      <TableRow key={plan}>
                        <TableCell><Badge variant="outline" className={PLAN_COLORS_BADGE[plan]}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{PLAN_PRICES[plan].toFixed(2)} €</TableCell>
                        <TableCell className="text-right font-mono">{counts[plan]}</TableCell>
                        <TableCell className="text-right font-mono">{monthly.toFixed(2)} €</TableCell>
                        <TableCell className="text-right font-mono">{(monthly * 12).toFixed(2)} €</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-between px-4 py-3 border-t font-bold">
                <span>Gesamt</span>
                <div className="flex gap-8">
                  <span className="font-mono">{totalSubs} Abos</span>
                  <span className="font-mono text-primary">{monthlyRevenue.toFixed(2)} €/Mo.</span>
                  <span className="font-mono text-primary">{yearlyRevenue.toFixed(2)} €/Jahr</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CopeCart Reconciliation Tab ── */}
        <TabsContent value="copecart" className="space-y-4">
          {/* Reconciliation KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground">Zahlungen</p>
                <p className="text-2xl font-bold">{copecartStats.totalPayments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground">Brutto-Einnahmen</p>
                <p className="text-2xl font-bold text-emerald-500">{copecartStats.totalWebhookRevenue.toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground">Erstattungen</p>
                <p className="text-2xl font-bold text-destructive">{copecartStats.totalRefunds.toFixed(2)} €</p>
                <p className="text-[10px] text-muted-foreground">{copecartStats.refundCount} Stück</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground">Netto</p>
                <p className="text-2xl font-bold text-primary">{copecartStats.netRevenue.toFixed(2)} €</p>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Check */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Abgleich: MRR vs. CopeCart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Erwarteter MRR (Abo-basiert)</span>
                  <span className="font-mono font-bold">{monthlyRevenue.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">CopeCart Netto-Einnahmen (gesamt)</span>
                  <span className="font-mono font-bold">{copecartStats.netRevenue.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Letztes Webhook-Event</span>
                  <span className="font-mono text-xs">
                    {copecartStats.lastEvent ? format(parseISO(copecartStats.lastEvent), "dd.MM.yyyy HH:mm") : "Kein Event"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transaktionslog</CardTitle>
              <CardDescription>Alle CopeCart Webhook-Events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRevLog ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : revenueLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Noch keine CopeCart-Events erfasst.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Transaktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueLog.slice(0, 100).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-mono">{format(parseISO(r.created_at), "dd.MM.yy HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant={r.event_type.includes("refund") || r.event_type.includes("chargeback") ? "destructive" : "default"} className="text-xs">
                              {r.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.customer_name || r.customer_email || "-"}</TableCell>
                          <TableCell className="text-xs">{r.plan_name || "-"}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${r.event_type.includes("refund") ? "text-destructive" : ""}`}>
                            {r.event_type.includes("refund") ? "-" : ""}{r.amount.toFixed(2)} €
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{r.transaction_id?.slice(0, 12) || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trend Tab ── */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                6-Monats-Trend
              </CardTitle>
              <CardDescription>Einnahmen vs. Ausgaben (ältere Monate ggf. geschätzt)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gewinn-Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
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

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ausgaben durchsuchen..."
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleExpenseImport} />
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <span><Upload className="w-4 h-4" />CSV Import</span>
                </Button>
              </label>
              <Button onClick={() => setShowExpenseDialog(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Neue Ausgabe
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Expenses Table */}
            <div className="lg:col-span-2">
              {loadingExpenses ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : filteredExpenses.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Ausgaben gefunden.</CardContent></Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Titel</TableHead>
                            <TableHead>Kategorie</TableHead>
                            <TableHead className="text-right">Betrag</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.map(e => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium text-sm">{e.title}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{e.category}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-destructive text-sm">{e.amount.toFixed(2)} €</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString("de-DE")}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => deleteExpense(e.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between px-4 py-3 border-t font-bold text-sm">
                      <span>{filteredExpenses.length} Einträge</span>
                      <span className="font-mono text-destructive">{filteredExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} €</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Expense Categories Pie */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nach Kategorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCat}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${value.toFixed(0)}€`}
                      >
                        {expenseByCat.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {expenseByCat.map((cat, i) => (
                    <div key={cat.name} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{cat.name}</span>
                      <span className="font-mono">{cat.value.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── EÜR Tab ── */}
        <TabsContent value="euer" className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Einnahmen-Überschuss-Rechnung (EÜR)
              </CardTitle>
              <CardDescription>Vereinfachte Gewinnermittlung nach § 4 Abs. 3 EStG · Kleinunternehmerregelung § 19 UStG</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Section */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Betriebseinnahmen</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b text-sm">
                    <span>Abo-Einnahmen (MRR × 12)</span>
                    <span className="font-mono font-bold text-emerald-500">+ {yearlyRevenue.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-2 border-b text-sm">
                    <span>CopeCart Netto-Einnahmen (Webhook-Log)</span>
                    <span className="font-mono font-bold text-emerald-500">+ {copecartStats.netRevenue.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-2 border-b text-sm text-muted-foreground">
                    <span>davon Erstattungen</span>
                    <span className="font-mono text-destructive">- {copecartStats.totalRefunds.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Expenses Section */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Betriebsausgaben</h4>
                <div className="space-y-2">
                  {expenseByCat.map(cat => (
                    <div key={cat.name} className="flex justify-between py-1.5 text-sm">
                      <span className="text-muted-foreground">{cat.name}</span>
                      <span className="font-mono text-destructive">- {cat.value.toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t font-medium text-sm">
                    <span>Summe Betriebsausgaben</span>
                    <span className="font-mono text-destructive">- {totalExpenses.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Result */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Gewinn / Verlust</span>
                  <span className={`font-mono font-bold text-xl ${copecartStats.netRevenue - totalExpenses >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {(copecartStats.netRevenue - totalExpenses).toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Basierend auf CopeCart Netto-Einnahmen ({copecartStats.netRevenue.toFixed(2)} €) minus erfasste Ausgaben ({totalExpenses.toFixed(2)} €).
                  MRR-basierte Hochrechnung: {(monthlyRevenue * 12 - totalExpenses).toFixed(2)} €/Jahr.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Notice */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">§ 19 UStG – Kleinunternehmerregelung:</strong>{" "}
                Es wird keine Umsatzsteuer erhoben. Alle Preise sind Bruttopreise = Nettopreise.
                CopeCart übernimmt Zahlungsabwicklung & Rechnungsstellung an Endkunden.
                Diese EÜR dient als Hilfestellung – für steuerliche Pflichten ist ein Steuerberater heranzuziehen.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Input value={newExpense.title} onChange={e => setNewExpense(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Supabase Pro Plan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (€) *</Label>
                <Input type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="25.00" />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={newExpense.expense_date} onChange={e => setNewExpense(p => ({ ...p, expense_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} rows={2} />
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