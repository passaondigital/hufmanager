import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import jsPDF from "jspdf";

interface OrderData {
  order_number: string;
  service_description: string;
  service_date: string | null;
  estimated_price: number | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
  horse_name?: string;
  horse_breed?: string;
  client_name?: string;
  client_readable_id?: string;
  provider_name?: string;
}

interface Props {
  order: OrderData;
  open: boolean;
  onClose: () => void;
}

export function ServiceOrderPDF({ order, open, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(10);
    doc.text("HufManager", margin, y);
    doc.text("hufiapp.de", margin + 100, y);
    y += 15;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BEHANDLUNGSAUFTRAG", margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Auftragsnummer: ${order.order_number}`, margin, y);
    y += 15;

    // Auftraggeber
    doc.setFont("helvetica", "bold");
    doc.text("AUFTRAGGEBER (Pferdebesitzer):", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${order.client_name || "–"}`, margin, y); y += 6;
    if (order.client_readable_id) {
      doc.text(`#KID: ${order.client_readable_id}`, margin, y); y += 6;
    }
    y += 5;

    // Auftragnehmer
    doc.setFont("helvetica", "bold");
    doc.text("AUFTRAGNEHMER (Dienstleister):", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${order.provider_name || "–"}`, margin, y); y += 6;
    y += 5;

    // Pferd
    doc.setFont("helvetica", "bold");
    doc.text("PFERD:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${order.horse_name || "–"}`, margin, y); y += 6;
    if (order.horse_breed) {
      doc.text(`Rasse: ${order.horse_breed}`, margin, y); y += 6;
    }
    y += 5;

    // Leistung
    doc.setFont("helvetica", "bold");
    doc.text("LEISTUNGSBESCHREIBUNG:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(order.service_description, 170);
    doc.text(descLines, margin, y);
    y += descLines.length * 6 + 5;

    if (order.service_date) {
      doc.text(`Wunschtermin: ${format(new Date(order.service_date), "dd.MM.yyyy", { locale: de })}`, margin, y);
      y += 6;
    }
    if (order.estimated_price) {
      doc.text(`Geschätzte Vergütung: ${order.estimated_price.toFixed(2)} €`, margin, y);
      y += 6;
    }
    y += 10;

    // Signatures
    if (order.client_signed_at) {
      doc.text(`AUFTRAGGEBER bestätigt am: ${format(new Date(order.client_signed_at), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}`, margin, y);
      y += 6;
    }
    if (order.provider_signed_at) {
      doc.text(`AUFTRAGNEHMER bestätigt am: ${format(new Date(order.provider_signed_at), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}`, margin, y);
      y += 6;
    }
    y += 10;

    // Disclaimer
    doc.setDrawColor(180);
    doc.line(margin, y, 190, y);
    y += 8;
    doc.setFontSize(9);
    const disclaimer = "Hinweis: HufManager ist nicht Vertragspartei. Dieses Dokument dient der Dokumentation. Die rechtliche Verantwortung liegt bei Auftraggeber und Auftragnehmer.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, 170);
    doc.text(disclaimerLines, margin, y);
    y += disclaimerLines.length * 5 + 10;

    doc.line(margin, y, 190, y);
    y += 8;
    doc.text("Erstellt mit HufManager · hufiapp.de", margin, y);

    doc.save(`${order.order_number}.pdf`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Behandlungsauftrag {order.order_number}</DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-4 text-sm">
          <div className="text-center">
            <h3 className="text-lg font-bold">BEHANDLUNGSAUFTRAG</h3>
            <p className="text-muted-foreground">{order.order_number}</p>
          </div>

          <Separator />

          <div>
            <p className="font-semibold">AUFTRAGGEBER:</p>
            <p>{order.client_name || "–"}</p>
            {order.client_readable_id && <p className="text-muted-foreground">{order.client_readable_id}</p>}
          </div>

          <div>
            <p className="font-semibold">AUFTRAGNEHMER:</p>
            <p>{order.provider_name || "–"}</p>
          </div>

          <div>
            <p className="font-semibold">PFERD:</p>
            <p>{order.horse_name} {order.horse_breed && `· ${order.horse_breed}`}</p>
          </div>

          <div>
            <p className="font-semibold">LEISTUNG:</p>
            <p>{order.service_description}</p>
            {order.service_date && <p>Wunschtermin: {format(new Date(order.service_date), "dd.MM.yyyy", { locale: de })}</p>}
            {order.estimated_price && <p>Vergütung: {order.estimated_price.toFixed(2)} €</p>}
          </div>

          <Separator />

          {order.client_signed_at && (
            <p className="text-xs text-muted-foreground">
              Auftraggeber bestätigt: {format(new Date(order.client_signed_at), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}
            </p>
          )}
          {order.provider_signed_at && (
            <p className="text-xs text-muted-foreground">
              Auftragnehmer bestätigt: {format(new Date(order.provider_signed_at), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}
            </p>
          )}

          <div className="bg-muted/50 border border-border rounded p-3 text-xs text-muted-foreground">
            HufManager ist nicht Vertragspartei. Dieses Dokument dient der Dokumentation. Die rechtliche Verantwortung liegt bei Auftraggeber und Auftragnehmer.
          </div>
        </div>

        <Button onClick={generatePDF} className="w-full gap-2">
          <FileDown className="h-4 w-4" /> Als PDF herunterladen
        </Button>
      </DialogContent>
    </Dialog>
  );
}
