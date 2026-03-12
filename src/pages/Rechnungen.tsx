import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ListPageHeader } from "@/components/shared/ListPageHeader";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
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
import { FileText, Search, Plus, Eye, Download, Trash2, MoreVertical, Loader2, CheckCircle, Ban, Link2, Copy, FileSpreadsheet } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { PdfPreviewDialog } from "@/components/invoices/PdfPreviewDialog";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";
import { downloadDatevExport, downloadSimpleExport } from "@/lib/datevExport";

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
  payment_link: string | null;
  payment_status: string | null;
  paid_at: string | null;
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
        payment_link,
        payment_status,
        paid_at,
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

  const getPaymentStatusBadge = (paymentStatus: string | null, paymentLink: string | null) => {
    if (!paymentLink) return null;
    
    if (paymentStatus === "paid") {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Bezahlt</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Unbezahlt</Badge>;
  };

  const handleCopyPaymentLink = (paymentLink: string) => {
    navigator.clipboard.writeText(paymentLink);
    toast({ title: "Zahlungslink kopiert", description: "Der Link wurde in die Zwischenablage kopiert." });
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
      .update({ 
        status: "paid", 
        payment_method: selectedPaymentMethod,
        payment_status: "paid",
        paid_at: new Date().toISOString()
      })
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

  const handleDatevExport = () => {
    if (!user) return;
    const exportableInvoices = invoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_amount: inv.total_amount,
      status: inv.status,
      notes: inv.notes,
      client: inv.clientProfile ? {
        full_name: inv.clientProfile.full_name,
        readable_id: inv.clientProfile.readable_id,
      } : null,
      horse: inv.horse,
    }));
    downloadDatevExport(exportableInvoices, user.id);
    toast({ title: "DATEV-Export heruntergeladen" });
  };

  const handleSimpleExport = () => {
    const exportableInvoices = invoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_amount: inv.total_amount,
      status: inv.status,
      notes: inv.notes,
      client: inv.clientProfile ? {
        full_name: inv.clientProfile.full_name,
        readable_id: inv.clientProfile.readable_id,
      } : null,
      horse: inv.horse,
    }));
    downloadSimpleExport(exportableInvoices);
    toast({ title: "CSV-Export heruntergeladen" });
  };

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Rechnungen"
        count={invoices.length}
        countLabel="Rechnungen"
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDatevExport}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  DATEV-Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSimpleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV-Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Rechnung erstellen
            </Button>
          </div>
        }
      />

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
        <ListSkeleton rows={3} />
      ) : filteredInvoices.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-muted/20">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <span className="text-4xl">💶</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "Keine Treffer" : "Noch keine Rechnungen?"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              {searchQuery 
                ? "Versuche einen anderen Suchbegriff." 
                : "Mach deinen ersten Termin fertig und verdiene Geld!"}
            </p>
            {!searchQuery && (
              <Button 
                size="lg" 
                className="px-8 h-12 text-base font-semibold"
                onClick={() => window.location.href = '/kalender'}
              >
                Zum Kalender
              </Button>
            )}
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
                      {invoice.payment_link && invoice.payment_method === "CopeCart" && (
                        <Badge 
                          variant="outline" 
                          className={invoice.payment_status === "paid" 
                            ? "bg-green-500/10 text-green-600 border-green-500/20" 
                            : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {invoice.payment_status === "paid" ? "CopeCart ✓" : "CopeCart offen"}
                        </Badge>
                      )}
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
                        {invoice.payment_link && invoice.status !== "paid" && !invoice.cancelled_at && (
                          <DropdownMenuItem 
                            onClick={() => handleCopyPaymentLink(invoice.payment_link!)}
                            className="text-[#F47B20] focus:text-[#F47B20]"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Zahlungslink kopieren
                          </DropdownMenuItem>
                        )}
                        {invoice.payment_link && invoice.status !== "paid" && !invoice.cancelled_at && (
                          <DropdownMenuItem 
                            onClick={() => window.open(invoice.payment_link!, "_blank")}
                            className="text-[#F47B20] focus:text-[#F47B20]"
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Zahlungslink öffnen
                          </DropdownMenuItem>
                        )}
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
                            {invoice.paid_at && ` (${format(new Date(invoice.paid_at), "dd.MM.yyyy", { locale: de })})`}
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
