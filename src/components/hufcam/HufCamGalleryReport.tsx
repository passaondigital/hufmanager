import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Share2,
  Mail,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PhotoData {
  dataUrl: string;
  timestamp: Date;
  analysis?: {
    isAcceptable: boolean;
    score: number;
    feedback: string;
  };
}

interface HoofPhotos {
  [hoofId: string]: {
    [viewId: string]: PhotoData | null;
  };
}

interface HufCamGalleryReportProps {
  isOpen: boolean;
  onClose: () => void;
  photos: HoofPhotos;
  notes: string;
  horseName: string;
  horseBreed?: string;
  ownerName?: string;
  onSave?: (collageUrl: string) => void;
}

const HOOF_LABELS: Record<string, string> = {
  VL: "Vorne Links",
  VR: "Vorne Rechts",
  HL: "Hinten Links",
  HR: "Hinten Rechts",
};

const VIEW_LABELS: Record<string, string> = {
  dorsal: "Dorsal",
  lateral: "Lateral",
  medial: "Medial",
  solar: "Solar",
  palmar: "Palmar/Plantar",
};

export function HufCamGalleryReport({
  isOpen,
  onClose,
  photos,
  notes,
  horseName,
  horseBreed,
  ownerName,
  onSave,
}: HufCamGalleryReportProps) {
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Collect all photos
  const allPhotos: { hoofId: string; viewId: string; photo: PhotoData }[] = [];
  Object.entries(photos).forEach(([hoofId, views]) => {
    Object.entries(views).forEach(([viewId, photo]) => {
      if (photo) {
        allPhotos.push({ hoofId, viewId, photo });
      }
    });
  });

  const photoCount = allPhotos.length;
  const documentedHoofs = [...new Set(allPhotos.map(p => p.hoofId))];

  // Generate Instagram-ready collage
  const generateCollage = useCallback(async () => {
    if (photoCount < 4) {
      toast.error("Mindestens 4 Fotos erforderlich");
      return;
    }

    setIsGeneratingCollage(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // Instagram-optimized dimensions
      const collageSize = 1080;
      const padding = 12;
      const headerHeight = 80;
      const footerHeight = 60;
      const photoAreaHeight = collageSize - headerHeight - footerHeight;

      canvas.width = collageSize;
      canvas.height = collageSize;

      // Dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, collageSize);
      gradient.addColorStop(0, "#0f0f0f");
      gradient.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, collageSize, collageSize);

      // Accent line at top (brand orange)
      ctx.fillStyle = "#F47B20";
      ctx.fillRect(0, 0, collageSize, 4);

      // Header
      ctx.font = "bold 36px 'Outfit', -apple-system, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(`🐴 ${horseName}`, padding + 16, 52);

      if (horseBreed) {
        ctx.font = "16px 'Outfit', sans-serif";
        ctx.fillStyle = "#888888";
        ctx.fillText(horseBreed, padding + 16, 72);
      }

      // Date badge
      const now = new Date();
      const dateStr = now.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      ctx.font = "18px 'Outfit', sans-serif";
      ctx.fillStyle = "#888888";
      ctx.textAlign = "right";
      ctx.fillText(dateStr, collageSize - padding - 16, 52);

      // Calculate grid layout
      const cols = photoCount <= 4 ? 2 : photoCount <= 6 ? 3 : 4;
      const rows = Math.ceil(photoCount / cols);
      const photoWidth = (collageSize - padding * (cols + 1)) / cols;
      const photoHeight = (photoAreaHeight - padding * (rows + 1)) / rows;

      // Load image helper
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      // Draw photos
      for (let i = 0; i < allPhotos.length; i++) {
        const { hoofId, viewId, photo } = allPhotos[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = padding + col * (photoWidth + padding);
        const y = headerHeight + padding + row * (photoHeight + padding);

        try {
          const img = await loadImage(photo.dataUrl);

          // Rounded clip
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, photoWidth, photoHeight, 8);
          ctx.clip();

          // Draw image (cover fit)
          const imgAspect = img.width / img.height;
          const boxAspect = photoWidth / photoHeight;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgAspect > boxAspect) {
            sw = img.height * boxAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / boxAspect;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
          ctx.restore();

          // Position badge (orange pill)
          ctx.fillStyle = "rgba(244, 123, 32, 0.95)";
          const badgeWidth = 48;
          const badgeHeight = 26;
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 6, badgeWidth, badgeHeight, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 13px 'Outfit', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(hoofId, x + 6 + badgeWidth / 2, y + 6 + badgeHeight / 2 + 4);

          // View label (bottom right, subtle)
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.font = "11px 'Outfit', sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(VIEW_LABELS[viewId] || viewId, x + photoWidth - 8, y + photoHeight - 8);

          // Quality indicator if available
          if (photo.analysis) {
            const scoreColor = photo.analysis.score >= 80 ? "#22c55e" : photo.analysis.score >= 60 ? "#eab308" : "#ef4444";
            ctx.fillStyle = scoreColor;
            ctx.beginPath();
            ctx.arc(x + photoWidth - 14, y + 14, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } catch (err) {
          console.error("Error loading image:", err);
        }
      }

      // Footer
      const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      ctx.fillStyle = "#555555";
      ctx.font = "14px 'Outfit', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`📅 ${dateStr} • ${time} • ${photoCount} Fotos`, padding + 16, collageSize - 24);

      // Branding
      ctx.textAlign = "right";
      ctx.fillStyle = "#F47B20";
      ctx.font = "bold 18px 'Outfit', sans-serif";
      ctx.fillText("HufManager.de", collageSize - padding - 16, collageSize - 24);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCollageUrl(dataUrl);
      onSave?.(dataUrl);
      toast.success("Collage erstellt!");
    } catch (error) {
      console.error("Collage generation error:", error);
      toast.error("Fehler beim Erstellen der Collage");
    } finally {
      setIsGeneratingCollage(false);
    }
  }, [allPhotos, horseName, horseBreed, photoCount, onSave]);

  // Generate farrier email
  const generateEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-farrier-email", {
        body: {
          horseName,
          horseBreed,
          ownerName,
          notes,
          photoCount,
          hoofPositions: documentedHoofs.map(h => HOOF_LABELS[h]),
          documentationDate: new Date().toLocaleDateString("de-DE"),
        },
      });

      if (error) throw error;

      setEmailDraft(data.emailDraft);
      setShowEmailModal(true);
    } catch (err) {
      console.error("Email generation error:", err);
      toast.error("Fehler beim Erstellen des E-Mail-Entwurfs");
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // Download collage
  const downloadCollage = () => {
    if (!collageUrl) return;
    const link = document.createElement("a");
    link.download = `${horseName.replace(/\s+/g, "_")}_Hufe_${new Date().toISOString().split("T")[0]}.jpg`;
    link.href = collageUrl;
    link.click();
    toast.success("Collage heruntergeladen");
  };

  // Share collage
  const shareCollage = async () => {
    if (!collageUrl) return;
    try {
      const response = await fetch(collageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${horseName}_Hufe.jpg`, { type: "image/jpeg" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${horseName} - Huf-Dokumentation`,
          text: `Huf-Dokumentation für ${horseName} #HufManager`,
        });
      } else {
        downloadCollage();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Teilen fehlgeschlagen");
        downloadCollage();
      }
    }
  };

  // Copy email to clipboard
  const copyEmail = () => {
    if (!emailDraft) return;
    navigator.clipboard.writeText(emailDraft);
    toast.success("E-Mail kopiert");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Huf-Dokumentation: {horseName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {photoCount} Fotos
              </Badge>
              {documentedHoofs.map(hoofId => (
                <Badge key={hoofId} variant="outline" className="text-sm">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                  {HOOF_LABELS[hoofId]}
                </Badge>
              ))}
            </div>

            {/* Photo Grid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Alle Fotos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {allPhotos.map(({ hoofId, viewId, photo }) => (
                    <div
                      key={`${hoofId}-${viewId}`}
                      className="aspect-square rounded-lg overflow-hidden relative group"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`${hoofId}-${viewId}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-1 left-1 text-white text-[10px] font-medium">
                          {hoofId} • {VIEW_LABELS[viewId]}
                        </div>
                      </div>
                      {photo.analysis && (
                        <div className={cn(
                          "absolute top-1 right-1 w-3 h-3 rounded-full",
                          photo.analysis.score >= 80 ? "bg-green-500" :
                          photo.analysis.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notizen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Collage Preview */}
            {collageUrl && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Fertige Collage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={collageUrl}
                    alt="Huf-Collage"
                    className="w-full rounded-lg border border-border"
                  />
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {!collageUrl ? (
                <Button
                  className="col-span-2"
                  onClick={generateCollage}
                  disabled={isGeneratingCollage || photoCount < 4}
                >
                  {isGeneratingCollage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Erstelle Collage...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Collage generieren
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={downloadCollage}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={shareCollage}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Teilen
                  </Button>
                </>
              )}

              <Button
                variant="secondary"
                className="col-span-2"
                onClick={generateEmail}
                disabled={isGeneratingEmail}
              >
                {isGeneratingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generiere E-Mail...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    E-Mail an Hufbearbeiter erstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Draft Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              E-Mail-Entwurf
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={emailDraft || ""}
              onChange={(e) => setEmailDraft(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyEmail}>
                Text kopieren
              </Button>
              <Button className="flex-1" onClick={() => {
                if (emailDraft) {
                  window.location.href = `mailto:?subject=${encodeURIComponent(`Huf-Dokumentation: ${horseName}`)}&body=${encodeURIComponent(emailDraft)}`;
                }
              }}>
                E-Mail öffnen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
