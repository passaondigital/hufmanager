import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Eye, Download, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";
import { PdfPreviewDialog } from "@/components/invoices/PdfPreviewDialog";

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  pdf_url: string | null;
  provider_id: string | null;
  notes: string | null;
  horse: {
    name: string;
  } | null;
}

interface ClientProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  zip_code: string | null;
  stable_street: string | null;
  stable_city: string | null;
  stable_zip: string | null;
  readable_id: string | null;
}

export default function ClientInvoices() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<ClientProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // PDF Preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, readable_id, email, phone, city, zip_code, stable_street, stable_city, stable_zip")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setUserProfile(profileData);
      }
      
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
          provider_id,
          notes,
          horse:horses(name)
        `)
        .eq("client_id", user.id)
        .order("issue_date", { ascending: false });

      if (!error && data) {
        setInvoices(data as Invoice[]);
        setFilteredInvoices(data as Invoice[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = invoices.filter(invoice => {
      const invoiceNumber = invoice.invoice_number?.toLowerCase() || "";
      const horseName = invoice.horse?.name?.toLowerCase() || "";
      const clientId = userProfile?.readable_id?.toLowerCase() || "";
      
      return invoiceNumber.includes(query) || 
             horseName.includes(query) ||
             clientId.includes(query);
    });
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, userProfile]);

  const getStatusBadge = (status: string | null) => {
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

  const handleGeneratePdf = async (invoice: Invoice): Promise<Blob | null> => {
    if (!user) return null;
    setGeneratingPdfFor(invoice.id);
    try {
      const blob = await generateInvoicePdf(invoice, userProfile, invoice.provider_id || user.id);
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

  const handleViewPdf = async (invoice: Invoice) => {
    const blob = await handleGeneratePdf(invoice);
    if (blob) {
      setPdfBlob(blob);
      setPdfTitle(`Rechnung ${invoice.invoice_number || ""}`);
      setPdfFileName(`Rechnung_${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`);
      setPdfPreviewOpen(true);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    const blob = await handleGeneratePdf(invoice);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rechnung_${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF heruntergeladen" });
    }
  };

  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfBlob(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Rechnungen</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Search */}
        {invoices.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Rechnung, Pferd..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

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
              <Card key={invoice.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {invoice.invoice_number || `Rechnung`}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.issue_date), "dd. MMMM yyyy", { locale: de })}
                      </p>
                      {userProfile && (
                        <p className="text-sm text-muted-foreground">
                          Kunde: {userProfile.full_name || "Unbekannt"}
                          {userProfile.readable_id && ` (${userProfile.readable_id})`}
                        </p>
                      )}
                      {invoice.horse && (
                        <p className="text-sm text-muted-foreground">
                          🐴 {invoice.horse.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold text-foreground">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {generatingPdfFor === invoice.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewPdf(invoice)}
                            title="Vorschau"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadPdf(invoice)}
                            title="Herunterladen"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

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
