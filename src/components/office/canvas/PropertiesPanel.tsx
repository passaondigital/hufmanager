import { CanvasBlock, CanvasBlockType, BLOCK_TYPE_LABELS, GraphicType, AutoInfoType, GRAPHIC_TYPE_LABELS, AUTO_INFO_LABELS, FONT_OPTIONS, COLOR_PRESETS } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, X, Copy, Settings2, Lock, Unlock, Palette, Type } from "lucide-react";
import { GraphicLibraryPicker } from "./GraphicLibraryPicker";

interface PropertiesPanelProps {
  block: CanvasBlock | null;
  onChange: (block: CanvasBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function PropertiesPanel({ block, onChange, onDelete, onDuplicate }: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Settings2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">Klicke auf einen Baustein, um ihn zu bearbeiten</p>
      </div>
    );
  }

  const update = (patch: Partial<CanvasBlock>) => onChange({ ...block, ...patch });

  return (
    <div className="h-full overflow-auto p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">{BLOCK_TYPE_LABELS[block.type]}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => update({ locked: !block.locked })}
            title={block.locked ? "Entsperren" : "Fixieren"}
          >
            {block.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Lock indicator */}
      {block.locked && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Lock className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Element fixiert – Position & Größe gesperrt</span>
        </div>
      )}

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-xs">Bezeichnung</Label>
        <Input
          value={block.label || ""}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Feldname..."
          className="h-8 text-xs"
        />
      </div>

      {/* Position */}
      <div className="space-y-1">
        <Label className="text-xs">Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">X</span>
            <Input type="number" value={Math.round(block.x)} onChange={(e) => update({ x: Number(e.target.value) })} className="h-7 text-xs" disabled={block.locked} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Y</span>
            <Input type="number" value={Math.round(block.y)} onChange={(e) => update({ y: Number(e.target.value) })} className="h-7 text-xs" disabled={block.locked} />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-1">
        <Label className="text-xs">Größe</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Breite</span>
            <Input type="number" value={Math.round(block.width)} onChange={(e) => update({ width: Number(e.target.value) })} className="h-7 text-xs" disabled={block.locked} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Höhe</span>
            <Input type="number" value={Math.round(block.height)} onChange={(e) => update({ height: Number(e.target.value) })} className="h-7 text-xs" disabled={block.locked} />
          </div>
        </div>
      </div>

      {/* Style: Font */}
      {["text", "textarea", "checkbox", "dropdown", "scale", "date", "auto-info"].includes(block.type) && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Type className="h-3 w-3" /> Schriftart
            </Label>
            <Select value={block.fontFamily || "system-ui"} onValueChange={(v) => update({ fontFamily: v === "system-ui" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Schriftgröße</Label>
            <Input type="number" value={block.fontSize || 12} onChange={(e) => update({ fontSize: Number(e.target.value) || undefined })} className="h-7 text-xs" min={8} max={48} />
          </div>
        </>
      )}

      {/* Style: Colors */}
      <div className="h-px bg-border" />
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Palette className="h-3 w-3" /> Farben
        </Label>
        
        {/* Text color */}
        {["text", "textarea", "checkbox", "dropdown", "scale", "date", "auto-info"].includes(block.type) && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Textfarbe</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 flex-wrap flex-1">
                <button
                  onClick={() => update({ textColor: undefined })}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${!block.textColor ? "border-primary scale-110" : "border-border"}`}
                  title="Standard"
                >
                  <span className="text-[7px] text-muted-foreground flex items-center justify-center">∅</span>
                </button>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ textColor: c })}
                    className={`h-5 w-5 rounded-full border-2 transition-all ${block.textColor === c ? "border-primary scale-110" : "border-border"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input type="color" value={block.textColor || "#000000"} onChange={(e) => update({ textColor: e.target.value })} className="h-6 w-8 p-0 border-none cursor-pointer" />
            </div>
          </div>
        )}

        {/* Background color */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Hintergrund</span>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5 flex-wrap flex-1">
              <button
                onClick={() => update({ bgColor: undefined })}
                className={`h-5 w-5 rounded-full border-2 transition-all ${!block.bgColor ? "border-primary scale-110" : "border-border"}`}
                title="Transparent"
              >
                <span className="text-[7px] text-muted-foreground flex items-center justify-center">∅</span>
              </button>
              {["#ffffff", "#f3f4f6", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#f3e8ff"].map((c) => (
                <button
                  key={c}
                  onClick={() => update({ bgColor: c })}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${block.bgColor === c ? "border-primary scale-110" : "border-border"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Input type="color" value={block.bgColor || "#ffffff"} onChange={(e) => update({ bgColor: e.target.value })} className="h-6 w-8 p-0 border-none cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <Label className="text-xs">Deckkraft ({block.opacity ?? 100}%)</Label>
        <Slider
          value={[block.opacity ?? 100]}
          onValueChange={([v]) => update({ opacity: v === 100 ? undefined : v })}
          min={20}
          max={100}
          step={5}
          className="py-1"
        />
      </div>

      {/* Placeholder */}
      {["text", "textarea"].includes(block.type) && (
        <div className="space-y-1">
          <Label className="text-xs">Platzhaltertext</Label>
          <Input
            value={block.placeholder || ""}
            onChange={(e) => update({ placeholder: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* Scale options */}
      {block.type === "scale" && (
        <div className="space-y-2">
          <Label className="text-xs">Skalenbereich</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Min</span>
              <Input type="number" value={block.scaleMin ?? 1} onChange={(e) => update({ scaleMin: Number(e.target.value) })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Max</span>
              <Input type="number" value={block.scaleMax ?? 5} onChange={(e) => update({ scaleMax: Number(e.target.value) })} className="h-7 text-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Date options */}
      {block.type === "date" && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Mit Uhrzeit</Label>
          <Switch checked={block.showTimestamp || false} onCheckedChange={(c) => update({ showTimestamp: c })} />
        </div>
      )}

      {/* Dropdown options */}
      {block.type === "dropdown" && (
        <div className="space-y-2">
          <Label className="text-xs">Optionen</Label>
          {(block.options || []).map((opt, i) => (
            <div key={i} className="flex gap-1 items-center">
              <Input
                value={opt.label}
                onChange={(e) => {
                  const opts = [...(block.options || [])];
                  opts[i] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                  update({ options: opts });
                }}
                className="h-7 text-xs"
              />
              <button onClick={() => update({ options: (block.options || []).filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7 w-full" onClick={() => update({ options: [...(block.options || []), { label: "Neue Option", value: `opt_${Date.now()}` }] })}>
            <Plus className="h-3 w-3 mr-1" /> Option
          </Button>
        </div>
      )}

      {/* Checkbox items */}
      {block.type === "checkbox" && (
        <div className="space-y-2">
          <Label className="text-xs">Optionen</Label>
          {(block.checkboxItems || []).map((item, i) => (
            <div key={item.id} className="flex gap-1 items-center">
              <Input
                value={item.label}
                onChange={(e) => {
                  const items = [...(block.checkboxItems || [])];
                  items[i] = { ...items[i], label: e.target.value };
                  update({ checkboxItems: items });
                }}
                className="h-7 text-xs"
              />
              <button onClick={() => update({ checkboxItems: (block.checkboxItems || []).filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7 w-full" onClick={() => update({
            checkboxItems: [...(block.checkboxItems || []), { id: crypto.randomUUID(), label: "", checked: false }]
          })}>
            <Plus className="h-3 w-3 mr-1" /> Option
          </Button>
        </div>
      )}

      {/* Graphic type */}
      {block.type === "graphic" && (
        <div className="space-y-2">
          <Label className="text-xs">Grafik-Typ</Label>
          <GraphicLibraryPicker
            currentType={block.graphicType}
            currentCustomUrl={block.imageUrl}
            onSelectSystem={(type) => update({ graphicType: type, imageUrl: undefined })}
            onSelectCustom={(url) => update({ imageUrl: url, graphicType: undefined })}
          />
          {block.graphicType && (
            <p className="text-[10px] text-muted-foreground">
              Aktuell: {GRAPHIC_TYPE_LABELS[block.graphicType]}
            </p>
          )}
          {block.imageUrl && (
            <p className="text-[10px] text-muted-foreground">
              Aktuell: Eigene Grafik
            </p>
          )}
        </div>
      )}

      {/* Auto-info type */}
      {block.type === "auto-info" && (
        <div className="space-y-1">
          <Label className="text-xs">Info-Typ</Label>
          <Select value={block.autoInfoType || "datum"} onValueChange={(v) => update({ autoInfoType: v as AutoInfoType })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(AUTO_INFO_LABELS) as [AutoInfoType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
