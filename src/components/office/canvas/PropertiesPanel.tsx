import { CanvasBlock, CanvasBlockType, BLOCK_TYPE_LABELS, GraphicType, AutoInfoType, GRAPHIC_TYPE_LABELS, AUTO_INFO_LABELS } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, X, Copy, Settings2 } from "lucide-react";

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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

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
            <Input type="number" value={Math.round(block.x)} onChange={(e) => update({ x: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Y</span>
            <Input type="number" value={Math.round(block.y)} onChange={(e) => update({ y: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-1">
        <Label className="text-xs">Größe</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Breite</span>
            <Input type="number" value={Math.round(block.width)} onChange={(e) => update({ width: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Höhe</span>
            <Input type="number" value={Math.round(block.height)} onChange={(e) => update({ height: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
        </div>
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
        <div className="space-y-1">
          <Label className="text-xs">Grafik-Typ</Label>
          <Select value={block.graphicType || "horse-side"} onValueChange={(v) => update({ graphicType: v as GraphicType })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(GRAPHIC_TYPE_LABELS) as [GraphicType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
