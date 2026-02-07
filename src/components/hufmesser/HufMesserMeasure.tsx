import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown, ArrowLeftRight, RotateCcw, Check, ZoomIn, Move
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HufMesserMeasureProps {
  imageDataUrl: string;
  onMeasured: (lengthMm: number, widthMm: number) => void;
  onRetake: () => void;
  hoofLabel: string;
}

type MeasureMode = "reference" | "length" | "width" | "done";

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
}

export function HufMesserMeasure({
  imageDataUrl,
  onMeasured,
  onRetake,
  hoofLabel,
}: HufMesserMeasureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<MeasureMode>("reference");
  const [referenceLength, setReferenceLength] = useState<number>(0);
  const [referenceLine, setReferenceLine] = useState<Line | null>(null);
  const [lengthLine, setLengthLine] = useState<Line | null>(null);
  const [widthLine, setWidthLine] = useState<Line | null>(null);
  const [currentStart, setCurrentStart] = useState<Point | null>(null);
  const [referenceRealMm, setReferenceRealMm] = useState<number>(50);

  // Pixel per mm ratio
  const [pxPerMm, setPxPerMm] = useState<number>(0);

  const getCanvasPoint = useCallback(
    (e: React.TouchEvent | React.MouseEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const lineLength = (line: Line): number => {
    return Math.sqrt(
      Math.pow(line.end.x - line.start.x, 2) +
      Math.pow(line.end.y - line.start.y, 2)
    );
  };

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const drawLine = (line: Line, color: string, label: string, valueMm?: number) => {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.stroke();

      // Endpoints
      for (const point of [line.start, line.end]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const midX = (line.start.x + line.end.x) / 2;
      const midY = (line.start.y + line.end.y) / 2;
      const text = valueMm ? `${label}: ${Math.round(valueMm)}mm` : label;

      ctx.font = "bold 16px sans-serif";
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(midX - textWidth / 2 - 6, midY - 22, textWidth + 12, 28);
      ctx.fillStyle = "white";
      ctx.fillText(text, midX - textWidth / 2, midY);
    };

    // Draw reference line
    if (referenceLine) {
      drawLine(referenceLine, "#ffaa00", "Referenz", referenceRealMm);
    }

    // Draw length line
    if (lengthLine) {
      const valueMm = pxPerMm > 0 ? lineLength(lengthLine) / pxPerMm : undefined;
      drawLine(lengthLine, "#0088ff", "Länge", valueMm);
    }

    // Draw width line
    if (widthLine) {
      const valueMm = pxPerMm > 0 ? lineLength(widthLine) / pxPerMm : undefined;
      drawLine(widthLine, "#00cc44", "Breite", valueMm);
    }
  }, [referenceLine, lengthLine, widthLine, pxPerMm, referenceRealMm]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        drawScene();
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (mode === "done") return;
    const point = getCanvasPoint(e);
    if (point) setCurrentStart(point);
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (mode === "done" || !currentStart) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    const newLine: Line = { start: currentStart, end: point };

    if (mode === "reference") {
      setReferenceLine(newLine);
      const refPx = lineLength(newLine);
      const ratio = refPx / referenceRealMm;
      setPxPerMm(ratio);
      setMode("length");
    } else if (mode === "length") {
      setLengthLine(newLine);
      setMode("width");
    } else if (mode === "width") {
      setWidthLine(newLine);
      setMode("done");

      // Calculate final measurements
      if (pxPerMm > 0) {
        const lengthMm = lengthLine ? lineLength(lengthLine) / pxPerMm : 0;
        const widthMm = lineLength(newLine) / pxPerMm;
        // Delay to show result
        setTimeout(() => {
          onMeasured(Math.round(lengthMm), Math.round(widthMm));
        }, 500);
      }
    }

    setCurrentStart(null);
  };

  const resetMeasurement = () => {
    setMode("reference");
    setReferenceLine(null);
    setLengthLine(null);
    setWidthLine(null);
    setPxPerMm(0);
    setCurrentStart(null);
    drawScene();
  };

  const STEPS = [
    {
      mode: "reference" as MeasureMode,
      label: "Referenzlinie",
      description: "Ziehe eine Linie entlang eines bekannten Maßes (z.B. Lineal, Münze = 25mm)",
      color: "text-amber-500",
    },
    {
      mode: "length" as MeasureMode,
      label: "Länge messen",
      description: "Ziehe eine Linie von der Zehe bis zur breitesten Stelle des Strahls",
      color: "text-blue-500",
    },
    {
      mode: "width" as MeasureMode,
      label: "Breite messen",
      description: "Ziehe eine Linie an der breitesten Stelle des Hufs",
      color: "text-green-500",
    },
    {
      mode: "done" as MeasureMode,
      label: "Fertig",
      description: "Messung abgeschlossen!",
      color: "text-primary",
    },
  ];

  const currentStep = STEPS.find((s) => s.mode === mode) || STEPS[0];
  const stepIndex = STEPS.findIndex((s) => s.mode === mode);

  return (
    <div className="space-y-3">
      {/* Step indicator */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((step, i) => (
              <div key={step.mode} className="flex items-center gap-1">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    i < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === stepIndex
                      ? "bg-primary/20 text-primary ring-2 ring-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-6 h-0.5",
                      i < stepIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className={cn("font-semibold text-sm", currentStep.color)}>
            {currentStep.label}
          </p>
          <p className="text-xs text-muted-foreground">{currentStep.description}</p>

          {/* Reference size input */}
          {mode === "reference" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Referenz-Maß:</span>
              <div className="flex items-center gap-1">
                {[25, 50, 100, 150].map((mm) => (
                  <Button
                    key={mm}
                    variant={referenceRealMm === mm ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setReferenceRealMm(mm)}
                  >
                    {mm}mm
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canvas with image */}
      <div ref={containerRef} className="relative rounded-lg overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          className="w-full h-auto touch-none"
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetake} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          Neues Foto
        </Button>
        <Button variant="outline" size="sm" onClick={resetMeasurement} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          Messung zurücksetzen
        </Button>
      </div>
    </div>
  );
}
