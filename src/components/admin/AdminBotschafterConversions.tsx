import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, TrendingUp, Clock, Euro, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const PRODUCTS = [
  { name: "Starter", price: 990 },
  { name: "Pro", price: 2900 },
  { name: "Duo", price: 4900 },
  { name: "Team", price: 7900 },
];

type Conversion = {
  id: string;
  created_at: string | null;
  botschafter_id: string | null;
  referral_code: string;
  product_name: string | null;
  amount_cents: number | null;
  commission_rate: number | null;
  commission_cents: number | null;
  copecart_order_id: string | null;
  status: string | null;
  paid_at: string | null;
};

type BotschafterOption = { id: string; name: string; code: string; commission_rate: number | null };

export function AdminBotschafterConversions() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [botschafterList, setBotschafterList] = useState<BotschafterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [selBotschafter, setSelBotschafter] = useState("");
  const [selProduct, setSelProduct] = useState("");
  const [amount, setAmount] = useState(0);
  const [commRate, setCommRate] = useState(25);
  const [orderId, setOrderId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: convData }, { data: botData }] = await Promise.all([
      supabase.from("botschafter_conversions").select("id, created_at, botschafter_id, referral_code, product_name, amount_cents, commission_rate, commission_cents, copecart_order_id, status, paid_at").order("created_at", { ascending: false }),
      supabase.from("pferdeakte_botschafter").select("id, first_name, last_name, referral_code, commission_rate"),
    ]);
    setConversions(convData || []);
    setBotschafterList((botData || []).map(b => ({ id: b.id, name: `${b.first_name} ${b.last_name}`, code: b.referral_code, commission_rate: b.commission_rate })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleProductChange = (name: string) => {
    setSelProduct(name);
    const p = PRODUCTS.find(p => p.name === name);
    if (p) setAmount(p.price);
  };

  const handleBotschafterChange = (id: string) => {
    setSelBotschafter(id);
    const b = botschafterList.find(b => b.id === id);
    if (b?.commission_rate) setCommRate(b.commission_rate);
  };

  const handleSave = async () => {
    const b = botschafterList.find(b => b.id === selBotschafter);
    if (!b || !selProduct) { toast.error("Bitte Botschafter und Produkt wählen"); return; }
    setSaving(true);
    const commCents = Math.round(amount * commRate / 100);
    const { error } = await supabase.from("botschafter_conversions").insert({
      botschafter_id: b.id,
      referral_code: b.code,
      product_name: selProduct,
      amount_cents: amount,
      commission_rate: commRate,
      commission_cents: commCents,
      copecart_order_id: orderId || null,
      status: "pending",
    });
    setSaving(false);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success("Conversion gespeichert"); setSelBotschafter(""); setSelProduct(""); setAmount(0); setOrderId(""); setNote(""); fetchAll(); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") updates.paid_at = new Date().toISOString();
    const { error } = await supabase.from("botschafter_conversions").update(updates).eq("id", id);
    if (error) toast.error("Fehler"); else { toast.success("Status geändert"); fetchAll(); }
  };

  const totalConv = conversions.length;
  const pendingConv = conversions.filter(c => c.status === "pending").length;
  const pendingComm = conversions.filter(c => c.status === "confirmed").reduce((s, c) => s + (c.commission_cents || 0), 0);
  const paidComm = conversions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commission_cents || 0), 0);

  const filtered = filterStatus === "all" ? conversions : conversions.filter(c => c.status === filterStatus);

  const getBotschafterName = (id: string | null) => botschafterList.find(b => b.id === id)?.name || "—";

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Conversions & Provisionen</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{totalConv}</p><p className="text-sm text-muted-foreground">Gesamt</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="w-8 h-8 text-orange-500" /><div><p className="text-2xl font-bold">{pendingConv}</p><p className="text-sm text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Euro className="w-8 h-8 text-yellow-500" /><div><p className="text-2xl font-bold">{(pendingComm / 100).toFixed(2)} €</p><p className="text-sm text-muted-foreground">Ausstehend</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-500" /><div><p className="text-2xl font-bold">{(paidComm / 100).toFixed(2)} €</p><p className="text-sm text-muted-foreground">Ausgezahlt</p></div></div></CardContent></Card>
      </div>

      {/* Manual entry */}
      <Card>
        <CardHeader><CardTitle>Conversion erfassen</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selBotschafter} onValueChange={handleBotschafterChange}>
              <SelectTrigger><SelectValue placeholder="Botschafter wählen" /></SelectTrigger>
              <SelectContent>{botschafterList.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selProduct} onValueChange={handleProductChange}>
              <SelectTrigger><SelectValue placeholder="Produkt" /></SelectTrigger>
              <SelectContent>{PRODUCTS.map(p => <SelectItem key={p.name} value={p.name}>{p.name} ({(p.price / 100).toFixed(2)} €)</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="number" placeholder="Betrag (Cent)" value={amount} onChange={e => setAmount(Number(e.target.value))} className="h-10" />
              <Input type="number" placeholder="%" value={commRate} onChange={e => setCommRate(Number(e.target.value))} className="w-20 h-10" />
            </div>
            <Input placeholder="CopeCart Order-ID (optional)" value={orderId} onChange={e => setOrderId(e.target.value)} className="h-10" />
            <div className="md:col-span-2 flex justify-end"><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Conversion speichern</Button></div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Conversions</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Bestätigt</SelectItem>
              <SelectItem value="paid">Bezahlt</SelectItem>
              <SelectItem value="cancelled">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Datum</th><th className="pb-2">Botschafter</th><th className="pb-2">Produkt</th><th className="pb-2">Betrag</th>
                <th className="pb-2">Prov. %</th><th className="pb-2">Prov. €</th><th className="pb-2">Status</th><th className="pb-2">Aktionen</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b">
                    <td className="py-3">{c.created_at ? new Date(c.created_at).toLocaleDateString("de") : "—"}</td>
                    <td className="py-3 font-medium">{getBotschafterName(c.botschafter_id)}</td>
                    <td className="py-3">{c.product_name}</td>
                    <td className="py-3">{((c.amount_cents || 0) / 100).toFixed(2)} €</td>
                    <td className="py-3">{c.commission_rate}%</td>
                    <td className="py-3">{((c.commission_cents || 0) / 100).toFixed(2)} €</td>
                    <td className="py-3"><Badge variant="outline">{c.status}</Badge></td>
                    <td className="py-3 flex gap-1">
                      {c.status === "pending" && <Button size="sm" onClick={() => handleStatusChange(c.id, "confirmed")}>✅ Bestätigen</Button>}
                      {c.status === "confirmed" && <Button size="sm" onClick={() => handleStatusChange(c.id, "paid")}>💰 Bezahlt</Button>}
                      {c.status !== "cancelled" && c.status !== "paid" && <Button size="sm" variant="destructive" onClick={() => handleStatusChange(c.id, "cancelled")}>❌</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
