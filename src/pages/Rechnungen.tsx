import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Plus, Eye, Download, Trash2, MoreVertical, Loader2, CheckCircle, Ban } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { PdfPreviewDialog } from "@/components/invoices/PdfPreviewDialog";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  pdf_url: string | null;
  client_id: string;
  provider_id: string | null;
  notes: string | null;
  payment_method: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  horse: {
    name: string;
  } | null;
  clientProfile: {
    full_name: string | null;
    readable_id: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    zip_code: string | null;
    stable_street: string | null;
    stable_city: string | null;
    stable_zip: string | null;
  } | null;
}

export default function Rechnungen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);
  
  // PDF Preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  
  // Mark as paid state
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Überweisung");

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        issue_date,
        due_date,
        total_amount,
        status,
        pdf_url,
        client_id,
        provider_id,
        notes,
        payment_method,
        cancelled_at,
        cancellation_reason,
        horse:horses(name)
      `)
      .eq("provider_id", user.id)
      .order("issue_date", { ascending: false });

    if (!error && data) {
      const clientIds = [...new Set(data.map(inv => inv.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, email, phone, city, zip_code, stable_street, stable_city, stable_zip")
        .in("id", clientIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const invoicesWithClients = data.map(inv => ({
        ...inv,
        clientProfile: profileMap.get(inv.client_id) || null
      })) as Invoice[];

      setInvoices(invoicesWithClients);
      setFilteredInvoices(invoicesWithClients);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = invoices.filter(invoice => {
      const clientName = invoice.clientProfile?.full_name?.toLowerCase() || "";
      const clientId = invoice.clientProfile?.readable_id?.toLowerCase() || "";
      const invoiceNumber = invoice.invoice_number?.toLowerCase() || "";
      const horseName = invoice.horse?.name?.toLowerCase() || "";
      
      return clientName.includes(query) || 
             clientId.includes(query) || 
             invoiceNumber.includes(query) ||
             horseName.includes(query);
    });
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  const getStatusBadge = (status: string | null, cancelledAt: string | null) => {
    if (cancelledAt) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">Storniert</Badge>;
    }
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Bezahlt</Badge>;
      case "overdue":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Offen</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const totalOpen = invoices.filter(i => i.status === "pending").reduce((sum, i) => sum + i.total_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + i.total_amount, 0);

  const handleGeneratePdf = async (invoice: Invoice): Promise<Blob | null> => {
    if (!user) return null;
    setGeneratingPdfFor(invoice.id);
    try {
      const blob = await generateInvoicePdf(invoice, invoice.clientProfile, user.id);
      return blob;
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "PDF-Generierung fehlgeschlagen",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      return null;
    } finally {
      setGeneratingPdfFor(null);
    }
  };

  const handleView = async (invoice: Invoice) => {
    const blob = await handleGeneratePdf(invoice);
    if (blob) {
      setPdfBlob(blob);
      setPdfTitle(`Rechnung ${invoice.invoice_number || ""}`);
      setPdfFileName(`Rechnung_${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`);
      setPdfPreviewOpen(true);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    const blob = await handleGeneratePdf(invoice);
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rechnung_${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "PDF heruntergeladen" });
    }
  };

  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfBlob(null);
  };

  const handleCancel = async () => {
    if (!invoiceToCancel) return;
    
    const { error } = await supabase
      .from("invoices")
      .update({ 
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Storniert",
        status: "cancelled"
      })
      .eq("id", invoiceToCancel.id);

    if (error) {
      toast({ title: "Fehler beim Stornieren", variant: "destructive" });
    } else {
      toast({ title: "Rechnung storniert", description: "Die Rechnung wurde als storniert markiert." });
      fetchInvoices();
    }
    setInvoiceToCancel(null);
  };

  const handleMarkAsPaid = async () => {
    if (!invoiceToMarkPaid) return;
    
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", payment_method: selectedPaymentMethod })
      .eq("id", invoiceToMarkPaid.id);

    if (error) {
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    } else {
      toast({ title: "Rechnung als bezahlt markiert" });
      fetchInvoices();
    }
    setInvoiceToMarkPaid(null);
    setSelectedPaymentMethod("Überweisung");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rechnungen</h1>
          <p className="text-muted-foreground">Übersicht aller Kundenrechnungen</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Rechnung erstellen
        </Button>
      </div>

      <CreateInvoiceModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchInvoices}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Gesamt</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Offen</p>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalOpen)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Überfällig</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Bezahlt</p>
            <p className="text-2xl font-bold text-green-600">
              {invoices.filter(i => i.status === "paid").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suche nach Kunden-ID (z.B. #KID-123456), Name, Rechnung..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? "Keine Rechnungen gefunden" : "Keine Rechnungen vorhanden"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground">
                        {invoice.invoice_number || `Rechnung`}
                      </span>
                      {getStatusBadge(invoice.status, invoice.cancelled_at)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(invoice.issue_date), "dd. MMMM yyyy", { locale: de })}
                    </p>
                    {invoice.clientProfile && (
                      <p className="text-sm font-medium text-foreground">
                        Kunde: {invoice.clientProfile.full_name || "Unbekannt"}
                        {invoice.clientProfile.readable_id && (
                          <span className="text-primary ml-1">
                            ({invoice.clientProfile.readable_id})
                          </span>
                        )}
                      </p>
                    )}
                    {invoice.horse && (
                      <p className="text-sm text-muted-foreground">
                        🐴 {invoice.horse.name}
                      </p>
                    )}
                    <p className="font-bold text-lg text-foreground pt-1">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                  {generatingPdfFor === invoice.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleView(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ansehen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(invoice)}>
                          <Download className="h-4 w-4 mr-2" />
                          Herunterladen
                        </DropdownMenuItem>
                        {invoice.status !== "paid" && !invoice.cancelled_at && (
                          <DropdownMenuItem 
                            onClick={() => setInvoiceToMarkPaid(invoice)}
                            className="text-green-600 focus:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Als bezahlt markieren
                          </DropdownMenuItem>
                        )}
                        {invoice.status === "paid" && invoice.payment_method && (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            Zahlart: {invoice.payment_method}
                          </DropdownMenuItem>
                        )}
                        {!invoice.cancelled_at && (
                          <DropdownMenuItem
                            onClick={() => setInvoiceToCancel(invoice)}
                            className="text-amber-600 focus:text-amber-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Stornieren
                          </DropdownMenuItem>
                        )}
                        {invoice.cancelled_at && (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            Storniert am {format(new Date(invoice.cancelled_at), "dd.MM.yyyy", { locale: de })}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel/Storno Confirmation */}
      <AlertDialog open={!!invoiceToCancel} onOpenChange={() => setInvoiceToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Rechnung <strong>{invoiceToCancel?.invoice_number || "ohne Nummer"}</strong> wird 
              als storniert markiert. Sie bleibt in der Übersicht erhalten, kann aber nicht mehr 
              bearbeitet werden. Dies ist revisionssicher und entspricht den gesetzlichen Anforderungen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Dialog with Payment Method */}
      <AlertDialog open={!!invoiceToMarkPaid} onOpenChange={() => setInvoiceToMarkPaid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung als bezahlt markieren</AlertDialogTitle>
            <AlertDialogDescription>
              Rechnung <strong>{invoiceToMarkPaid?.invoice_number || "ohne Nummer"}</strong> wird als bezahlt markiert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="payment-method" className="text-sm font-medium">
              Zahlungsart
            </Label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger id="payment-method" className="mt-2">
                <SelectValue placeholder="Zahlungsart wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Überweisung">Überweisung</SelectItem>
                <SelectItem value="Bar">Bar</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Als bezahlt markieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onClose={closePdfPreview}
        pdfBlob={pdfBlob}
        title={pdfTitle}
        fileName={pdfFileName}
      />
    </div>
  );
}
