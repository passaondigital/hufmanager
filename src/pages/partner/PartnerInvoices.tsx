import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Plus, Loader2, Euro, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Entwurf", variant: "secondary" },
  sent: { label: "Gesendet", variant: "outline" },
  paid: { label: "Bezahlt", variant: "default" },
  overdue: { label: "Überfällig", variant: "destructive" },
  cancelled: { label: "Storniert", variant: "destructive" },
};

export default function PartnerInvoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: "1", unit_price: "" }]);
  const [form, setForm] = useState({
    horse_id: "", recipient_name: "", recipient_address: "", recipient_email: "",
    due_date: "", tax_rate: "19", notes: "",
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["partner-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_invoices")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["partner-horses-for-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((d: any) => d.horses).filter(Boolean);
    },
    enabled: !!user,
  });

  const calcTotals = () => {
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
    const taxRate = parseFloat(form.tax_rate) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate invoice number
      const { data: invNum, error: numErr } = await supabase.rpc("generate_partner_invoice_number", { p_partner_id: user!.id });
      if (numErr) throw numErr;

      const { subtotal, taxAmount, total } = calcTotals();
      const { data: invoice, error } = await supabase.from("partner_invoices").insert({
        partner_id: user!.id,
        horse_id: form.horse_id || null,
        invoice_number: invNum,
        recipient_name: form.recipient_name,
        recipient_address: form.recipient_address || null,
        recipient_email: form.recipient_email || null,
        due_date: form.due_date || null,
        subtotal, tax_rate: parseFloat(form.tax_rate), tax_amount: taxAmount, total,
        notes: form.notes || null,
      }).select().single();
      if (error) throw error;

      // Insert items
      const validItems = items.filter(i => i.description && i.unit_price);
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from("partner_invoice_items").insert(
          validItems.map(i => ({
            invoice_id: invoice.id,
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price),
            total: (parseFloat(i.quantity) || 1) * parseFloat(i.unit_price),
          }))
        );
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => {
      toast.success("Rechnung erstellt");
      queryClient.invalidateQueries({ queryKey: ["partner-invoices"] });
      setCreateOpen(false);
      setForm({ horse_id: "", recipient_name: "", recipient_address: "", recipient_email: "", due_date: "", tax_rate: "19", notes: "" });
      setItems([{ description: "", quantity: "1", unit_price: "" }]);
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partner_invoices").update({ status }).eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["partner-invoices"] });
    },
  });

  const filtered = invoices.filter((inv: any) =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { total: newTotal } = calcTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Rechnungen</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Neue Rechnung
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Suchen..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Keine Rechnungen vorhanden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv: any) => {
            const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
            return (
              <Card key={inv.id} className="hover:shadow-sm transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Euro className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{inv.invoice_number}</p>
                      <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.recipient_name}
                      {inv.horses?.name && ` · 🐴 ${inv.horses.name}`}
                      {` · ${format(new Date(inv.issue_date), "dd.MM.yyyy", { locale: de })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{Number(inv.total).toFixed(2)} €</p>
                    {inv.status === "draft" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] mt-1" onClick={() => updateStatus.mutate({ id: inv.id, status: "sent" })}>
                        Als gesendet markieren
                      </Button>
                    )}
                    {inv.status === "sent" && (
                      <Button size="sm" variant="default" className="h-6 text-[10px] mt-1" onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })}>
                        Bezahlt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Rechnung</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Empfänger *</Label>
              <Input value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} placeholder="Name / Firma" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-Mail</Label><Input type="email" value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} /></div>
              <div><Label>Fällig am</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Textarea value={form.recipient_address} onChange={e => setForm(p => ({ ...p, recipient_address: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Pferd (optional)</Label>
              <Select value={form.horse_id} onValueChange={v => setForm(p => ({ ...p, horse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Keinem Pferd zuordnen" /></SelectTrigger>
                <SelectContent>
                  {horses.map((h: any) => <SelectItem key={h.id} value={h.id}>🐴 {h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <Label>Positionen</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Beschreibung" value={item.description} onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <Input className="col-span-2" type="number" placeholder="Menge" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = e.target.value; setItems(n); }} />
                  <Input className="col-span-3" type="number" step="0.01" placeholder="Preis" value={item.unit_price} onChange={e => { const n = [...items]; n[idx].unit_price = e.target.value; setItems(n); }} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1 h-10 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length <= 1}>×</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: "1", unit_price: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Position
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>MwSt. (%)</Label><Input type="number" value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))} /></div>
              <div className="flex items-end">
                <div className="text-right w-full">
                  <p className="text-sm text-muted-foreground">Gesamt</p>
                  <p className="text-xl font-bold text-foreground">{newTotal.toFixed(2)} €</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Notizen</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.recipient_name}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
