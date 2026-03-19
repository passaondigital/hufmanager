import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Download, Share2, QrCode, Shield } from "lucide-react";
import { toast } from "sonner";

export function MyQRCode() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-qr-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, readable_id, avatar_url, role")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (!profile?.readable_id) return null;

  const connectUrl = `${window.location.origin}/hm-connect?id=${profile.readable_id}`;

  const roleLabels: Record<string, string> = {
    provider: "Hufbearbeiter",
    client: "Pferdebesitzer",
    partner: "Fachpartner",
    employee: "Mitarbeiter",
  };

  const prefixMap: Record<string, string> = {
    provider: "#PID",
    client: "#KID",
    partner: "#PRID",
    employee: "#EID",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(connectUrl);
    setCopied(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `HufManager verbinden`,
          text: `Verbinde dich mit mir auf HufManager: ${profile.readable_id}`,
          url: connectUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const svgElement = document.getElementById("hm-connect-qr");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `hufmanager-qr-${profile.readable_id}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Mein QR-Code
        </CardTitle>
        <CardDescription>
          Andere können diesen Code scannen, um sich direkt mit dir zu verbinden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(profile.full_name || "?").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{profile.full_name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {prefixMap[profile.role || ""] || "#"}-{profile.readable_id}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {roleLabels[profile.role || ""] || profile.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-6 bg-white rounded-xl border border-border">
          <QRCodeSVG
            id="hm-connect-qr"
            value={connectUrl}
            size={200}
            level="M"
            includeMargin
            fgColor="#1a1a2e"
            bgColor="#ffffff"
          />
        </div>

        {/* Connect Link */}
        <div className="flex gap-2">
          <Input
            value={connectUrl}
            readOnly
            className="text-xs font-mono bg-muted/30"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Teilen
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Herunterladen
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          Daten werden erst nach beidseitiger Bestätigung geteilt
        </p>
      </CardContent>
    </Card>
  );
}
