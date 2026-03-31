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
  TrendingUp, Euro, Users, Calculator, Download, PiggyBank, Plus, Trash2, Receipt,
  BarChart3, Loader2, Upload, RefreshCw, CheckCircle, AlertTriangle, Search, Banknote, Scale,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isDemoEmail } from "@/lib/demo-accounts";
import { normalizeToMonthlyMRR } from "@/lib/plan-features";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";

// ── Plan Config ──
const PLAN_PRICES: Record<string, number> = { starter: 9.9, pro: 29, duo: 49, team: 79 };
const PLAN_LABELS: Record<string, string> = { starter: "Starter (9,90 €)", pro: "Pro (29 €)", duo: "Duo (49 €)", team: "Team (79 €)" };
const PLAN_COLORS_BADGE: Record<string, string> = {
  starter: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pro: "bg-primary/10 text-primary border-primary/30",
  duo: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  team: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};
const PIE_COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(221, 83%, 53%)", "hsl(271, 91%, 65%)"];

const EXPENSE_CATEGORIES = [
  "Hosting & Infrastruktur", "Software & Lizenzen", "Marketing", "CopeCart Gebühren",
  "Steuerberater", "Personal", "Büro & Arbeitsmittel", "Versicherungen", "Sonstiges",
];

interface Expense {
  id: string; title: string; amount: number; category: string;
  expense_date: string; description: string | null; receipt_url: string | null;
}
interface RevenueLogEntry {
  id: string; event_type: string; amount: number; currency: string;
  customer_name: string | null; customer_email: string | null;
  plan_name: string | null; transaction_id: string | null; created_at: string;
}

// Verified revenue data
interface VerifiedRevenueData {
  verifiedMRR: number;
  verifiedARR: number;
  payingProviders: number;
  annualContracts: { name: string; pid: string; amount: number; monthlyEquiv: number; validUntil: string }[];
  monthlySubscribers: { name: string; pid: string; amount: number; plan: string }[];
}

// Provider segmentation
interface ProviderSegment {
  totalProviders: number;
  payingProviders: number;
  trialProviders: number;
  expiredProviders: number;
  lifetimeProviders: number;
  totalClients: number;
  totalPartners: number;
  totalEmployees: number;
  planBreakdown: Record<string, number>; // only paying providers
}

export function AdminRevenue() {
  const [verified, setVerified] = useState<VerifiedRevenueData>({ verifiedMRR: 0, verifiedARR: 0, payingProviders: 0, annualContracts: [], monthlySubscribers: [] });
  const [segment, setSegment] = useState<ProviderSegment>({ totalProviders: 0, payingProviders: 0, trialProviders: 0, expiredProviders: 0, lifetimeProviders: 0, totalClients: 0, totalPartners: 0, totalEmployees: 0, planBreakdown: {} });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenueLog, setRevenueLog] = useState<RevenueLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingRevLog, setLoadingRevLog] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Sonstiges", description: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchVerifiedRevenue();
    fetchProviderSegments();
    fetchExpenses();
    fetchRevenueLog();
  };

  // ── QUELLE DER WAHRHEIT: admin_provider_payments ──
  const fetchVerifiedRevenue = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Quelle A: Manuelle Zahlungen (verifiziert)
      const { data: payments } = await supabase
        .from("admin_provider_payments")
        .select("amount, provider_id, period_start, period_end, plan_name, payment_method")
        .lte("period_start", todayStr)
        .gte("period_end", todayStr);

      // Get provider profiles to filter
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, readable_id, plan_override, subscription_plan, access_valid_until")
        .is("deleted_at", null);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Strict filtering: only real providers (PID-*), no demo, no lifetime, no admin
      const validPayments = (payments || []).filter(p => {
        const profile = profileMap.get(p.provider_id);
        if (!profile) return false;
        if (isDemoEmail(profile.email)) return false;
        if (profile.plan_override === "lifetime_grant" || profile.plan_override === "employee") return false;
        // Must be a provider (PID prefix)
        if (profile.readable_id && !profile.readable_id.startsWith("PID-")) return false;
        return true;
      });

      const annualContracts: VerifiedRevenueData["annualContracts"] = [];
      const monthlySubscribers: VerifiedRevenueData["monthlySubscribers"] = [];
      let verifiedMRR = 0;

      validPayments.forEach(p => {
        const profile = profileMap.get(p.provider_id)!;
        const monthlyEquiv = normalizeToMonthlyMRR(p.amount || 0, p.period_start ?? null, p.period_end ?? null);
        verifiedMRR += monthlyEquiv;

        const start = p.period_start ? new Date(p.period_start) : null;
        const end = p.period_end ? new Date(p.period_end) : null;
        const diffDays = start && end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) : 0;

        if (diffDays > 60) {
          annualContracts.push({
            name: profile.full_name || "Unbekannt",
            pid: profile.readable_id || profile.id.slice(0, 8),
            amount: p.amount || 0,
            monthlyEquiv: Math.round(monthlyEquiv * 100) / 100,
            validUntil: p.period_end || "",
          });
        } else {
          monthlySubscribers.push({
            name: profile.full_name || "Unbekannt",
            pid: profile.readable_id || profile.id.slice(0, 8),
            amount: p.amount || 0,
            plan: p.plan_name || profile.subscription_plan || "unknown",
          });
        }
      });

      // ARR = monthly subs × 12 + annual contract values
      const monthlySubTotal = monthlySubscribers.reduce((s, m) => s + m.amount, 0);
      const annualTotal = annualContracts.reduce((s, a) => s + a.amount, 0);
      const verifiedARR = (monthlySubTotal * 12) + annualTotal;

      setVerified({
        verifiedMRR: Math.round(verifiedMRR * 100) / 100,
        verifiedARR: Math.round(verifiedARR * 100) / 100,
        payingProviders: new Set(validPayments.map(p => p.provider_id)).size,
        annualContracts,
        monthlySubscribers,
      });
    } catch (err) {
      console.error("Error fetching verified revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Provider/Client/Partner segmentation ──
  const fetchProviderSegments = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, readable_id, subscription_plan, plan_override, account_status")
        .is("deleted_at", null);

      const all = (profiles || []).filter(p => !isDemoEmail(p.email));
      const now = new Date();

      // Segment by readable_id prefix
      const providers = all.filter(p => p.readable_id?.startsWith("PID-"));
      const clients = all.filter(p => p.readable_id?.startsWith("KID-"));
      const partners = all.filter(p => p.readable_id?.startsWith("PRID-"));
      const employees = all.filter(p => p.readable_id?.startsWith("EID-"));

      const lifetimeProviders = providers.filter(p => p.plan_override === "lifetime_grant").length;
      const trialProviders = providers.filter(p =>
        p.plan_override !== "lifetime_grant" && p.plan_override !== "employee" &&
        (p.account_status === "trial")
      ).length;
      const expiredProviders = providers.filter(p =>
        p.plan_override !== "lifetime_grant" && p.plan_override !== "employee" &&
        p.account_status === "expired"
      ).length;

      // Plan breakdown for providers only (excluding lifetime/demo)
      const planBreakdown: Record<string, number> = {};
      providers.forEach(p => {
        if (p.plan_override === "lifetime_grant" || p.plan_override === "employee") return;
        const plan = p.subscription_plan || "starter";
        planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
      });

      setSegment({
        totalProviders: providers.length,
        payingProviders: 0, // will be set from verified data
        trialProviders,
        expiredProviders,
        lifetimeProviders,
        totalClients: clients.length,
        totalPartners: partners.length,
        totalEmployees: employees.length,
        planBreakdown,
      });
    } catch (err) {
      console.error("Error fetching segments:", err);
    }
  };

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from("admin_expenses")
        .select("id, title, amount, category, expense_date, description, receipt_url")
        .order("expense_date", { ascending: false }).limit(500);
      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (err) { console.error(err); } finally { setLoadingExpenses(false); }
  };

  const fetchRevenueLog = async () => {
    setLoadingRevLog(true);
    try {
      const { data, error } = await supabase
        .from("admin_revenue_log")
        .select("id, event_type, amount, currency, customer_name, customer_email, plan_name, transaction_id, created_at")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      setRevenueLog((data || []) as RevenueLogEntry[]);
    } catch (err) { console.error(err); } finally { setLoadingRevLog(false); }
  };

  // ── CRUD ──
  const addExpense = async () => {
    if (!newExpense.title || !newExpense.amount) { toast.error("Titel und Betrag sind Pflicht."); return; }
    try {
      const { error } = await supabase.from("admin_expenses").insert({
        title: newExpense.title, amount: parseFloat(newExpense.amount),
        category: newExpense.category, description: newExpense.description || null,
        expense_date: newExpense.expense_date,
      });
      if (error) throw error;
      toast.success("Ausgabe gespeichert");
      setShowExpenseDialog(false);
      setNewExpense({ title: "", amount: "", category: "Sonstiges", description: "", expense_date: new Date().toISOString().slice(0, 10) });
      fetchExpenses();
    } catch (err: any) { toast.error(err.message || "Fehler"); }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("admin_expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Ausgabe gelöscht"); fetchExpenses();
    } catch (err: any) { toast.error(err.message || "Fehler"); }
  };

  // ── Computed ──
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const selectedMonthStart = startOfMonth(parseISO(selectedMonth + "-01"));
  const selectedMonthEnd = endOfMonth(selectedMonthStart);

  const monthlyExpenses = useMemo(() =>
    expenses.filter(e => isWithinInterval(parseISO(e.expense_date), { start: selectedMonthStart, end: selectedMonthEnd })),
    [expenses, selectedMonth]
  );

  const expenseByCat = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = !expenseSearch || e.title.toLowerCase().includes(expenseSearch.toLowerCase()) || e.description?.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchCat = expenseCategoryFilter === "all" || e.category === expenseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  // CopeCart stats from webhook log
  const copecartStats = useMemo(() => {
    const payments = revenueLog.filter(r => r.event_type === "payment" || r.event_type === "subscription_payment");
    const refunds = revenueLog.filter(r => r.event_type === "refund" || r.event_type === "chargeback");
    const totalWebhookRevenue = payments.reduce((s, r) => s + r.amount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);
    return { totalPayments: payments.length, totalWebhookRevenue, totalRefunds, netRevenue: totalWebhookRevenue - totalRefunds, refundCount: refunds.length, lastEvent: revenueLog[0]?.created_at || null };
  }, [revenueLog]);

  // Verified total revenue = manual payments + copecart webhooks
  const verifiedTotalRevenue = verified.verifiedARR + copecartStats.netRevenue;

  // 6-month trend (only verified data)
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const label = format(d, "MMM yy", { locale: de });

      const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.expense_date), { start: mStart, end: mEnd })).reduce((s, e) => s + e.amount, 0);
      const monthWebhookPayments = revenueLog.filter(r => {
        const rd = parseISO(r.created_at);
        return isWithinInterval(rd, { start: mStart, end: mEnd }) && (r.event_type === "payment" || r.event_type === "subscription_payment");
      }).reduce((s, r) => s + r.amount, 0);

      months.push({
        month: label,
        einnahmen: Math.round(monthWebhookPayments * 100) / 100,
        ausgaben: monthExpenses,
        gewinn: Math.round((monthWebhookPayments - monthExpenses) * 100) / 100,
      });
    }
    return months;
  }, [expenses, revenueLog]);

  // ── Exports ──
  const exportCSV = () => {
    const rows = [
      ["=== HufManager Finanz-Export (verifiziert) ===", "", "", "", format(new Date(), "dd.MM.yyyy HH:mm")],
      [""],
      ["=== VERIFIZIERTE EINNAHMEN ==="],
      ["MRR (verifiziert)", `${verified.verifiedMRR.toFixed(2)} €`],
      ["ARR (verifiziert)", `${verified.verifiedARR.toFixed(2)} €`],
      ["Zahlende Provider", verified.payingProviders.toString()],
      [""],
      ["=== JAHRESVERTRÄGE ==="],
      ["Name", "PID", "Betrag", "Monatlich", "Gültig bis"],
      ...verified.annualContracts.map(c => [c.name, c.pid, `${c.amount.toFixed(2)}`, `${c.monthlyEquiv.toFixed(2)}`, c.validUntil]),
      [""],
      ["=== MONATSABOS ==="],
      ["Name", "PID", "Betrag", "Plan"],
      ...verified.monthlySubscribers.map(m => [m.name, m.pid, `${m.amount.toFixed(2)}`, m.plan]),
      [""],
      ["=== COPECART WEBHOOK-LOG ==="],
      ["Datum", "Typ", "Betrag", "Kunde", "Transaktion"],
      ...revenueLog.map(r => [format(parseISO(r.created_at), "dd.MM.yyyy HH:mm"), r.event_type, r.amount.toFixed(2), r.customer_name || r.customer_email || "-", r.transaction_id || "-"]),
      [""],
      ["=== AUSGABEN ==="],
      ["Titel", "Kategorie", "Betrag", "Datum", "Beschreibung"],
      ...expenses.map(e => [e.title, e.category, e.amount.toFixed(2), e.expense_date, e.description || ""]),
      ["Gesamt Ausgaben", "", totalExpenses.toFixed(2)],
      [""],
      ["=== EÜR ==="],
      ["Einnahmen (verifiziert)", `${verifiedTotalRevenue.toFixed(2)} €`],
      ["Ausgaben", `${totalExpenses.toFixed(2)} €`],
      ["Gewinn/Verlust", `${(verifiedTotalRevenue - totalExpenses).toFixed(2)} €`],
      [""],
      ["§ 19 UStG – Keine USt. Alle Beträge brutto = netto."],
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hufmanager-finanzbericht-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { exportDate: new Date().toISOString(), verified, segment, copecartStats, revenueLog, expenses, trendData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hufmanager-finanzdaten-${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleExpenseImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) { toast.error("CSV muss Kopfzeile + Daten enthalten"); return; }
        const sep = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
        const titleIdx = headers.findIndex(h => h.includes("titel") || h.includes("title"));
        const amountIdx = headers.findIndex(h => h.includes("betrag") || h.includes("amount"));
        const dateIdx = headers.findIndex(h => h.includes("datum") || h.includes("date"));
        const catIdx = headers.findIndex(h => h.includes("kategorie") || h.includes("category"));
        if (titleIdx === -1 || amountIdx === -1) { toast.error("CSV muss 'Titel' und 'Betrag' enthalten"); return; }
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
          if (!cols[titleIdx] || !cols[amountIdx]) continue;
          rows.push({ title: cols[titleIdx], amount: parseFloat(cols[amountIdx].replace(",", ".")) || 0, expense_date: dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().slice(0, 10), category: catIdx >= 0 && cols[catIdx] ? cols[catIdx] : "Sonstiges" });
        }
        if (rows.length === 0) { toast.error("Keine gültigen Zeilen"); return; }
        const { error } = await supabase.from("admin_expenses").insert(rows);
        if (error) throw error;
        toast.success(`${rows.length} Ausgaben importiert`); fetchExpenses();
      } catch (err: any) { toast.error(err.message || "Import fehlgeschlagen"); }
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
            Nur verifizierte Zahlungen · § 19 UStG
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="w-4 h-4" />Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2">
            <Download className="w-4 h-4" />JSON
          </Button>
        </div>
      </div>

      {/* ═══ ZEILE 1: Verifizierte Zahlen ═══ */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Verifizierte Einnahmen</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Quelle: Zahlungserfassung</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">MRR (verifiziert)</p>
              <p className="text-2xl font-bold text-primary">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${verified.verifiedMRR.toFixed(2)} €`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR (verifiziert)</p>
              <p className="text-2xl font-bold text-primary">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${verified.verifiedARR.toFixed(2)} €`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Zahlende Provider</p>
              <p className="text-2xl font-bold">{verified.payingProviders}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jahresverträge aktiv</p>
              <p className="text-2xl font-bold">{verified.annualContracts.length}</p>
              <p className="text-[10px] text-muted-foreground">
                Wert: {verified.annualContracts.reduce((s, a) => s + a.amount, 0).toFixed(0)} €
              </p>
            </div>
          </div>

          {/* Annual contract details */}
          {!loading && verified.annualContracts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Jahresverträge:</p>
              {verified.annualContracts.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>{c.name} <span className="text-muted-foreground">({c.pid})</span></span>
                  <span className="font-mono">{c.amount.toFixed(0)} €/Jahr = <span className="text-primary">{c.monthlyEquiv.toFixed(2)} €/Mo.</span> · bis {c.validUntil ? format(parseISO(c.validUntil), "dd.MM.yyyy") : "–"}</span>
                </div>
              ))}
            </div>
          )}
          {!loading && verified.monthlySubscribers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Monatsabos:</p>
              {verified.monthlySubscribers.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>{m.name} <span className="text-muted-foreground">({m.pid})</span></span>
                  <span className="font-mono">{m.amount.toFixed(2)} €/Mo. · {m.plan}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/50 mt-2">Demo-, Lifetime-, Admin- und Client-Accounts ausgeschlossen. Nur PID-Provider mit erfasster Zahlung.</p>
        </CardContent>
      </Card>

      {/* ═══ ZEILE 2: Geschätzte / Account-Statistiken ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Provider gesamt</p>
            <p className="text-2xl font-bold">{segment.totalProviders}</p>
            <p className="text-[10px] text-muted-foreground">davon {segment.lifetimeProviders} Lifetime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trial (Provider)</p>
            <p className="text-2xl font-bold text-amber-500">{segment.trialProviders}</p>
            <p className="text-[10px] text-muted-foreground">Keine Zahlung</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expired (Provider)</p>
            <p className="text-2xl font-bold text-muted-foreground">{segment.expiredProviders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pferdebesitzer</p>
            <p className="text-2xl font-bold">{segment.totalClients}</p>
            <p className="text-[10px] text-muted-foreground">Immer kostenlos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Partner</p>
            <p className="text-2xl font-bold">{segment.totalPartners}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CopeCart netto</p>
            <p className="text-2xl font-bold">{copecartStats.netRevenue.toFixed(0)} €</p>
            <p className="text-[10px] text-muted-foreground">{copecartStats.totalPayments} Events</p>
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

        {/* ── Overview Tab: Provider Plan Distribution (only providers) ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Provider-Plan-Verteilung
                </CardTitle>
                <CardDescription>Nur PID-Provider (ohne Lifetime/Demo)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Accounts</TableHead>
                      <TableHead className="text-right">Potenzial/Mo.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(segment.planBreakdown).sort(([a], [b]) => a.localeCompare(b)).map(([plan, count]) => (
                      <TableRow key={plan}>
                        <TableCell>
                          <Badge variant="outline" className={PLAN_COLORS_BADGE[plan] || ""}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{count}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {((PLAN_PRICES[plan] || 0) * count).toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Potenzial-Werte sind theoretisch. Nur Einträge aus der Zahlungserfassung zählen als verifizierter MRR.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Role segmentation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nutzer-Segmentierung</CardTitle>
                <CardDescription>Alle Rollen (ohne Demo/Test)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rolle</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead className="text-right">MRR-relevant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Provider</Badge></TableCell>
                      <TableCell className="text-right font-mono">{segment.totalProviders}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{verified.payingProviders} zahlend</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">Pferdebesitzer</Badge></TableCell>
                      <TableCell className="text-right font-mono">{segment.totalClients}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">Immer kostenlos</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">Partner</Badge></TableCell>
                      <TableCell className="text-right font-mono">{segment.totalPartners}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">Separat</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="outline">Mitarbeiter</Badge></TableCell>
                      <TableCell className="text-right font-mono">{segment.totalEmployees}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">Separat</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CopeCart Tab ── */}
        <TabsContent value="copecart" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-xs text-muted-foreground">Zahlungen</p><p className="text-2xl font-bold">{copecartStats.totalPayments}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-xs text-muted-foreground">Brutto</p><p className="text-2xl font-bold text-emerald-500">{copecartStats.totalWebhookRevenue.toFixed(2)} €</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-xs text-muted-foreground">Erstattungen</p><p className="text-2xl font-bold text-destructive">{copecartStats.totalRefunds.toFixed(2)} €</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-xs text-muted-foreground">Netto</p><p className="text-2xl font-bold text-primary">{copecartStats.netRevenue.toFixed(2)} €</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Transaktionslog</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loadingRevLog ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : revenueLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Noch keine CopeCart-Events erfasst.</div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Typ</TableHead><TableHead>Kunde</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Betrag</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {revenueLog.slice(0, 100).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-mono">{format(parseISO(r.created_at), "dd.MM.yy HH:mm")}</TableCell>
                          <TableCell><Badge variant={r.event_type.includes("refund") ? "destructive" : "default"} className="text-xs">{r.event_type}</Badge></TableCell>
                          <TableCell className="text-xs">{r.customer_name || r.customer_email || "-"}</TableCell>
                          <TableCell className="text-xs">{r.plan_name || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{r.amount.toFixed(2)} €</TableCell>
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
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />6-Monats-Trend</CardTitle>
              <CardDescription>Nur verifizierte Einnahmen (CopeCart Webhooks)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => `${value.toFixed(2)} €`} />
                    <Legend />
                    <Bar dataKey="einnahmen" name="Einnahmen" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ausgaben" name="Ausgaben" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Gewinn-Verlauf</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" /><YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => `${value.toFixed(2)} €`} />
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
                <Input placeholder="Ausgaben durchsuchen..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="pl-10 h-10" />
              </div>
              <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Kategorie" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Alle Kategorien</SelectItem>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleExpenseImport} />
                <Button variant="outline" size="sm" className="gap-2" asChild><span><Upload className="w-4 h-4" />CSV Import</span></Button>
              </label>
              <Button onClick={() => setShowExpenseDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" />Neue Ausgabe</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                        <TableHeader><TableRow><TableHead>Titel</TableHead><TableHead>Kategorie</TableHead><TableHead className="text-right">Betrag</TableHead><TableHead>Datum</TableHead><TableHead /></TableRow></TableHeader>
                        <TableBody>
                          {filteredExpenses.map(e => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium text-sm">{e.title}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{e.category}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-destructive text-sm">{e.amount.toFixed(2)} €</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString("de-DE")}</TableCell>
                              <TableCell><Button variant="ghost" size="icon" onClick={() => deleteExpense(e.id)} className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
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
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Nach Kategorie</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCat} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ value }) => `${value.toFixed(0)}€`}>
                        {expenseByCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── EÜR Tab (nur verifizierte Zahlen) ── */}
        <TabsContent value="euer" className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5" />EÜR (verifiziert)</CardTitle>
              <CardDescription>Nur erfasste Zahlungen · § 4 Abs. 3 EStG · § 19 UStG</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Betriebseinnahmen</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b text-sm">
                    <span>Manuelle Zahlungen (Jahresverträge)</span>
                    <span className="font-mono font-bold text-emerald-500">+ {verified.annualContracts.reduce((s, a) => s + a.amount, 0).toFixed(2)} €</span>
                  </div>
                  {verified.annualContracts.map((c, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs text-muted-foreground pl-4">
                      <span>{c.name} ({c.pid})</span>
                      <span className="font-mono">{c.amount.toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b text-sm">
                    <span>Monatsabos (erfasst)</span>
                    <span className="font-mono font-bold text-emerald-500">+ {verified.monthlySubscribers.reduce((s, m) => s + m.amount, 0).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-2 border-b text-sm">
                    <span>CopeCart Netto-Einnahmen (Webhooks)</span>
                    <span className="font-mono font-bold text-emerald-500">+ {copecartStats.netRevenue.toFixed(2)} €</span>
                  </div>
                  {copecartStats.totalRefunds > 0 && (
                    <div className="flex justify-between py-1 text-xs text-muted-foreground pl-4">
                      <span>davon Erstattungen</span>
                      <span className="font-mono text-destructive">- {copecartStats.totalRefunds.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t font-medium text-sm">
                    <span>Summe Betriebseinnahmen</span>
                    <span className="font-mono font-bold text-emerald-500">+ {verifiedTotalRevenue.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <Separator />

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

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Gewinn / Verlust</span>
                  <span className={`font-mono font-bold text-xl ${verifiedTotalRevenue - totalExpenses >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {(verifiedTotalRevenue - totalExpenses).toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Basierend auf verifizierten Zahlungen ({verifiedTotalRevenue.toFixed(2)} €) minus erfasste Ausgaben ({totalExpenses.toFixed(2)} €).
                  Keine theoretischen MRR-Hochrechnungen enthalten.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">§ 19 UStG – Kleinunternehmerregelung:</strong>{" "}
                Keine USt. Alle Beträge brutto = netto. Diese EÜR basiert ausschließlich auf erfassten Zahlungen und Webhooks — keine Schätzwerte.
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
            <div className="space-y-2"><Label>Titel *</Label><Input value={newExpense.title} onChange={e => setNewExpense(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Supabase Pro Plan" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Betrag (€) *</Label><Input type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="25.00" /></div>
              <div className="space-y-2"><Label>Datum</Label><Input type="date" value={newExpense.expense_date} onChange={e => setNewExpense(p => ({ ...p, expense_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Beschreibung (optional)</Label><Textarea value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
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
