import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Euro, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { isDemoEmail } from "@/lib/demo-accounts";
import { normalizeToMonthlyMRR } from "@/lib/plan-features";

interface Payment {
  id: string;
  provider_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  plan_name: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
}

interface Provider {
  id: string;
  email: string | null;
  full_name: string | null;
}

export function AdminManualPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    provider_id: "",
    amount: "",
    payment_method: "bank_transfer",
    payment_date: new Date().toISOString().slice(0, 10),
    plan_name: "pro",
    period_start: new Date().toISOString().slice(0, 10),
    period_end: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments
      const { data: payData } = await supabase
        .from("admin_provider_payments")
        .select("id, provider_id, amount, payment_method, payment_date, plan_name, period_start, period_end, notes, created_at")
        .order("payment_date", { ascending: false })
        .limit(200);
      setPayments((payData || []) as Payment[]);

      // Fetch real providers (exclude demo)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");
      const ids = roles?.map(r => r.user_id) || [];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", ids)
          .is("deleted_at", null);
        setProviders((profs || []).filter(p => !isDemoEmail(p.email)) as Provider[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.provider_id || !form.amount) {
      toast.error("Provider und Betrag sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("admin_provider_payments").insert({
        provider_id: form.provider_id,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        plan_name: form.plan_name || null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success("Zahlung erfasst");
      setShowDialog(false);
      setForm({ provider_id: "", amount: "", payment_method: "bank_transfer", payment_date: new Date().toISOString().slice(0, 10), plan_name: "pro", period_start: new Date().toISOString().slice(0, 10), period_end: "", notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const getProviderName = (id: string) => {
    const p = providers.find(p => p.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  // MRR calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const activePayments = payments.filter(p => p.period_start && p.period_end && p.period_start <= todayStr && p.period_end >= todayStr);
  const mrr = activePayments.reduce((s, p) => s + normalizeToMonthlyMRR(p.amount, p.period_start, p.period_end), 0);
  const payingCount = new Set(activePayments.map(p => p.provider_id)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Zahlungserfassung
          </h2>
          <p className="text-sm text-muted-foreground">Manuelle Zahlungen von Providern erfassen und verwalten</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Zahlung erfassen
        </Button>
      </div>

      {/* MRR Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <Euro className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-bold mt-2">€{mrr.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">MRR (verifiziert)</p>
        </Card>
        <Card className="p-4">
          <Euro className="w-5 h-5 text-green-500" />
          <p className="text-2xl font-bold mt-2">€{(mrr * 12).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">ARR (verifiziert)</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold mt-2">{payingCount}</p>
          <p className="text-xs text-muted-foreground">Zahlende Provider</p>
        </Card>
      </div>
      <p className="text-[10px] text-muted-foreground/50">
        ⚠️ Nur manuell erfasste Zahlungen eingerechnet. {payments.length} Einträge gesamt.
      </p>

      {/* Payments Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Notiz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Keine Zahlungen erfasst</TableCell></TableRow>
              ) : payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{getProviderName(p.provider_id)}</TableCell>
                  <TableCell className="font-bold">€{p.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.payment_method}</Badge></TableCell>
                  <TableCell className="text-sm">{format(parseISO(p.payment_date), "dd.MM.yyyy")}</TableCell>
                  <TableCell className="text-sm">{p.plan_name || "–"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.period_start && p.period_end ? `${format(parseISO(p.period_start), "dd.MM")} – ${format(parseISO(p.period_end), "dd.MM.yy")}` : "–"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.notes || "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Zahlung erfassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider *</Label>
              <Select value={form.provider_id} onValueChange={v => setForm(f => ({ ...f, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Provider wählen..." /></SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Betrag (€) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Zahlungsdatum</Label>
                <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Zahlungsmethode</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copecart">CopeCart</SelectItem>
                    <SelectItem value="bank_transfer">Überweisung</SelectItem>
                    <SelectItem value="cash">Bar</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="other">Sonstige</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan_name} onValueChange={v => setForm(f => ({ ...f, plan_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (9,90€)</SelectItem>
                    <SelectItem value="pro">Pro (29€)</SelectItem>
                    <SelectItem value="duo">Duo (49€)</SelectItem>
                    <SelectItem value="team">Team (79€)</SelectItem>
                    <SelectItem value="custom">Individuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Zeitraum von</Label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <Label>Zeitraum bis</Label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notiz</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. Per Überweisung, Ref: XYZ" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
