import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Upload, CheckCircle, AlertTriangle, FileText, RefreshCw,
  Euro, ArrowLeftRight, Download, Search, Calendar, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Bezahlt", draft: "Entwurf", sent: "Gesendet", overdue: "Überfällig", cancelled: "Storniert",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(221, 83%, 53%)", "hsl(271, 91%, 65%)"];

type RevenueLog = {
  id: string;
  event_type: string;
  amount: number;
  plan_name: string | null;
  provider_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  transaction_id: string | null;
  created_at: string;
};

type AdminInvoice = {
  id: string;
  invoice_number: string;
  provider_id: string | null;
  provider_name: string;
  provider_email: string;
  plan: string;
  period_start: string;
  period_end: string;
  total: number;
  status: string | null;
  payment_method: string | null;
  payment_source: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export function AdminCopecartReconciliation() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueLog[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importing, setImporting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: rev }, { data: inv }, { data: prof }] = await Promise.all([
      supabase.from("admin_revenue_log").select("id, event_type, amount, plan_name, provider_id, customer_email, customer_name, transaction_id, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("admin_invoices").select("id, invoice_number, provider_id, provider_name, provider_email, plan, period_start, period_end, total, status, payment_method, payment_source, paid_at, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("id, full_name, email").limit(2000),
    ]);
    setRevenue(rev || []);
    setInvoices(inv || []);
    const map: Record<string, string> = {};
    (prof || []).forEach(p => { map[p.id] = p.full_name || p.email || p.id; });
    setProfiles(map);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Match revenue entries to invoices
  const reconciled = useMemo(() => {
    return revenue.map(r => {
      const month = r.created_at?.slice(0, 7);
      const matchedInvoice = invoices.find(inv =>
        inv.provider_id === r.provider_id &&
        inv.period_start?.slice(0, 7) === month
      );
      return {
        ...r,
        matched: !!matchedInvoice,
        invoiceNumber: matchedInvoice?.invoice_number || null,
        invoiceStatus: matchedInvoice?.status || null,
        invoiceId: matchedInvoice?.id || null,
      };
    });
  }, [revenue, invoices]);

  // Stats
  const stats = useMemo(() => {
    const totalRevenue = revenue.filter(r => ["order_created", "order.created", "purchase", "sale", "payment_completed", "subscription_payment_succeeded"].includes(r.event_type)).reduce((s, r) => s + (r.amount || 0), 0);
    const matched = reconciled.filter(r => r.matched).length;
    const unmatched = reconciled.filter(r => !r.matched && r.amount > 0).length;
    const invoicePaid = invoices.filter(i => i.status === "paid").length;
    const invoiceOpen = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").length;

    // By plan
    const planBreakdown: Record<string, number> = {};
    revenue.forEach(r => {
      if (r.plan_name && r.amount > 0) {
        planBreakdown[r.plan_name] = (planBreakdown[r.plan_name] || 0) + r.amount;
      }
    });

    // Monthly
    const monthlyMap: Record<string, { revenue: number; invoiced: number }> = {};
    revenue.forEach(r => {
      const m = r.created_at?.slice(0, 7);
      if (!m) return;
      if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, invoiced: 0 };
      if (r.amount > 0) monthlyMap[m].revenue += r.amount;
    });
    invoices.forEach(inv => {
      const m = inv.period_start?.slice(0, 7);
      if (!m) return;
      if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, invoiced: 0 };
      monthlyMap[m].invoiced += inv.total;
    });
    const monthly = Object.entries(monthlyMap).sort().slice(-12).map(([m, v]) => ({ month: m, ...v }));

    return { totalRevenue, matched, unmatched, invoicePaid, invoiceOpen, planBreakdown, monthly };
  }, [revenue, invoices, reconciled]);

  // Create missing invoices for unmatched revenue
  const createMissingInvoices = async () => {
    const unmatched = reconciled.filter(r => !r.matched && r.amount > 0 && r.provider_id);
    if (unmatched.length === 0) { toast.info("Alle Einnahmen sind bereits zugeordnet"); return; }

    let created = 0;
    for (const r of unmatched) {
      const d = new Date(r.created_at);
      const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
      const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const dueDate = new Date(d.getFullYear(), d.getMonth(), 15).toISOString().split("T")[0];

      // Check if already exists
      const existing = invoices.find(i => i.provider_id === r.provider_id && i.period_start === periodStart);
      if (existing) continue;

      const { error } = await supabase.from("admin_invoices").insert({
        invoice_number: "",
        provider_id: r.provider_id,
        provider_name: profiles[r.provider_id!] || r.customer_name || "Unbekannt",
        provider_email: r.customer_email || "",
        plan: r.plan_name || "pro",
        period_start: periodStart,
        period_end: periodEnd,
        subtotal: r.amount,
        total: r.amount,
        kleinunternehmer: true,
        payment_method: "copecart",
        payment_source: "reconciliation",
        status: "paid",
        paid_at: r.created_at,
        due_date: dueDate,
      });
      if (!error) created++;
    }
    toast.success(`${created} Rechnungen erstellt`);
    fetchAll();
  };

  // CSV Import
  const handleCsvImport = async () => {
    if (!csvData.trim()) { toast.error("Keine Daten eingefügt"); return; }
    setImporting(true);
    try {
      const lines = csvData.trim().split("\n");
      const header = lines[0].split(/[,;\t]/);
      let created = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/);
        if (cols.length < 3) continue;

        // Try to map CSV columns: email, amount, date, plan, transaction_id
        const emailIdx = header.findIndex(h => /email/i.test(h));
        const amountIdx = header.findIndex(h => /amount|betrag|price|preis/i.test(h));
        const dateIdx = header.findIndex(h => /date|datum|created/i.test(h));
        const planIdx = header.findIndex(h => /plan|product|produkt/i.test(h));
        const txIdx = header.findIndex(h => /transaction|order|bestellung/i.test(h));

        const email = emailIdx >= 0 ? cols[emailIdx]?.trim().toLowerCase() : "";
        const amount = amountIdx >= 0 ? parseFloat(cols[amountIdx]?.replace(",", ".") || "0") : 0;
        const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : new Date().toISOString();
        const plan = planIdx >= 0 ? cols[planIdx]?.trim().toLowerCase() : "pro";
        const txId = txIdx >= 0 ? cols[txIdx]?.trim() : null;

        if (!email || !amount) continue;

        // Find provider by email
        const { data: prof } = await supabase.from("profiles").select("id, full_name, readable_id").eq("email", email).maybeSingle();

        // Log to revenue_log
        await supabase.from("admin_revenue_log").insert({
          event_type: "csv_import",
          amount,
          currency: "EUR",
          plan_name: plan,
          provider_id: prof?.id || null,
          customer_email: email,
          transaction_id: txId,
        });

        // Create admin_invoice
        if (prof?.id) {
          const d = new Date(date);
          const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
          const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

          await supabase.from("admin_invoices").insert({
            invoice_number: "",
            provider_id: prof.id,
            provider_pid: prof.readable_id || null,
            provider_name: prof.full_name || email,
            provider_email: email,
            plan,
            period_start: periodStart,
            period_end: periodEnd,
            subtotal: amount,
            total: amount,
            kleinunternehmer: true,
            payment_method: "copecart",
            payment_source: "csv_import",
            status: "paid",
            paid_at: date,
            due_date: periodStart,
          });
          created++;
        }
      }
      toast.success(`${created} Rechnungen aus CSV importiert`);
      setCsvOpen(false);
      setCsvData("");
      fetchAll();
    } catch (e: any) {
      toast.error("Import-Fehler: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    let list = reconciled;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.customer_email || "").includes(q) || (r.customer_name || "").includes(q) || (r.plan_name || "").includes(q) || (r.invoiceNumber || "").includes(q));
    }
    if (statusFilter === "matched") list = list.filter(r => r.matched);
    if (statusFilter === "unmatched") list = list.filter(r => !r.matched && r.amount > 0);
    return list;
  }, [reconciled, search, statusFilter]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">CopeCart Umsatz</p>
          <p className="text-xl font-bold">{stats.totalRevenue.toFixed(2)} €</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Zugeordnet</p>
          <p className="text-xl font-bold text-emerald-400">{stats.matched}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Nicht zugeordnet</p>
          <p className="text-xl font-bold text-amber-400">{stats.unmatched}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Rechnungen bezahlt</p>
          <p className="text-xl font-bold text-emerald-400">{stats.invoicePaid}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Rechnungen offen</p>
          <p className="text-xl font-bold text-amber-400">{stats.invoiceOpen}</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monatlicher Abgleich</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="revenue" name="CopeCart" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="invoiced" name="Rechnungen" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nach Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={Object.entries(stats.planBreakdown).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value.toFixed(0)}€`}>
                  {Object.keys(stats.planBreakdown).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setCsvOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />CSV Import (rückwirkend)
        </Button>
        <Button variant="outline" onClick={createMissingInvoices}>
          <ArrowLeftRight className="w-4 h-4 mr-2" />Fehlende Rechnungen erstellen
        </Button>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-2" />Aktualisieren
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="matched">Zugeordnet</SelectItem>
            <SelectItem value="unmatched">Nicht zugeordnet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />CopeCart ↔ Rechnungen ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Datum</TableHead>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Betrag</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs">Rechnung</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.created_at ? format(parseISO(r.created_at), "dd.MM.yy HH:mm", { locale: de }) : "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{r.provider_id ? (profiles[r.provider_id] || r.customer_email) : r.customer_email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.plan_name || "—"}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.amount?.toFixed(2)} €</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.event_type}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.matched ? (
                        <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" />{r.invoiceNumber}</span>
                      ) : r.amount > 0 ? (
                        <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" />fehlt</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.invoiceStatus && <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[r.invoiceStatus] || ""}`}>{STATUS_LABELS[r.invoiceStatus] || r.invoiceStatus}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Einträge</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CopeCart CSV Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Exportiere deine CopeCart-Transaktionen als CSV und füge sie hier ein. Erkannte Spalten: <code>email</code>, <code>amount/betrag</code>, <code>date/datum</code>, <code>plan/product</code>, <code>transaction/order</code></p>
            <Textarea rows={12} placeholder={"email;betrag;datum;plan;order_id\nmax@example.com;29.00;2026-01-15;pro;TX123"} value={csvData} onChange={e => setCsvData(e.target.value)} className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCsvImport} disabled={importing}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Importieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
