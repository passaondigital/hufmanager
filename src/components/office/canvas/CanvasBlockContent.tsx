import { useRef, useCallback } from "react";
import { CanvasBlock, GraphicType, AutoInfoType, GRAPHIC_TYPE_LABELS, AUTO_INFO_LABELS } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface CanvasBlockContentProps {
  block: CanvasBlock;
  onChange: (block: CanvasBlock) => void;
  scale: number;
}

export function CanvasBlockContent({ block, onChange, scale }: CanvasBlockContentProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const drawRef = useRef<SignatureCanvas>(null);

  const update = (patch: Partial<CanvasBlock>) => onChange({ ...block, ...patch });

  switch (block.type) {
    case "text":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          <Input
            value={block.value || ""}
            onChange={(e) => update({ value: e.target.value })}
            placeholder={block.placeholder || "Text eingeben..."}
            className="flex-1 text-xs h-auto border-muted bg-transparent"
          />
        </div>
      );

    case "textarea":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          <Textarea
            value={block.value || ""}
            onChange={(e) => update({ value: e.target.value })}
            placeholder={block.placeholder || "Mehrzeiliger Text..."}
            className="flex-1 text-xs resize-none border-muted bg-transparent min-h-0"
          />
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col h-full p-2 overflow-auto">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1">{block.label}</label>}
          <div className="space-y-1">
            {(block.checkboxItems || []).map((item, i) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(c) => {
                    const items = [...(block.checkboxItems || [])];
                    items[i] = { ...items[i], checked: !!c };
                    update({ checkboxItems: items });
                  }}
                  className="h-3 w-3"
                />
                <span className="text-[10px]">{item.label || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "dropdown":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          <Select value={block.value || ""} onValueChange={(v) => update({ value: v })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {(block.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "scale": {
      const min = block.scaleMin ?? 1;
      const max = block.scaleMax ?? 5;
      const val = block.scaleValue ?? 0;
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          <div className="flex items-center gap-1 flex-1">
            {Array.from({ length: max - min + 1 }, (_, i) => {
              const n = min + i;
              return (
                <button
                  key={n}
                  onClick={() => update({ scaleValue: n })}
                  className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                    val === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "date":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label || "Datum"}</label>}
          <Input
            type={block.showTimestamp ? "datetime-local" : "date"}
            value={block.value || ""}
            onChange={(e) => update({ value: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );

    case "image":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          {block.imageUrl ? (
            <div className="relative flex-1 min-h-0">
              <img src={block.imageUrl} alt="" className="w-full h-full object-contain rounded" />
              <button
                onClick={() => update({ imageUrl: undefined })}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded cursor-pointer hover:border-primary/50 transition-colors">
              <ImagePlus className="h-6 w-6 text-muted-foreground/40 mb-1" />
              <span className="text-[9px] text-muted-foreground">Foto hochladen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => update({ imageUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      );

    case "signature":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label || "Unterschrift"}</label>}
          {block.signatureDataUrl ? (
            <div className="relative flex-1 min-h-0">
              <img src={block.signatureDataUrl} alt="Unterschrift" className="w-full h-full object-contain" />
              <button
                onClick={() => update({ signatureDataUrl: undefined })}
                className="absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 border-2 border-dashed border-muted-foreground/30 rounded bg-white relative">
              <SignatureCanvas
                ref={sigRef}
                penColor="#111827"
                minWidth={2}
                maxWidth={4}
                velocityFilterWeight={0.7}
                canvasProps={{
                  className: "w-full h-full",
                  style: { width: "100%", height: "100%" },
                }}
                onEnd={() => {
                  if (sigRef.current) {
                    update({ signatureDataUrl: sigRef.current.toDataURL() });
                  }
                }}
              />
              <button
                onClick={() => { sigRef.current?.clear(); update({ signatureDataUrl: undefined }); }}
                className="absolute bottom-1 right-1 text-[9px] text-muted-foreground hover:text-destructive"
              >
                Löschen
              </button>
            </div>
          )}
        </div>
      );

    case "draw":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label || "Zeichnung"}</label>}
          <div className="flex gap-1 mb-1">
            {["#000000", "#dc2626", "#2563eb", "#16a34a"].map((c) => (
              <button
                key={c}
                onClick={() => update({ drawColor: c })}
                className={`h-4 w-4 rounded-full border ${block.drawColor === c ? "ring-2 ring-primary ring-offset-1" : "border-border"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex-1 min-h-0 border rounded bg-white relative">
            <SignatureCanvas
              ref={drawRef}
              penColor={block.drawColor || "#000000"}
              canvasProps={{
                className: "w-full h-full",
                style: { width: "100%", height: "100%" },
              }}
              onEnd={() => {
                if (drawRef.current) {
                  update({ drawingDataUrl: drawRef.current.toDataURL() });
                }
              }}
            />
            <button
              onClick={() => { drawRef.current?.clear(); update({ drawingDataUrl: undefined }); }}
              className="absolute bottom-1 right-1 text-[9px] text-muted-foreground hover:text-destructive"
            >
              Löschen
            </button>
          </div>
        </div>
      );

    case "graphic":
      return (
        <div className="flex flex-col h-full p-2">
          {block.label && <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">{block.label}</label>}
          <div className="flex-1 min-h-0 relative border rounded bg-white overflow-hidden">
            <GraphicSvg type={block.graphicType || "horse-side"} />
            {/* Annotation overlay */}
            <div className="absolute inset-0">
              <SignatureCanvas
                penColor="#dc2626"
                minWidth={1.5}
                maxWidth={2.5}
                canvasProps={{
                  className: "w-full h-full",
                  style: { width: "100%", height: "100%" },
                }}
                onEnd={() => {
                  // Could capture annotation
                }}
              />
            </div>
          </div>
          <span className="text-[8px] text-muted-foreground mt-0.5">{GRAPHIC_TYPE_LABELS[block.graphicType || "horse-side"]} – Rot markieren</span>
        </div>
      );

    case "auto-info": {
      const infoType = block.autoInfoType || "datum";
      let displayValue = "";
      if (infoType === "datum") displayValue = new Date().toLocaleDateString("de-DE");
      else if (infoType === "zeitstempel") displayValue = new Date().toLocaleString("de-DE");
      else displayValue = `[${AUTO_INFO_LABELS[infoType]}]`;

      return (
        <div className="flex flex-col h-full p-2">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 truncate">
            {AUTO_INFO_LABELS[infoType]}
          </label>
          <div className="flex-1 flex items-center px-2 bg-muted/30 rounded text-xs text-foreground">
            {displayValue}
          </div>
        </div>
      );
    }

    default:
      return <div className="p-2 text-xs text-muted-foreground">Unbekannter Block</div>;
  }
}

// Simple anatomical SVG graphics
function GraphicSvg({ type }: { type: GraphicType }) {
  const common = "w-full h-full p-2";

  switch (type) {
    case "horse-side":
      return (
        <svg viewBox="0 0 400 300" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          {/* Simple horse side silhouette */}
          <path d="M80 180 Q60 140 70 100 Q75 80 90 75 L100 60 Q105 50 115 55 L120 65 Q130 60 140 65 L135 80 Q150 85 160 90 Q200 95 240 100 Q280 105 300 110 Q320 115 330 130 Q340 145 335 160 L330 180" strokeWidth="2" />
          {/* Legs */}
          <line x1="120" y1="180" x2="115" y2="260" /><line x1="115" y1="260" x2="110" y2="280" />
          <line x1="160" y1="180" x2="155" y2="260" /><line x1="155" y1="260" x2="150" y2="280" />
          <line x1="280" y1="180" x2="275" y2="260" /><line x1="275" y1="260" x2="270" y2="280" />
          <line x1="310" y1="180" x2="305" y2="260" /><line x1="305" y1="260" x2="300" y2="280" />
          {/* Tail */}
          <path d="M335 130 Q360 120 370 140 Q375 160 360 170" />
          {/* Ground */}
          <line x1="60" y1="282" x2="380" y2="282" strokeDasharray="4 2" stroke="#d1d5db" />
          <text x="200" y="296" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Seitenansicht</text>
        </svg>
      );
    case "hoof-bottom":
      return (
        <svg viewBox="0 0 300 280" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <ellipse cx="150" cy="140" rx="100" ry="110" strokeWidth="2" />
          {/* Frog / Strahl */}
          <path d="M150 60 L120 180 L150 200 L180 180 Z" strokeWidth="1" />
          {/* Sole areas */}
          <path d="M90 120 Q100 100 120 90" strokeDasharray="3 2" />
          <path d="M210 120 Q200 100 180 90" strokeDasharray="3 2" />
          <text x="150" y="270" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Hufsohle</text>
        </svg>
      );
    case "hoof-side":
      return (
        <svg viewBox="0 0 300 280" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <path d="M80 60 Q90 40 120 30 Q160 20 180 40 L190 80 Q200 120 200 160 L210 200 Q215 230 200 250 L60 250 Q50 230 60 200 L65 160 Q65 120 70 80 Z" strokeWidth="2" />
          {/* Coronet band */}
          <path d="M75 80 Q130 60 190 80" strokeDasharray="3 2" />
          {/* Ground */}
          <line x1="40" y1="252" x2="240" y2="252" strokeDasharray="4 2" stroke="#d1d5db" />
          <text x="140" y="270" textAnchor="middle" fontSize="10" fill="#94a3b8" stroke="none">Huf seitlich</text>
        </svg>
      );
    case "hooves-all":
      return (
        <svg viewBox="0 0 400 300" className={common} fill="none" stroke="#94a3b8" strokeWidth="1.5">
          {/* 4 small hooves */}
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
          {/* Joints */}
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
