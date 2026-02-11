import { useRef, useEffect, useCallback, useState } from "react";
import { CanvasBlock, GraphicType, GRAPHIC_TYPE_LABELS } from "./types";
import SignatureCanvas from "react-signature-canvas";
import { Undo2, Eraser, Pen } from "lucide-react";
import graphicHorseSide from "@/assets/graphic-horse-side.png";

interface GraphicAnnotationBlockProps {
  block: CanvasBlock;
  onChange: (block: CanvasBlock) => void;
  scale: number;
}

export function GraphicAnnotationBlock({ block, onChange, scale }: GraphicAnnotationBlockProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [penColor, setPenColor] = useState("#dc2626");

  const update = (patch: Partial<CanvasBlock>) => onChange({ ...block, ...patch });

  // Fix canvas resolution to match container size - fixes cursor offset
  const resizeCanvas = useCallback(() => {
    if (!sigRef.current || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const canvas = sigRef.current.getCanvas();
    const rect = container.getBoundingClientRect();
    
    // Save existing drawing
    const existingData = block.graphicAnnotationUrl;
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Restore existing drawing
    if (existingData && sigRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingData;
    }
  }, [block.graphicAnnotationUrl]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const handleStrokeEnd = () => {
    if (!sigRef.current) return;
    const dataUrl = sigRef.current.toDataURL();
    setHistory((prev) => [...prev, block.graphicAnnotationUrl || ""]);
    update({ graphicAnnotationUrl: dataUrl });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    update({ graphicAnnotationUrl: prev || undefined });

    // Redraw canvas
    if (sigRef.current) {
      sigRef.current.clear();
      if (prev) {
        const canvas = sigRef.current.getCanvas();
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = prev;
      }
    }
  };

  const handleClear = () => {
    if (block.graphicAnnotationUrl) {
      setHistory((prev) => [...prev, block.graphicAnnotationUrl || ""]);
    }
    sigRef.current?.clear();
    update({ graphicAnnotationUrl: undefined });
  };

  const colors = ["#dc2626", "#000000", "#2563eb", "#16a34a", "#f59e0b"];

  return (
    <div className="flex flex-col h-full p-2">
      {block.label && (
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">
          {block.label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1">
        <Pen className="h-3 w-3 text-muted-foreground" />
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setPenColor(c)}
            className={`h-4 w-4 rounded-full border-2 transition-all ${
              penColor === c ? "ring-2 ring-primary ring-offset-1 scale-110" : "border-border"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="flex-1" />
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="Rückgängig"
        >
          <Undo2 className="h-3 w-3" />
        </button>
        <button
          onClick={handleClear}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
          title="Alles löschen"
        >
          <Eraser className="h-3 w-3" />
        </button>
      </div>

      {/* Graphic + annotation overlay */}
      <div className="flex-1 min-h-0 relative border rounded bg-white overflow-hidden">
        <GraphicImage type={block.graphicType || "horse-side"} customImageUrl={block.imageUrl} />
        {/* Annotation canvas overlay */}
        <div ref={canvasContainerRef} className="absolute inset-0">
          <SignatureCanvas
            ref={sigRef}
            penColor={penColor}
            minWidth={1.5}
            maxWidth={2.5}
            velocityFilterWeight={0.7}
            canvasProps={{
              className: "w-full h-full",
              style: { width: "100%", height: "100%", touchAction: "none" },
            }}
            onEnd={handleStrokeEnd}
          />
        </div>
      </div>
      <span className="text-[8px] text-muted-foreground mt-0.5">
        {block.graphicType && GRAPHIC_TYPE_LABELS[block.graphicType]
          ? GRAPHIC_TYPE_LABELS[block.graphicType]
          : "Eigene Grafik"}{" "}
        – Markieren mit Stift
      </span>
    </div>
  );
}

// Renders the background graphic
function GraphicImage({ type, customImageUrl }: { type: GraphicType; customImageUrl?: string }) {
  const common = "w-full h-full p-2";

  // Custom uploaded image
  if (customImageUrl) {
    return <img src={customImageUrl} alt="Benutzerdefinierte Grafik" className={common + " object-contain"} />;
  }

  switch (type) {
    case "horse-side":
      return <img src={graphicHorseSide} alt="Pferd Seitenansicht" className={common + " object-contain"} />;
    case "hoof-bottom":
      return (
        <svg viewBox="0 0 300 280" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <ellipse cx="150" cy="140" rx="100" ry="110" strokeWidth="2" />
          <path d="M150 60 L120 180 L150 200 L180 180 Z" strokeWidth="1" />
          <path d="M90 120 Q100 100 120 90" strokeDasharray="3 2" />
          <path d="M210 120 Q200 100 180 90" strokeDasharray="3 2" />
          <text x="150" y="270" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Hufsohle</text>
        </svg>
      );
    case "hoof-side":
      return (
        <svg viewBox="0 0 300 280" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <path d="M80 60 Q90 40 120 30 Q160 20 180 40 L190 80 Q200 120 200 160 L210 200 Q215 230 200 250 L60 250 Q50 230 60 200 L65 160 Q65 120 70 80 Z" strokeWidth="2" />
          <path d="M75 80 Q130 60 190 80" strokeDasharray="3 2" />
          <line x1="40" y1="252" x2="240" y2="252" strokeDasharray="4 2" stroke="#d1d5db" />
          <text x="140" y="270" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Huf seitlich</text>
        </svg>
      );
    case "hooves-all":
      return (
        <svg viewBox="0 0 400 300" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          {[{ x: 60, y: 20, l: "VL" }, { x: 220, y: 20, l: "VR" }, { x: 60, y: 160, l: "HL" }, { x: 220, y: 160, l: "HR" }].map((h) => (
            <g key={h.l}>
              <ellipse cx={h.x + 60} cy={h.y + 55} rx={50} ry={50} />
              <path d={`M${h.x + 60} ${h.y + 20} L${h.x + 45} ${h.y + 80} L${h.x + 60} ${h.y + 90} L${h.x + 75} ${h.y + 80} Z`} strokeWidth="0.8" />
              <text x={h.x + 60} y={h.y + 118} textAnchor="middle" fontSize="11" fill="#64748b" stroke="none" fontWeight="600">{h.l}</text>
            </g>
          ))}
        </svg>
      );
    case "horse-leg":
      return (
        <svg viewBox="0 0 200 300" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <path d="M80 20 Q75 10 90 5 Q110 5 115 15 L120 40 Q125 80 120 120 L115 160 Q110 180 108 200 L105 230 Q102 250 95 265 L80 270 Q70 265 75 250 L80 230 Q82 210 85 190 L88 160 Q90 140 88 120 L85 80 Q82 50 80 20 Z" strokeWidth="2" />
          <ellipse cx="100" cy="120" rx="15" ry="8" strokeDasharray="2 2" />
          <ellipse cx="98" cy="200" rx="12" ry="6" strokeDasharray="2 2" />
          <line x1="60" y1="272" x2="130" y2="272" strokeDasharray="4 2" stroke="#d1d5db" />
          <text x="100" y="292" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Vorderbein</text>
        </svg>
      );
    default:
      return null;
  }
}
