import { useState, useRef } from "react";
import { DocumentBlock, BlockStyle, PLACEHOLDER_KEYS } from "./types";
import { BlockStyleEditor } from "./BlockStyleEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trash2, GripVertical, ImagePlus, Copy, Settings2, Plus, X, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";

interface BlockRendererProps {
  block: DocumentBlock;
  onChange: (updated: DocumentBlock) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onInsertAfter?: () => void;
  editable?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function BlockRenderer({ block, onChange, onDelete, onDuplicate, onInsertAfter, editable = true, dragHandleProps }: BlockRendererProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const drawRef = useRef<SignatureCanvas>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);

  const blockStyle = block.style || {};
  const styleObj: React.CSSProperties = {
    textAlign: blockStyle.textAlign,
    color: blockStyle.textColor || undefined,
    backgroundColor: blockStyle.bgColor || undefined,
    borderWidth: blockStyle.borderWidth ? `${blockStyle.borderWidth}px` : undefined,
    borderColor: blockStyle.borderColor || undefined,
    borderStyle: blockStyle.borderWidth ? "solid" : undefined,
    borderRadius: blockStyle.borderRadius ? `${blockStyle.borderRadius}px` : undefined,
    padding: blockStyle.padding ? `${blockStyle.padding}px` : undefined,
    fontWeight: blockStyle.bold ? "bold" : undefined,
    fontStyle: blockStyle.italic ? "italic" : undefined,
  };

  const updateValue = (value: string) => onChange({ ...block, value });

  const settingsPopover = editable ? (
    <Popover open={showSettings} onOpenChange={setShowSettings}>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" side="left" align="start">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Baustein-Einstellungen</p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Bezeichnung</Label>
            <Input
              value={block.label || ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Feldbezeichnung..."
              className="h-8 text-xs"
            />
          </div>
          {["input", "textarea", "number", "date", "time"].includes(block.type) && (
            <div className="space-y-1">
              <Label className="text-xs">Platzhaltertext</Label>
              <Input
                value={block.placeholder || ""}
                onChange={(e) => onChange({ ...block, placeholder: e.target.value })}
                placeholder="Platzhalter..."
                className="h-8 text-xs"
              />
            </div>
          )}
          {["input", "textarea", "number", "date", "time", "dropdown"].includes(block.type) && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pflichtfeld</Label>
              <Switch
                checked={block.required || false}
                onCheckedChange={(c) => onChange({ ...block, required: c })}
              />
            </div>
          )}
          {block.type === "heading" && (
            <div className="space-y-1">
              <Label className="text-xs">Ebene</Label>
              <div className="flex gap-1">
                {([1, 2, 3] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    size="sm"
                    variant={block.headingLevel === level ? "default" : "outline"}
                    className="h-7 w-10 text-xs"
                    onClick={() => onChange({ ...block, headingLevel: level })}
                  >
                    H{level}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {block.type === "table" && (
            <div className="flex gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Zeilen</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={block.rows || 3}
                  onChange={(e) => {
                    const newRows = Math.max(1, Math.min(20, parseInt(e.target.value) || 3));
                    const data = block.tableData || [];
                    const cols = block.cols || 3;
                    const newData = Array.from({ length: newRows }, (_, ri) =>
                      Array.from({ length: cols }, (_, ci) => data[ri]?.[ci] || { value: "" })
                    );
                    onChange({ ...block, rows: newRows, tableData: newData });
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Spalten</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={block.cols || 3}
                  onChange={(e) => {
                    const newCols = Math.max(1, Math.min(10, parseInt(e.target.value) || 3));
                    const data = block.tableData || [];
                    const rows = block.rows || 3;
                    const newData = Array.from({ length: rows }, (_, ri) =>
                      Array.from({ length: newCols }, (_, ci) => data[ri]?.[ci] || { value: "" })
                    );
                    onChange({ ...block, cols: newCols, tableData: newData });
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  const wrapper = (children: React.ReactNode) => (
    <div className="group relative">
      <div className="flex gap-2 items-start py-1.5 px-1 -mx-1 rounded-lg transition-colors hover:bg-muted/30">
        {editable && (
          <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1 shrink-0">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none p-0.5">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {settingsPopover}
            {/* Style editor */}
            <Popover open={showStyleEditor} onOpenChange={setShowStyleEditor}>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded" title="Formatierung">
                  <Paintbrush className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" side="left" align="start">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Formatierung</p>
                <BlockStyleEditor
                  style={block.style || {}}
                  onChange={(s) => onChange({ ...block, style: s })}
                  showTextOptions={!["separator", "image", "signature", "drawing", "spacer"].includes(block.type)}
                />
              </PopoverContent>
            </Popover>
            {onDuplicate && (
              <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded" title="Duplizieren">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded" title="Löschen">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0" style={styleObj}>{children}</div>
      </div>
      {/* Insert-between button */}
      {editable && onInsertAfter && (
        <div className="relative h-0 flex justify-center">
          <button
            onClick={onInsertAfter}
            className="absolute -bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-all bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center shadow-md hover:scale-110"
            title="Baustein einfügen"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  switch (block.type) {
    case "heading": {
      const sizes: Record<number, string> = { 1: "text-2xl font-bold", 2: "text-xl font-semibold", 3: "text-lg font-medium" };
      return wrapper(
        editable ? (
          <input
            className={cn("w-full bg-transparent border-none outline-none", sizes[block.headingLevel || 1])}
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Überschrift eingeben..."
          />
        ) : (
          <div className={sizes[block.headingLevel || 1]}>{block.value}</div>
        )
      );
    }

    case "text":
      return wrapper(
        editable ? (
          <Textarea
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="Text eingeben..."
            className="min-h-[60px] resize-y border-transparent bg-transparent hover:bg-muted/20 focus:bg-background focus:border-input transition-colors"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{block.value}</p>
        )
      );

    case "input":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && (
            <Label className="text-sm font-medium text-foreground">
              {block.label}
              {block.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
          <Input
            value={block.value || ""}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={block.placeholder || "Eingabe..."}
            className="transition-colors"
          />
        </div>
      );

    case "textarea":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && (
            <Label className="text-sm font-medium text-foreground">
              {block.label}
              {block.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
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
        <div className="flex items-center gap-3 py-0.5">
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
            <Label className={cn("text-sm", block.checked && "line-through text-muted-foreground")}>{block.label}</Label>
          )}
        </div>
      );

    case "checklist":
      return wrapper(
        <div className="space-y-2">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <div className="space-y-1 pl-1">
            {(block.checklistItems || []).map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 group/item py-0.5">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(c) => {
                    const items = [...(block.checklistItems || [])];
                    items[i] = { ...items[i], checked: !!c };
                    onChange({ ...block, checklistItems: items });
                  }}
                />
                {editable ? (
                  <>
                    <input
                      className="bg-transparent border-none outline-none text-sm flex-1"
                      value={item.label}
                      onChange={(e) => {
                        const items = [...(block.checklistItems || [])];
                        items[i] = { ...items[i], label: e.target.value };
                        onChange({ ...block, checklistItems: items });
                      }}
                    />
                    <button
                      onClick={() => {
                        const items = (block.checklistItems || []).filter((_, idx) => idx !== i);
                        onChange({ ...block, checklistItems: items });
                      }}
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                )}
              </div>
            ))}
            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7 mt-1"
                onClick={() => {
                  const items = [...(block.checklistItems || []), { id: crypto.randomUUID(), label: "", checked: false }];
                  onChange({ ...block, checklistItems: items });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Punkt hinzufügen
              </Button>
            )}
          </div>
        </div>
      );

    case "dropdown":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && (
            <Label className="text-sm font-medium">
              {block.label}
              {block.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
          <Select value={block.value || ""} onValueChange={updateValue}>
            <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
            <SelectContent>
              {(block.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editable && (
            <div className="space-y-1 mt-2">
              {(block.options || []).map((opt, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const opts = [...(block.options || [])];
                      opts[i] = { ...opts[i], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                      onChange({ ...block, options: opts });
                    }}
                    className="h-7 text-xs"
                    placeholder="Option..."
                  />
                  <button
                    onClick={() => {
                      const opts = (block.options || []).filter((_, idx) => idx !== i);
                      onChange({ ...block, options: opts });
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  const opts = [...(block.options || []), { label: "Neue Option", value: `opt_${Date.now()}` }];
                  onChange({ ...block, options: opts });
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Option
              </Button>
            </div>
          )}
        </div>
      );

    case "date":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && <Label className="text-sm font-medium">{block.label || "Datum"}</Label>}
          <Input type="date" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} />
        </div>
      );

    case "time":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && <Label className="text-sm font-medium">{block.label || "Uhrzeit"}</Label>}
          <Input type="time" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} />
        </div>
      );

    case "number":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && (
            <Label className="text-sm font-medium">
              {block.label}
              {block.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
          <Input type="number" value={block.value || ""} onChange={(e) => updateValue(e.target.value)} placeholder="0" />
        </div>
      );

    case "table": {
      const rows = block.rows || 3;
      const cols = block.cols || 3;
      const data = block.tableData || Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ value: "" })));
      return wrapper(
        <div className="space-y-1.5">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} className={cn("border-b last:border-b-0", ri === 0 && "bg-muted/40 font-medium")}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-r last:border-r-0 p-0">
                        <input
                          className="w-full p-2 bg-transparent outline-none text-sm"
                          value={cell.value}
                          placeholder={ri === 0 ? "Spalte..." : ""}
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
    }

    case "image":
      return wrapper(
        <div className="space-y-1.5">
          {block.label && <Label className="text-sm font-medium">{block.label}</Label>}
          {block.imageUrl ? (
            <div className="relative group/img inline-block">
              <img src={block.imageUrl} alt="" className="max-h-56 rounded-lg object-contain border" />
              {editable && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/img:opacity-100 transition-opacity"
                  onClick={() => onChange({ ...block, imageUrl: undefined })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <ImagePlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-sm text-muted-foreground">Bild hochladen</span>
              <span className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG bis 10 MB</span>
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
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{block.label || "Unterschrift"}</Label>
          {block.signatureDataUrl ? (
            <div className="relative border rounded-lg p-3 bg-background">
              <img src={block.signatureDataUrl} alt="Unterschrift" className="max-h-24 object-contain" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-7 text-xs"
                onClick={() => onChange({ ...block, signatureDataUrl: undefined })}
              >
                Neu unterschreiben
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg bg-background relative">
              <div className="absolute top-2 left-3 text-xs text-muted-foreground/40 pointer-events-none select-none">
                Hier unterschreiben ✍️
              </div>
              <SignatureCanvas
                ref={sigRef}
                penColor="hsl(var(--foreground))"
                canvasProps={{ className: "w-full h-28 touch-none", style: { width: "100%", height: "112px", touchAction: "none" } }}
                onEnd={() => {
                  if (sigRef.current && !sigRef.current.isEmpty()) {
                    onChange({ ...block, signatureDataUrl: sigRef.current.toDataURL("image/png") });
                  }
                }}
              />
              {sigRef.current && !sigRef.current?.isEmpty() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-1 right-1 h-6 text-xs"
                  onClick={() => sigRef.current?.clear()}
                >
                  Zurücksetzen
                </Button>
              )}
            </div>
          )}
        </div>
      );

    case "drawing":
      return wrapper(
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{block.label || "Freihand-Zeichnung"}</Label>
          {block.drawingDataUrl ? (
            <div className="relative border rounded-lg p-3 bg-background">
              <img src={block.drawingDataUrl} alt="Zeichnung" className="max-h-48 object-contain" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-7 text-xs"
                onClick={() => onChange({ ...block, drawingDataUrl: undefined })}
              >
                Neu zeichnen
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg bg-background relative">
              <div className="absolute top-2 left-3 text-xs text-muted-foreground/40 pointer-events-none select-none">
                Hier zeichnen 🖊️
              </div>
              <SignatureCanvas
                ref={drawRef}
                penColor="hsl(var(--foreground))"
                canvasProps={{ className: "w-full h-44 touch-none", style: { width: "100%", height: "176px", touchAction: "none" } }}
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

    case "placeholder": {
      const keyLabel = block.placeholderKey ? PLACEHOLDER_KEYS[block.placeholderKey] || block.placeholderKey : "Platzhalter";
      return wrapper(
        <div className="space-y-1">
          <Label className="text-xs font-medium text-primary/80 uppercase tracking-wide">{block.label || keyLabel}</Label>
          <div className="h-10 flex items-center px-3 bg-primary/5 border border-primary/15 rounded-lg text-sm text-primary/60 font-mono">
            {block.value || `{{ ${keyLabel} }}`}
          </div>
        </div>
      );
    }

    case "note":
      return wrapper(
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-3 space-y-1">
          {block.label && <Label className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">{block.label}</Label>}
          {editable ? (
            <Textarea
              value={block.value || ""}
              onChange={(e) => updateValue(e.target.value)}
              placeholder="Hinweis oder Notiz..."
              className="bg-transparent border-none p-0 text-sm min-h-[40px] resize-y focus-visible:ring-0"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{block.value}</p>
          )}
        </div>
      );

    case "separator":
      return wrapper(
        <div className="py-2">
          <Separator className={blockStyle.borderColor ? "" : ""} style={blockStyle.borderColor ? { backgroundColor: blockStyle.borderColor } : undefined} />
        </div>
      );

    case "spacer":
      return wrapper(
        <div style={{ height: `${block.spacerHeight || 24}px` }}>
          {editable && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
              <span>↕ {block.spacerHeight || 24}px</span>
              <Slider
                value={[block.spacerHeight || 24]}
                min={8}
                max={120}
                step={8}
                onValueChange={([v]) => onChange({ ...block, spacerHeight: v })}
                className="w-24"
              />
            </div>
          )}
        </div>
      );

    case "box":
      return wrapper(
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: blockStyle.borderColor || "hsl(var(--border))",
            backgroundColor: blockStyle.bgColor || undefined,
          }}
        >
          {editable ? (
            <Textarea
              value={block.value || ""}
              onChange={(e) => onChange({ ...block, value: e.target.value })}
              placeholder="Inhaltsbox – Text eingeben..."
              className="bg-transparent border-none p-0 text-sm min-h-[60px] resize-y focus-visible:ring-0"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{block.value}</p>
          )}
        </div>
      );

    default:
      return wrapper(<p className="text-sm text-muted-foreground">Unbekannter Baustein: {block.type}</p>);
  }
}
