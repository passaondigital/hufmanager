import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Eye, Download, Search, Loader2, Mail, CreditCard, PiggyBank } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
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
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";
import { PdfPreviewDialog } from "@/components/invoices/PdfPreviewDialog";
import { ClientExpenseTracker } from "@/components/client/ClientExpenseTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProviderInfo {
  business_name: string | null;
  owner_name: string | null;
  email: string | null;
}

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
  payment_link: string | null;
  payment_status: string | null;
  payment_method: string | null;
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
  const [providerInfoMap, setProviderInfoMap] = useState<Map<string, ProviderInfo>>(new Map());
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  
  // PDF Preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
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
        payment_link,
        payment_status,
        payment_method,
        horse:horses(name)
      `)
      .eq("client_id", user.id)
      .order("issue_date", { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);
      setFilteredInvoices(data as Invoice[]);
      
      // Fetch provider business settings for email
      const providerIds = [...new Set(data.map(inv => inv.provider_id).filter(Boolean))] as string[];
      if (providerIds.length > 0) {
        const { data: settingsData } = await supabase
          .from("business_settings")
          .select("user_id, business_name, owner_name, email")
          .in("user_id", providerIds);
        
        if (settingsData) {
          const map = new Map<string, ProviderInfo>();
          settingsData.forEach(s => {
            if (s.user_id) {
              map.set(s.user_id, {
                business_name: s.business_name,
                owner_name: s.owner_name,
                email: s.email,
              });
            }
          });
          setProviderInfoMap(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
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
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20" title="Alles erledigt ✓">Bezahlt</Badge>;
      case "overdue":
        return <Badge variant="destructive" title="Zahlungsfrist abgelaufen">Überfällig</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary" title="Noch nicht bezahlt">Offen</Badge>;
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
      toast.error("PDF-Generierung fehlgeschlagen: Bitte versuchen Sie es erneut.");
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
      toast.success("PDF heruntergeladen");
    }
  };

  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfBlob(null);
  };

  const handleSendEmail = async (invoice: Invoice) => {
    if (!userProfile?.email) {
      toast.error("Keine E-Mail-Adresse: Bitte hinterlegen Sie Ihre E-Mail-Adresse in Ihrem Profil.");
      return;
    }

    setSendingEmailFor(invoice.id);
    try {
      const providerInfo = invoice.provider_id ? providerInfoMap.get(invoice.provider_id) : null;
      const providerName = providerInfo?.business_name || providerInfo?.owner_name || "Ihr Hufbearbeiter";

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoiceId: invoice.id,
          recipientEmail: userProfile.email,
          recipientName: userProfile.full_name || "Kunde",
          invoiceNumber: invoice.invoice_number || "",
          totalAmount: invoice.total_amount,
          providerName,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("E-Mail gesendet: Die Rechnung wurde an Ihre E-Mail-Adresse gesendet.");
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("E-Mail-Versand fehlgeschlagen: Bitte versuchen Sie es erneut.");
    } finally {
      setSendingEmailFor(null);
    }
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
          <h1 className="font-semibold text-foreground flex items-center gap-2">Rechnungen <HelpTip id="kunden.rechnungen" /></h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invoices" className="gap-1.5">
              <FileText className="h-4 w-4" /> Rechnungen
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5">
              <PiggyBank className="h-4 w-4" /> Ausgaben
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4 space-y-4">
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
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="font-bold text-foreground">
                              {formatCurrency(invoice.total_amount)}
                            </span>
                            {getStatusBadge(invoice.status)}
                            {invoice.payment_link && invoice.payment_method === "CopeCart" && invoice.status !== "paid" && (
                              <Badge className="bg-[#F47B20]/10 text-[#F47B20] border-[#F47B20]/20">
                                CopeCart
                              </Badge>
                            )}
                          </div>
                          
                          {invoice.payment_link && invoice.status !== "paid" && invoice.payment_status !== "paid" && (
                            <Button
                              className="w-full mt-2 bg-[#F47B20] hover:bg-[#F47B20]/90 text-white"
                              onClick={() => window.open(invoice.payment_link!, "_blank")}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Jetzt bezahlen
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {generatingPdfFor === invoice.id || sendingEmailFor === invoice.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewPdf(invoice)} title="Vorschau">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadPdf(invoice)} title="Herunterladen">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSendEmail(invoice)} title="Per E-Mail senden">
                                <Mail className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ClientExpenseTracker />
          </TabsContent>
        </Tabs>
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
