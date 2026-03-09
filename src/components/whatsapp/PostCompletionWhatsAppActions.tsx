import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, FileText, CalendarPlus, CheckCircle2 } from "lucide-react";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { openWhatsApp, waTextReportReady, waTextInvoice, waTextNextAppointment } from "@/lib/whatsappTemplates";

interface PostCompletionWhatsAppActionsProps {
  customerName: string;
  customerPhone: string | null;
  horseName: string;
  /** Wird nur angezeigt wenn isWhatsApp === true */
  show: boolean;
  onDismiss?: () => void;
}

/**
 * Action-Banner nach Termin-Abschluss.
 * Zeigt WhatsApp-Schnellaktionen nur für Provider im WhatsApp-Modus.
 */
export function PostCompletionWhatsAppActions({
  customerName,
  customerPhone,
  horseName,
  show,
  onDismiss,
}: PostCompletionWhatsAppActionsProps) {
  const { isWhatsApp } = useCommunicationMode();

  if (!show || !isWhatsApp || !customerPhone) return null;

  return (
    <Card className="border-[#F5970A]/30 bg-[#F5970A]/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Termin abgeschlossen
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-[#F5970A] hover:bg-[#F5970A]/90 text-white"
            onClick={() => openWhatsApp(customerPhone, waTextReportReady(customerName, horseName))}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Befund teilen
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openWhatsApp(customerPhone, waTextInvoice(customerName, "–", "–"))}
          >
            <FileText className="h-3.5 w-3.5" />
            Rechnung senden
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openWhatsApp(customerPhone, waTextNextAppointment(customerName, horseName))}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Nächsten Termin anfragen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
