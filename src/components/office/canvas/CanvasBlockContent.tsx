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
import { GraphicAnnotationBlock } from "./GraphicAnnotationBlock";

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
      return <GraphicAnnotationBlock block={block} onChange={onChange} scale={scale} />;

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

