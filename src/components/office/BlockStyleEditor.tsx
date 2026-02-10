import { BlockStyle, TextAlign, COLOR_PRESETS } from "./types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockStyleEditorProps {
  style: BlockStyle;
  onChange: (style: BlockStyle) => void;
  showTextOptions?: boolean;
}

export function BlockStyleEditor({ style, onChange, showTextOptions = true }: BlockStyleEditorProps) {
  const update = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });

  return (
    <div className="space-y-3">
      {/* Text alignment & formatting */}
      {showTextOptions && (
        <div className="space-y-1.5">
          <Label className="text-xs">Ausrichtung & Format</Label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as TextAlign[]).map((align) => {
              const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
              return (
                <Button
                  key={align}
                  type="button"
                  size="sm"
                  variant={style.textAlign === align ? "default" : "outline"}
                  className="h-7 w-8 p-0"
                  onClick={() => update({ textAlign: align })}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
            <div className="w-px bg-border mx-0.5" />
            <Button
              type="button"
              size="sm"
              variant={style.bold ? "default" : "outline"}
              className="h-7 w-8 p-0"
              onClick={() => update({ bold: !style.bold })}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={style.italic ? "default" : "outline"}
              className="h-7 w-8 p-0"
              onClick={() => update({ italic: !style.italic })}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Text color */}
      {showTextOptions && (
        <div className="space-y-1">
          <Label className="text-xs">Textfarbe</Label>
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.slice(0, 5).map((c) => (
              <button
                key={c.value}
                onClick={() => update({ textColor: c.value })}
                className={cn(
                  "h-5 w-5 rounded-full border transition-all",
                  style.textColor === c.value ? "border-primary ring-1 ring-primary/30 scale-110" : "border-border"
                )}
                style={{ backgroundColor: c.value || "transparent" }}
                title={c.label}
              />
            ))}
            <Input
              type="color"
              value={style.textColor || "#000000"}
              onChange={(e) => update({ textColor: e.target.value })}
              className="h-5 w-7 p-0 border-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Background color */}
      <div className="space-y-1">
        <Label className="text-xs">Hintergrund</Label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => update({ bgColor: "" })}
            className={cn(
              "h-5 w-5 rounded-full border transition-all flex items-center justify-center",
              !style.bgColor ? "border-primary ring-1 ring-primary/30 scale-110" : "border-border"
            )}
            title="Kein Hintergrund"
          >
            <span className="text-[7px] text-muted-foreground">∅</span>
          </button>
          {["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#f3e8ff", "#fee2e2"].map((c) => (
            <button
              key={c}
              onClick={() => update({ bgColor: c })}
              className={cn(
                "h-5 w-5 rounded-full border transition-all",
                style.bgColor === c ? "border-primary ring-1 ring-primary/30 scale-110" : "border-border"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <Input
            type="color"
            value={style.bgColor || "#ffffff"}
            onChange={(e) => update({ bgColor: e.target.value })}
            className="h-5 w-7 p-0 border-none cursor-pointer"
          />
        </div>
      </div>

      {/* Border */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rahmen</Label>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((w) => (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={(style.borderWidth || 0) === w ? "default" : "outline"}
                className="h-7 px-2 text-[10px]"
                onClick={() => update({ borderWidth: w })}
              >
                {w === 0 ? "Kein" : `${w}px`}
              </Button>
            ))}
          </div>
          {(style.borderWidth || 0) > 0 && (
            <Input
              type="color"
              value={style.borderColor || "#e5e7eb"}
              onChange={(e) => update({ borderColor: e.target.value })}
              className="h-6 w-8 p-0 border-none cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-1.5">
        <Label className="text-xs">Innenabstand: {style.padding || 0}px</Label>
        <Slider
          value={[style.padding || 0]}
          min={0}
          max={32}
          step={4}
          onValueChange={([v]) => update({ padding: v })}
          className="w-full"
        />
      </div>
    </div>
  );
}
