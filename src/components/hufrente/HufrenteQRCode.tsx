import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HufrenteQRCodeProps {
  url: string;
}

export function HufrenteQRCode({ url }: HufrenteQRCodeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadQR = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "hufrente-qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast({
      title: "QR-Code heruntergeladen!",
      description: "Du findest ihn in deinem Downloads-Ordner.",
    });
  }, []);

  if (!url || url.includes("...")) {
    return (
      <div className="border border-dashed border-border rounded-xl p-6 text-center">
        <QrCode className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">QR-Code wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-6 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">
        Dein QR-Code für Visitenkarten und Ausdrucke
      </p>
      <div ref={canvasRef} className="inline-block p-3 bg-white rounded-lg">
        <QRCodeCanvas
          value={url}
          size={180}
          bgColor="#ffffff"
          fgColor="#09090b"
          level="M"
          includeMargin={false}
        />
      </div>
      <div>
        <Button variant="outline" size="sm" className="gap-2" onClick={downloadQR}>
          <Download className="h-4 w-4" />
          QR-Code herunterladen
        </Button>
      </div>
    </div>
  );
}
