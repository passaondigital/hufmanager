import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  FolderOpen,
  Receipt,
  File,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  notes: string | null;
  horse?: { name: string } | null;
}

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  category: string | null;
  created_at: string;
  horse?: { name: string } | null;
}

interface ClientDocumentsTabProps {
  clientId: string;
  clientName?: string;
}

export function ClientDocumentsTab({ clientId, clientName }: ClientDocumentsTabProps) {
  const { user } = useAuth();
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

  // Fetch invoices
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["client-documents-invoices", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          total_amount,
          status,
          notes,
          horse:horses(name)
        `)
        .eq("client_id", clientId)
        .order("issue_date", { ascending: false });

      if (error) throw error;

      // Fetch client profile for PDF generation
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, city, zip_code, stable_street, stable_city, stable_zip")
        .eq("id", clientId)
        .single();

      setClientProfile(profile);

      return data as Invoice[];
    },
  });

  // Fetch documents (from horses owned by this client)
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["client-documents-files", clientId],
    queryFn: async () => {
      // Get all horses for this client
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", clientId);

      if (!horses || horses.length === 0) return [];

      const horseIds = horses.map(h => h.id);
      const horseMap = Object.fromEntries(horses.map(h => [h.id, h.name]));

      // Get documents for those horses
      const { data, error } = await supabase
        .from("horse_documents")
        .select("*")
        .in("horse_id", horseIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(doc => ({
        ...doc,
        horse: { name: horseMap[doc.horse_id] || "Unbekannt" }
      })) as Document[];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Bezahlt</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Überfällig</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Offen</Badge>;
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (!user) return;
    setGeneratingPdfFor(invoice.id);
    try {
      const blob = await generateInvoicePdf(invoice, clientProfile, user.id);
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
    } catch (error) {
      toast({
        title: "PDF-Generierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdfFor(null);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    const { data } = await supabase.storage
      .from("horse-documents")
      .createSignedUrl(doc.file_url, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    const { data } = await supabase.storage
      .from("horse-documents")
      .createSignedUrl(doc.file_url, 3600);
    
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isLoading = loadingInvoices || loadingDocs;
  const totalItems = invoices.length + documents.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Dokumente & Rechnungen</h3>
        <Badge variant="secondary">{totalItems} Dateien</Badge>
      </div>

      {totalItems === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Noch keine Dokumente oder Rechnungen vorhanden</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4" />
              Rechnungen ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <File className="h-4 w-4" />
              Dokumente ({documents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {invoices.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Keine Rechnungen vorhanden
                    </CardContent>
                  </Card>
                ) : (
                  invoices.map((invoice) => (
                    <Card key={invoice.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm">
                                {invoice.invoice_number || "Rechnung"}
                              </span>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(invoice.issue_date), "dd.MM.yyyy", { locale: de })}</span>
                              {invoice.horse && (
                                <>
                                  <span>•</span>
                                  <span>🐴 {invoice.horse.name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(invoice.total_amount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {generatingPdfFor === invoice.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Keine Dokumente vorhanden
                    </CardContent>
                  </Card>
                ) : (
                  documents.map((doc) => (
                    <Card key={doc.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {doc.file_name}
                              </span>
                              {doc.category && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}</span>
                              {doc.horse && (
                                <>
                                  <span>•</span>
                                  <span>🐴 {doc.horse.name}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
