import { useState, useRef, useCallback } from "react";
import { DocumentBlock, PLACEHOLDER_KEYS, BlockOption } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";

interface BlockRendererProps {
  block: DocumentBlock;
  onChange: (updated: DocumentBlock) => void;
  onDelete: () => void;
  editable?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function BlockRenderer({ block, onChange, onDelete, editable = true, dragHandleProps }: BlockRendererProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const drawRef = useRef<SignatureCanvas>(null);

  const updateValue = (value: string) => onChange({ ...block, value });

  const wrapper = (children: React.ReactNode) => (
    <div className="group relative flex gap-2 items-start py-2">
      {editable && (
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );

  switch (block.type) {
    case "heading":
      const Tag = `h${block.headingLevel || 1}` as keyof JSX.IntrinsicElements;
      const sizes = { 1: "text-2xl font-bold", 2: "text-xl font-semibold", 3: "text-lg font-medium" };
      return wrapper(
        editable ? (
          <input
            className={cn("w-full bg-transparent border-none outline-none", sizes[block.headingLevel || 1])}
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Überschrift eingeben..."
          />
        ) : (
          <Tag className={sizes[block.headingLevel || 1]}>{block.value}</Tag>
        )
      );

    case "text":
      return wrapper(
        editable ? (
          <Textarea
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Text eingeben..."
            className="min-h-[60px] resize-y"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{block.value}</p>
        )
      );

    case "input":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}{block.required && " *"}</Label>}
          <Input
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={block.placeholder || "Eingabe..."}
          />
        </div>
      );

    case "textarea":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <Textarea
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={block.placeholder || "Text eingeben..."}
            rows={block.rows || 3}
            className="resize-y"
          />
        </div>
      );

    case "checkbox":
      return wrapper(
        <div className="flex items-center gap-3">
          <Checkbox
            checked={block.checked || false}
            onCheckedChange={(c) => onChange({ ...block, checked: !!c })}
          />
          {editable ? (
            <input
              className="bg-transparent border-none outline-none text-sm flex-1"
              value={block.label || ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Checkbox-Beschriftung..."
            />
          ) : (
            <Label className="text-sm">{block.label}</Label>
          )}
        </div>
      );

    case "checklist":
      return wrapper(
        <div className="space-y-2">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <div className="space-y-1.5 pl-1">
            {(block.checklistItems || []).map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(c) => {
                    const items = [...(block.checklistItems || [])];
                    items[i] = { ...items[i], checked: !!c };
                    onChange({ ...block, checklistItems: items });
                  }}
                />
                {editable ? (
                  <input
                    className="bg-transparent border-none outline-none text-sm flex-1"
                    value={item.label}
                    onChange={(e) => {
                      const items = [...(block.checklistItems || [])];
                      items[i] = { ...items[i], label: e.target.value };
                      onChange({ ...block, checklistItems: items });
                    }}
                  />
                ) : (
                  <span className="text-sm">{item.label}</span>
                )}
              </div>
            ))}
            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  const items = [...(block.checklistItems || []), { id: crypto.randomUUID(), label: "Neuer Punkt", checked: false }];
                  onChange({ ...block, checklistItems: items });
                }}
              >
                + Punkt hinzufügen
              </Button>
            )}
          </div>
        </div>
      );

    case "dropdown":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <Select value={block.value || ""} onValueChange={updateValue}>
            <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
            <SelectContent>
              {(block.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "date":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label || "Datum"}</Label>}
          <Input type="date" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} />
        </div>
      );

    case "time":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label || "Uhrzeit"}</Label>}
          <Input type="time" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} />
        </div>
      );

    case "number":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <Input type="number" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} placeholder="0" />
        </div>
      );

    case "table":
      const rows = block.rows || 3;
      const cols = block.cols || 3;
      const data = block.tableData || Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ value: "" })));
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} className="border-b last:border-b-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-r last:border-r-0 p-0">
                        <input
                          className="w-full p-2 bg-transparent outline-none text-sm"
                          value={cell.value}
                          onChange={(e) => {
                            const newData = data.map((r) => r.map((c) => ({ ...c })));
                            newData[ri][ci].value = e.target.value;
                            onChange({ ...block, tableData: newData });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "image":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          {block.imageUrl ? (
            <div className="relative">
              <img src={block.imageUrl} alt="" className="max-h-48 rounded-lg object-contain" />
              {editable && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => onChange({ ...block, imageUrl: undefined })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Bild hochladen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => onChange({ ...block, imageUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      );

    case "signature":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          {block.signatureDataUrl ? (
            <div className="relative border rounded-lg p-2">
              <img src={block.signatureDataUrl} alt="Unterschrift" className="max-h-24 object-contain" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1"
                onClick={() => onChange({ ...block, signatureDataUrl: undefined })}
              >
                Löschen
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg">
              <SignatureCanvas
                ref={sigRef}
                penColor="#111827"
                canvasProps={{ className: "w-full h-24 touch-none", style: { width: "100%", height: "96px", touchAction: "none" } }}
                onEnd={() => {
                  if (sigRef.current && !sigRef.current.isEmpty()) {
                    onChange({ ...block, signatureDataUrl: sigRef.current.toDataURL("image/png") });
                  }
                }}
              />
            </div>
          )}
        </div>
      );

    case "drawing":
      return wrapper(
        <div className="space-y-1">
          {block.label && <Label className="text-sm font-medium">{block.label || "Freihand-Zeichnung"}</Label>}
          {block.drawingDataUrl ? (
            <div className="relative border rounded-lg p-2">
              <img src={block.drawingDataUrl} alt="Zeichnung" className="max-h-40 object-contain" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1"
                onClick={() => onChange({ ...block, drawingDataUrl: undefined })}
              >
                Löschen
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg">
              <SignatureCanvas
                ref={drawRef}
                penColor="#111827"
                canvasProps={{ className: "w-full h-40 touch-none", style: { width: "100%", height: "160px", touchAction: "none" } }}
                onEnd={() => {
                  if (drawRef.current && !drawRef.current.isEmpty()) {
                    onChange({ ...block, drawingDataUrl: drawRef.current.toDataURL("image/png") });
                  }
                }}
              />
            </div>
          )}
        </div>
      );

    case "placeholder":
      const keyLabel = block.placeholderKey ? PLACEHOLDER_KEYS[block.placeholderKey] || block.placeholderKey : "Platzhalter";
      return wrapper(
        <div className="space-y-1">
          <Label className="text-sm font-medium text-primary">{block.label || keyLabel}</Label>
          <div className="h-10 flex items-center px-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary/70">
            {block.value || `{{${keyLabel}}}`}
          </div>
        </div>
      );

    case "note":
      return wrapper(
        <div className="bg-muted/50 border rounded-lg p-3 space-y-1">
          {block.label && <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{block.label}</Label>}
          {editable ? (
            <Textarea
              value={block.value || ""}
              onChange={(e) => updateValue(e.target.value)}
              placeholder="Hinweis oder Notiz..."
              className="bg-transparent border-none p-0 text-sm min-h-[40px] resize-y"
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.value}</p>
          )}
        </div>
      );

    case "separator":
      return wrapper(<Separator className="my-2" />);

    default:
      return wrapper(<p className="text-sm text-muted-foreground">Unbekannter Baustein: {block.type}</p>);
  }
}
