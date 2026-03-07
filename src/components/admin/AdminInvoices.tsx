import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Loader2,
  Download,
  Ban,
  Euro,
  Clock,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AdminInvoiceModal } from "./AdminInvoiceModal";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Entwurf", variant: "secondary" },
  sent: { label: "Versendet", variant: "default" },
  paid: { label: "Bezahlt", variant: "outline" },
  overdue: { label: "Überfällig", variant: "destructive" },
  cancelled: { label: "Storniert", variant: "secondary" },
};

export function AdminInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setInvoices(data);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const stats = {
    open: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    mrr: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.total || 0), 0),
  };

  const markPaid = async (id: string) => {
    await supabase
      .from("admin_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    toast.success("Als bezahlt markiert ✓");
    fetchInvoices();
  };

  const cancelInvoice = async (id: string) => {
    await supabase
      .from("admin_invoices")
      .update({ status: "cancelled" })
      .eq("id", id);
    toast.success("Rechnung storniert");
    fetchInvoices();
  };

  const downloadPdf = async (pdfUrl: string, invoiceNumber: string) => {
    const { data, error } = await supabase.storage
      .from("admin-invoices")
      .download(pdfUrl);
    if (error || !data) {
      toast.error("PDF nicht gefunden");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendInvoice = async (invoice: any) => {
    if (!invoice.pdf_url) {
      toast.error("Bitte erst PDF generieren (Rechnung bearbeiten & speichern)");
      return;
    }
    // Download PDF from storage for base64
    const { data: pdfData } = await supabase.storage
      .from("admin-invoices")
      .download(invoice.pdf_url);
    if (!pdfData) {
      toast.error("PDF konnte nicht geladen werden");
      return;
    }
    const base64 = await blobToBase64(pdfData);

    const { error } = await supabase.functions.invoke("send-admin-invoice", {
      body: {
        invoice_id: invoice.id,
        recipient_email: invoice.provider_email,
        recipient_name: invoice.provider_name,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total,
        due_date: invoice.due_date ? format(new Date(invoice.due_date), "dd.MM.yyyy") : "",
        payment_method: invoice.payment_method,
        pdf_base64: base64,
      },
    });

    if (error) {
      toast.error("Versand fehlgeschlagen");
    } else {
      await supabase
        .from("admin_invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoice.id);
      toast.success("Rechnung versendet ✉️");
      fetchInvoices();
    }
  };

  const formatEur = (v: number) =>
    v.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rechnungen</h2>
          <p className="text-muted-foreground">HufManager → Provider</p>
        </div>
        <Button onClick={() => { setEditInvoice(null); setShowModal(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Rechnung erstellen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="h-5 w-5 text-blue-500" />} label="Offen" value={stats.open} />
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Bezahlt" value={stats.paid} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Überfällig" value={stats.overdue} />
        <StatCard icon={<Euro className="h-5 w-5 text-primary" />} label="Einnahmen (bezahlt)" value={formatEur(stats.mrr)} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Alle Rechnungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Noch keine Rechnungen erstellt</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr.</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fällig</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const status = (inv.status || "draft") as InvoiceStatus;
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{inv.provider_name}</p>
                          <p className="text-xs text-muted-foreground">{inv.provider_pid}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{inv.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEur(Number(inv.total))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.due_date ? format(new Date(inv.due_date), "dd.MM.yyyy") : "–"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {inv.pdf_url && (
                              <DropdownMenuItem onClick={() => downloadPdf(inv.pdf_url, inv.invoice_number)}>
                                <Download className="h-4 w-4 mr-2" /> PDF herunterladen
                              </DropdownMenuItem>
                            )}
                            {status !== "paid" && status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => sendInvoice(inv)}>
                                <Send className="h-4 w-4 mr-2" /> Versenden
                              </DropdownMenuItem>
                            )}
                            {(status === "sent" || status === "overdue") && (
                              <DropdownMenuItem onClick={() => markPaid(inv.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Als bezahlt markieren
                              </DropdownMenuItem>
                            )}
                            {status === "draft" && (
                              <DropdownMenuItem onClick={() => { setEditInvoice(inv); setShowModal(true); }}>
                                <FileText className="h-4 w-4 mr-2" /> Bearbeiten
                              </DropdownMenuItem>
                            )}
                            {status !== "cancelled" && status !== "paid" && (
                              <DropdownMenuItem onClick={() => cancelInvoice(inv.id)} className="text-destructive">
                                <Ban className="h-4 w-4 mr-2" /> Stornieren
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      <AdminInvoiceModal
        open={showModal}
        onOpenChange={setShowModal}
        editInvoice={editInvoice}
        onSaved={fetchInvoices}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{typeof value === "number" ? value : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

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
