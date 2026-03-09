import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Mail, CheckCircle2 } from "lucide-react";
import type { ExtendedCanvasDocument } from "@/pages/MeinOffice";
import { exportCanvasToPdf } from "@/components/office/canvas/canvasPdfExport";
import type { CanvasDocument } from "@/components/office/canvas/types";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { openWhatsApp, waTextPdfShare } from "@/lib/whatsappTemplates";

interface OfficePdfShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ExtendedCanvasDocument | null;
  /** Optional: Kundenname für vorausgefüllte WhatsApp-Nachricht */
  customerName?: string | null;
  /** Optional: Telefonnummer des Kunden */
  customerPhone?: string | null;
  /** Optional: Pferdename */
  horseName?: string | null;
}

export function OfficePdfShareDialog({ 
  open, onOpenChange, document: doc,
  customerName, customerPhone, horseName,
}: OfficePdfShareDialogProps) {
  const { isWhatsApp } = useCommunicationMode();

  if (!doc) return null;

  const handleDownload = async () => {
    try {
      const pdf = await exportCanvasToPdf(doc as CanvasDocument);
      pdf.save(`${doc.title || "Dokument"}.pdf`);
    } catch { /* ignore */ }
  };

  const handleWhatsApp = () => {
    if (isWhatsApp && customerPhone) {
      const text = waTextPdfShare(
        customerName || "",
        horseName || doc.title || "Dokument",
        new Date().toLocaleDateString("de-DE"),
      );
      openWhatsApp(customerPhone, text);
    } else {
      // Fallback: generic WhatsApp share
      const text = encodeURIComponent(
        `Hallo, hier ist der Bericht "${doc.title}" vom ${new Date().toLocaleDateString("de-DE")}.`
      );
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(doc.title || "Dokument");
    const body = encodeURIComponent(
      `Hallo,\n\nim Anhang findest du den Bericht "${doc.title}".\n\nMit freundlichen Grüßen`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            PDF erstellt!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Herunterladen
          </Button>
          {isWhatsApp ? (
            <Button 
              className="w-full justify-start gap-3 h-11 bg-[#F5970A] hover:bg-[#F5970A]/90 text-white"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Per WhatsApp teilen
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Per WhatsApp teilen
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleEmail}>
            <Mail className="h-4 w-4" />
            Per E-Mail senden
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Das PDF wird lokal auf deinem Gerät generiert.
        </p>
      </DialogContent>
    </Dialog>
  );
}
