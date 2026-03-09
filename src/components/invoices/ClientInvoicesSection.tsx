import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { FileText, Download, Eye, Trash2, MoreVertical, Plus, Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { openWhatsApp, waTextInvoice } from "@/lib/whatsappTemplates";

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  pdf_url: string | null;
  horse_id: string | null;
  notes: string | null;
  horse?: { name: string } | null;
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
}

interface ClientInvoicesSectionProps {
  clientId: string;
  clientName?: string;
  horses?: { id: string; name: string }[];
}

export function ClientInvoicesSection({ clientId, clientName, horses = [] }: ClientInvoicesSectionProps) {
  const { user } = useAuth();
  const { isWhatsApp } = useCommunicationMode();
  const queryClient = useQueryClient();
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preSelectedHorseId, setPreSelectedHorseId] = useState<string | null>(null);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);

  // Fetch client profile for PDF generation
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices", clientId],
    queryFn: async () => {
      // Fetch invoices
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
          horse_id,
          notes,
          horse:horses(name)
        `)
        .eq("client_id", clientId)
        .order("issue_date", { ascending: false });

      if (error) throw error;

      // Fetch client profile for PDF branding
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, city, zip_code, stable_street, stable_city, stable_zip")
        .eq("id", clientId)
        .single();

      setClientProfile(profile);

      return data as Invoice[];
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-invoices", clientId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Rechnung gelöscht" });
      setInvoiceToDelete(null);
    },
    onError: () => {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
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
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Bezahlt</Badge>;
      case "overdue":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Offen</Badge>;
    }
  };

  const handleGeneratePdf = async (invoice: Invoice): Promise<Blob | null> => {
    if (!user) return null;
    setGeneratingPdfFor(invoice.id);
    try {
      const blob = await generateInvoicePdf(invoice, clientProfile, user.id);
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
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke after a delay to allow the new tab to load
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
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

  const handleCreateForHorse = (horseId: string) => {
    setPreSelectedHorseId(horseId);
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Rechnungen ({invoices.length})
        </h3>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Rechnung erstellen
        </Button>
      </div>

      {/* Quick create per horse */}
      {horses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {horses.map((horse) => (
            <Button
              key={horse.id}
              variant="outline"
              size="sm"
              onClick={() => handleCreateForHorse(horse.id)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Rechnung für {horse.name}
            </Button>
          ))}
        </div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Noch keine Rechnungen für diesen Kunden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
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

                  {generatingPdfFor === invoice.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                        {isWhatsApp && clientProfile?.phone && (
                          <DropdownMenuItem onClick={() => {
                            const amount = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(invoice.total_amount);
                            const dueDate = invoice.due_date ? format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de }) : undefined;
                            openWhatsApp(
                              clientProfile.phone!,
                              waTextInvoice(clientName || "", invoice.invoice_number || "–", `${amount}€`, dueDate)
                            );
                          }}>
                            <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                            Per WhatsApp senden
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setInvoiceToDelete(invoice)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Rechnung <strong>{invoiceToDelete?.invoice_number || "ohne Nummer"}</strong> wird 
              unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteInvoice.mutate(invoiceToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPreSelectedHorseId(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-invoices", clientId] });
        }}
        preSelectedClientId={clientId}
        preSelectedHorseId={preSelectedHorseId}
      />
    </div>
  );
}
