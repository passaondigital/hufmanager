import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, Trash2, Save, Send, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateAdminInvoicePdf, generateAdminInvoicePdfBlob, type AdminInvoiceData } from "@/lib/adminInvoicePdf";

const PLAN_DEFAULTS: Record<string, { label: string; monthly: number; yearly: number }> = {
  starter: { label: "Starter", monthly: 9.9, yearly: 99 },
  pro: { label: "Pro", monthly: 29, yearly: 348 },
  duo: { label: "Duo", monthly: 49, yearly: 588 },
  team: { label: "Team", monthly: 79, yearly: 948 },
};

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface Provider {
  id: string;
  full_name: string;
  email: string;
  address?: string;
  readable_id?: string;
  plan?: string;
  city?: string;
  zip_code?: string;
  street?: string;
}

interface AdminInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editInvoice?: any;
  onSaved: () => void;
}

export function AdminInvoiceModal({ open, onOpenChange, editInvoice, onSaved }: AdminInvoiceModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerSearch, setProviderSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [periodEnd, setPeriodEnd] = useState<Date>(addDays(new Date(), 30));
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit: "Monat", unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Search providers via user_roles join
  useEffect(() => {
    if (providerSearch.length < 2) {
      setProviders([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        // First get provider user_ids
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "provider");
        const providerIds = roles?.map(r => r.user_id) || [];
        if (!providerIds.length) {
          setProviders([]);
          setShowDropdown(true);
          setSearchLoading(false);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, readable_id, subscription_plan, street, city, zip_code")
          .or(`full_name.ilike.%${providerSearch}%,email.ilike.%${providerSearch}%,readable_id.ilike.%${providerSearch}%`)
          .in("id", providerIds)
          .is("deleted_at", null)
          .limit(8);
        const mapped = (data || []).map((d: any) => ({
          id: d.id,
          full_name: d.full_name || "",
          email: d.email || "",
          readable_id: d.readable_id,
          plan: d.subscription_plan,
          street: d.street,
          city: d.city,
          zip_code: d.zip_code,
          address: [d.street, d.zip_code, d.city].filter(Boolean).join(", "),
        })) as Provider[];
        setProviders(mapped);
        setShowDropdown(true);
      } catch (err) {
        console.error("Provider search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [providerSearch]);

  // Auto-fill when provider selected
  const selectProvider = (p: Provider) => {
    setSelectedProvider(p);
    setProviderSearch("");
    setProviders([]);
    setShowDropdown(false);
    // Auto-fill first item from plan
    const plan = p.plan?.toLowerCase() || "";
    const planConfig = PLAN_DEFAULTS[plan];
    if (planConfig) {
      setItems([{
        id: crypto.randomUUID(),
        description: `HufManager ${planConfig.label} – Monatslizenz`,
        quantity: 1,
        unit: "Monat",
        unitPrice: planConfig.monthly,
      }]);
    }
  };

  // Load edit data
  useEffect(() => {
    if (editInvoice && open) {
      setInvoiceNumber(editInvoice.invoice_number);
      setInvoiceDate(new Date(editInvoice.created_at));
      setDueDate(editInvoice.due_date ? new Date(editInvoice.due_date) : addDays(new Date(), 14));
      setPeriodStart(new Date(editInvoice.period_start));
      setPeriodEnd(new Date(editInvoice.period_end));
      setDiscount(editInvoice.discount || 0);
      setPaymentMethod(editInvoice.payment_method || "bank_transfer");
      setNotes(editInvoice.notes || "");
      setSelectedProvider({
        id: editInvoice.provider_id,
        full_name: editInvoice.provider_name,
        email: editInvoice.provider_email,
        address: editInvoice.provider_address,
        readable_id: editInvoice.provider_pid,
        plan: editInvoice.plan,
      });
      // Load items
      supabase
        .from("admin_invoice_items")
        .select("*")
        .eq("invoice_id", editInvoice.id)
        .order("position")
        .then(({ data }) => {
          if (data?.length) {
            setItems(data.map((d) => ({
              id: d.id,
              description: d.description,
              quantity: d.quantity || 1,
              unit: d.unit || "Monat",
              unitPrice: d.unit_price,
            })));
          }
        });
    }
  }, [editInvoice, open]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: 1, unit: "Monat", unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const buildPdfData = (): AdminInvoiceData => ({
    invoiceNumber,
    invoiceDate: format(invoiceDate, "dd.MM.yyyy"),
    dueDate: format(dueDate, "dd.MM.yyyy"),
    periodStart: format(periodStart, "dd.MM.yyyy"),
    periodEnd: format(periodEnd, "dd.MM.yyyy"),
    providerName: selectedProvider?.full_name || "",
    providerEmail: selectedProvider?.email || "",
    providerAddress: selectedProvider?.address || "",
    providerPid: selectedProvider?.readable_id || "",
    items: items.map((i, idx) => ({
      position: idx + 1,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
    })),
    subtotal,
    discount,
    total,
    paymentMethod,
    notes: notes || undefined,
  });

  const previewPdf = () => {
    const doc = generateAdminInvoicePdf(buildPdfData());
    const pdfUrl = doc.output("bloburl");
    window.open(pdfUrl.toString(), "_blank");
  };

  const saveInvoice = async (andSend = false) => {
    if (!selectedProvider) {
      toast.error("Bitte Provider auswählen");
      return;
    }
    if (items.some((i) => !i.description || i.unitPrice <= 0)) {
      toast.error("Alle Positionen müssen ausgefüllt sein");
      return;
    }

    setSaving(true);
    if (andSend) setSending(true);

    try {
      const invoicePayload = {
        invoice_number: invoiceNumber || undefined, // let trigger auto-generate if empty
        provider_id: selectedProvider.id,
        provider_pid: selectedProvider.readable_id,
        provider_name: selectedProvider.full_name,
        provider_email: selectedProvider.email,
        provider_address: selectedProvider.address,
        plan: selectedProvider.plan || "manual",
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
        subtotal,
        discount,
        total,
        vat_rate: 0,
        vat_amount: 0,
        kleinunternehmer: true,
        payment_method: paymentMethod,
        payment_source: "manual",
        status: andSend ? "sent" : "draft",
        due_date: format(dueDate, "yyyy-MM-dd"),
        notes: notes || null,
        sent_at: andSend ? new Date().toISOString() : null,
      };

      let invoiceId: string;

      if (editInvoice) {
        const { error } = await supabase
          .from("admin_invoices")
          .update(invoicePayload)
          .eq("id", editInvoice.id);
        if (error) throw error;
        invoiceId = editInvoice.id;

        // Delete old items, re-insert
        await supabase.from("admin_invoice_items").delete().eq("invoice_id", invoiceId);
      } else {
        const { data, error } = await supabase
          .from("admin_invoices")
          .insert(invoicePayload)
          .select("id, invoice_number")
          .single();
        if (error) throw error;
        invoiceId = data.id;
        if (!invoiceNumber) setInvoiceNumber(data.invoice_number);
      }

      // Insert items
      const itemsPayload = items.map((item, idx) => ({
        invoice_id: invoiceId,
        position: idx + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("admin_invoice_items")
        .insert(itemsPayload);
      if (itemsError) throw itemsError;

      // Generate and upload PDF
      const pdfData = buildPdfData();
      // Use the saved invoice number
      if (!pdfData.invoiceNumber) {
        const { data: inv } = await supabase
          .from("admin_invoices")
          .select("invoice_number")
          .eq("id", invoiceId)
          .single();
        if (inv) pdfData.invoiceNumber = inv.invoice_number;
      }
      const pdfBlob = generateAdminInvoicePdfBlob(pdfData);
      const year = new Date().getFullYear();
      const pdfPath = `invoices/${year}/${pdfData.invoiceNumber}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("admin-invoices")
        .upload(pdfPath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!uploadError) {
        await supabase
          .from("admin_invoices")
          .update({ pdf_url: pdfPath })
          .eq("id", invoiceId);
      }

      // Send email if requested
      if (andSend) {
        const base64 = await blobToBase64(pdfBlob);
        const { error: sendError } = await supabase.functions.invoke("send-admin-invoice", {
          body: {
            invoice_id: invoiceId,
            recipient_email: selectedProvider.email,
            recipient_name: selectedProvider.full_name,
            invoice_number: pdfData.invoiceNumber,
            total_amount: total,
            due_date: format(dueDate, "dd.MM.yyyy"),
            payment_method: paymentMethod,
            pdf_base64: base64,
          },
        });
        if (sendError) {
          toast.error("Rechnung gespeichert, aber E-Mail fehlgeschlagen");
        } else {
          toast.success("Rechnung versendet ✉️");
        }
      } else {
        toast.success("Rechnung gespeichert");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save invoice error:", err);
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  const formatEur = (v: number) =>
    v.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editInvoice ? "Rechnung bearbeiten" : "Neue Rechnung erstellen"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="font-semibold">Provider</Label>
              {selectedProvider ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{selectedProvider.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProvider.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{selectedProvider.readable_id}</Badge>
                      {selectedProvider.plan && <Badge variant="secondary">{selectedProvider.plan}</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProvider(null)}>
                    Ändern
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Input
                      placeholder="Provider suchen (Name, E-Mail, PID)..."
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                      onFocus={() => providers.length > 0 && setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showDropdown && providerSearch.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {providers.length > 0 ? (
                        providers.map((p) => (
                          <button
                            key={p.id}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectProvider(p)}
                          >
                            <p className="font-medium text-sm">{p.full_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                              {p.readable_id && <Badge variant="outline" className="text-[10px] px-1 py-0">{p.readable_id}</Badge>}
                              {p.plan && <Badge variant="secondary" className="text-[10px] px-1 py-0">{p.plan}</Badge>}
                            </div>
                          </button>
                        ))
                      ) : !searchLoading ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          Kein Provider gefunden – Name, E-Mail oder PID eingeben
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Rechnungsnummer</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Auto (HM-2026-XXXX)"
                />
              </div>
              <DateField label="Rechnungsdatum" date={invoiceDate} setDate={setInvoiceDate} />
              <DateField label="Zahlungsziel" date={dueDate} setDate={setDueDate} />
              <div /> {/* spacer */}
              <DateField label="Zeitraum von" date={periodStart} setDate={setPeriodStart} />
              <DateField label="Zeitraum bis" date={periodEnd} setDate={setPeriodEnd} />
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-2">
              <Label className="font-semibold">Positionen</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pos</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-16">Menge</TableHead>
                    <TableHead className="w-20">Einheit</TableHead>
                    <TableHead className="w-24">Einzelpreis</TableHead>
                    <TableHead className="w-24 text-right">Gesamt</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Beschreibung..."
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="h-8 text-sm w-14"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updateItem(item.id, "unit", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monat">Monat</SelectItem>
                            <SelectItem value="Jahr">Jahr</SelectItem>
                            <SelectItem value="Einmalig">Einmalig</SelectItem>
                            <SelectItem value="Stück">Stück</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                          className="h-8 text-sm w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEur(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Position hinzufügen
              </Button>
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="font-semibold">Zahlungsart</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Überweisung</SelectItem>
                  <SelectItem value="copecart">CopeCart</SelectItem>
                  <SelectItem value="cash">Barzahlung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notiz (optional, erscheint auf Rechnung)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusätzliche Hinweise..."
                rows={2}
              />
            </div>
          </div>

          {/* Right: Summary (sticky) */}
          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <h3 className="font-semibold text-lg">Zusammenfassung</h3>
              <div className="flex justify-between text-sm">
                <span>Zwischensumme</span>
                <span>{formatEur(subtotal)}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rabatt (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Gesamt</span>
                <span>{formatEur(total)}</span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Kein MwSt-Ausweis gem. §19 UStG
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={previewPdf}
                disabled={!selectedProvider}
              >
                <Eye className="h-4 w-4" /> Vorschau PDF
              </Button>
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => saveInvoice(false)}
                disabled={saving || !selectedProvider}
              >
                {saving && !sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Entwurf speichern
              </Button>
              <Button
                className="w-full gap-2"
                onClick={() => saveInvoice(true)}
                disabled={saving || !selectedProvider}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Speichern & Versenden
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helper: DateField ──
function DateField({ label, date, setDate }: { label: string; date: Date; setDate: (d: Date) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd.MM.yyyy") : "Datum wählen"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Helper: Blob to Base64 ──
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
