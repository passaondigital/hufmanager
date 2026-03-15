import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, QrCode, RefreshCw, Share2, Loader2 } from "lucide-react";
import { DemoFeatureHighlight } from "@/components/demo/DemoFeatureHighlight";
import { toast } from "sonner";

interface EmergencyQRCodeProps {
  horseId: string;
  horseName: string;
  horseEqid: string;
}

export function EmergencyQRCode({ horseId, horseName, horseEqid }: EmergencyQRCodeProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const eqid = horseEqid?.replace("#", "") || "";

  useEffect(() => {
    loadOrCreateToken();
  }, [horseId]);

  const loadOrCreateToken = async () => {
    setLoading(true);
    try {
      // Try to load existing token
      const { data } = await supabase
        .from("horse_emergency_tokens" as any)
        .select("token")
        .eq("horse_id", horseId)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        setToken((data as any).token);
      } else {
        // Create new token
        const newToken = crypto.randomUUID();
        await supabase.from("horse_emergency_tokens" as any).insert({
          horse_id: horseId,
          token: newToken,
          created_by: user?.id,
          is_active: true,
        });
        setToken(newToken);
      }
    } catch (err) {
      console.error("Error loading emergency token:", err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    setRegenerating(true);
    try {
      // Deactivate old tokens
      await supabase
        .from("horse_emergency_tokens" as any)
        .update({ is_active: false })
        .eq("horse_id", horseId);

      // Create new
      const newToken = crypto.randomUUID();
      await supabase.from("horse_emergency_tokens" as any).insert({
        horse_id: horseId,
        token: newToken,
        created_by: user?.id,
        is_active: true,
      });
      setToken(newToken);
      toast.success("Neuer QR-Code generiert");
    } catch (err: any) {
      toast.error("Fehler beim Generieren");
    } finally {
      setRegenerating(false);
    }
  };

  const notfallUrl = token && eqid
    ? `${window.location.origin}/notfall/${eqid}/${token}`
    : "";

  const downloadQR = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `notfall-qr-${horseName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR-Code heruntergeladen");
  }, [horseName]);

  const shareQR = async () => {
    if (navigator.share && notfallUrl) {
      try {
        await navigator.share({
          title: `Notfall QR-Code: ${horseName}`,
          text: `Notfall-Zugang für ${horseName}`,
          url: notfallUrl,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(notfallUrl);
      toast.success("Link kopiert");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!notfallUrl) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <DemoFeatureHighlight label="Stalltor-QR für Notfall-Zugang" delay={800} />
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Notfall QR-Code</h4>
          <Badge variant="secondary" className="text-[10px] ml-auto">Stalltor</Badge>
        </div>

        <div ref={canvasRef} className="flex justify-center">
          <div className="p-3 bg-white rounded-lg inline-block">
            <QRCodeCanvas
              value={notfallUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#09090b"
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {horseName} {horseEqid && <span className="font-mono">#{eqid}</span>}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={downloadQR}>
            <Download className="h-3.5 w-3.5" /> Herunterladen
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={shareQR}>
            <Share2 className="h-3.5 w-3.5" /> Teilen
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={regenerateToken} disabled={regenerating}>
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
