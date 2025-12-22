import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title?: string;
  fileName?: string;
}

export function PdfPreviewDialog({
  open,
  onClose,
  pdfBlob,
  title = "PDF Vorschau",
  fileName = "Rechnung.pdf",
}: PdfPreviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob]);

  const handleDownload = () => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "PDF heruntergeladen" });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!pdfBlob}
              >
                <Download className="h-4 w-4 mr-2" />
                Herunterladen
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Vorschau"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
