import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCw, Download, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
  fileType?: string;
  /** Enable screenshot protection overlay */
  protectScreenshot?: boolean;
}

/**
 * In-App Document Viewer for PDF, JPEG, PNG files.
 * Features: zoom, rotate (images), fullscreen, download, optional screenshot protection.
 */
export function DocumentViewer({ open, onClose, url, fileName, fileType, protectScreenshot = false }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPdf = fileType?.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
  const isImage = !isPdf;

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setRotation(0);
      setIsFullscreen(false);
    }
  }, [open]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  const fileExt = fileName.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden",
          isFullscreen ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none" : "max-w-4xl w-[95vw] max-h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="shrink-0">{fileExt}</Badge>
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} title="Verkleinern">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Vergrößern">
              <ZoomIn className="h-4 w-4" />
            </Button>
            {isImage && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRotate} title="Drehen">
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Vollbild">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Herunterladen">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Viewer area */}
        <div
          className={cn(
            "relative overflow-auto bg-muted/30 flex items-center justify-center",
            isFullscreen ? "h-[calc(100vh-48px)]" : "h-[70vh]",
            protectScreenshot && "select-none"
          )}
          style={protectScreenshot ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}
        >
          {/* Screenshot protection watermark overlay */}
          {protectScreenshot && (
            <div
              className="absolute inset-0 z-10 pointer-events-none opacity-[0.04] text-foreground"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='14' font-family='monospace' fill='currentColor' transform='rotate(-30 100 100)'%3EVERTRAULICH%3C/text%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            />
          )}

          {isPdf ? (
            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              title={fileName}
            />
          ) : (
            <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
              <img
                src={url}
                alt={fileName}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
                draggable={false}
                onContextMenu={protectScreenshot ? (e) => e.preventDefault() : undefined}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
