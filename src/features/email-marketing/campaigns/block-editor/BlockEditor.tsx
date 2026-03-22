import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Type, AlignLeft, Image, MousePointer, Minus, ArrowUpDown,
  Trash2, GripVertical, ChevronUp, ChevronDown, Plus,
  AlignCenter, AlignRight, Heading1, Heading2, Heading3
} from "lucide-react";
import type { EmailBlock, BlockType } from "./types";
import { BLOCK_DEFAULTS, blocksToHtml } from "./types";

const BLOCK_MENU: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "heading", label: "Überschrift", icon: Type },
  { type: "text", label: "Text", icon: AlignLeft },
  { type: "image", label: "Bild", icon: Image },
  { type: "button", label: "Button", icon: MousePointer },
  { type: "divider", label: "Trennlinie", icon: Minus },
  { type: "spacer", label: "Abstand", icon: ArrowUpDown },
];

interface BlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addBlock = (type: BlockType) => {
    const newBlock: EmailBlock = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      type,
      content: BLOCK_DEFAULTS[type].content || "",
      ...BLOCK_DEFAULTS[type],
    };
    onChange([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    onChange(newBlocks);
  };

  return (
    <div className="space-y-3">
      {/* Block Add Menu */}
      <div className="flex flex-wrap gap-1.5">
        {BLOCK_MENU.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 hover:border-[#F47B20] hover:text-[#F47B20]"
            onClick={() => addBlock(type)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Blocks */}
      {blocks.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Klicke oben auf einen Baustein, um zu starten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              className={`group relative border rounded-lg transition-all ${
                selectedId === block.id
                  ? "border-[#F47B20] ring-1 ring-[#F47B20]/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedId(block.id)}
            >
              {/* Block Controls */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 bg-white shadow-sm border"
                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }}
                  disabled={idx === 0}
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 bg-white shadow-sm border"
                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }}
                  disabled={idx === blocks.length - 1}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-1 -top-1 h-5 w-5 bg-white shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>

              <div className="p-3">
                <BlockContent
                  block={block}
                  isSelected={selectedId === block.id}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          <Label className="text-black text-sm">Live-Vorschau</Label>
          <div
            className="border rounded-lg p-4 bg-white max-h-[250px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
          />
        </div>
      )}
    </div>
  );
}

function BlockContent({
  block,
  isSelected,
  onUpdate,
}: {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (updates: Partial<EmailBlock>) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          {isSelected ? (
            <>
              <div className="flex gap-1.5 items-center">
                <div className="flex gap-0.5">
                  {(["h1", "h2", "h3"] as const).map(lvl => (
                    <Button
                      key={lvl}
                      variant={block.level === lvl ? "default" : "outline"}
                      size="icon"
                      className={`h-7 w-7 ${block.level === lvl ? "bg-[#F47B20] hover:bg-[#e06a10]" : ""}`}
                      onClick={(e) => { e.stopPropagation(); onUpdate({ level: lvl }); }}
                    >
                      {lvl === "h1" ? <Heading1 className="w-3.5 h-3.5" /> : lvl === "h2" ? <Heading2 className="w-3.5 h-3.5" /> : <Heading3 className="w-3.5 h-3.5" />}
                    </Button>
                  ))}
                </div>
                <AlignButtons align={block.align} onUpdate={onUpdate} />
              </div>
              <Input
                value={block.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="bg-white font-semibold"
                placeholder="Überschrift..."
              />
            </>
          ) : (
            <p className={`font-semibold text-black ${block.level === "h1" ? "text-xl" : block.level === "h2" ? "text-lg" : "text-base"}`} style={{ textAlign: block.align }}>
              {block.content || "Überschrift"}
            </p>
          )}
        </div>
      );

    case "text":
      return isSelected ? (
        <div className="space-y-2">
          <AlignButtons align={block.align} onUpdate={onUpdate} />
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="bg-white text-sm min-h-[80px]"
            placeholder="Dein Text..."
          />
        </div>
      ) : (
        <p className="text-sm text-black leading-relaxed" style={{ textAlign: block.align }}>
          {block.content || "Text hier..."}
        </p>
      );

    case "image":
      return (
        <div className="space-y-2">
          {isSelected && (
            <Input
              value={block.imageUrl || ""}
              onChange={(e) => onUpdate({ imageUrl: e.target.value })}
              className="bg-white text-sm"
              placeholder="Bild-URL (https://...)"
            />
          )}
          <div className="rounded-lg overflow-hidden bg-gray-50">
            {block.imageUrl ? (
              <img src={block.imageUrl} alt={block.altText} className="w-full max-h-[200px] object-cover" />
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                <Image className="w-5 h-5 mr-2 opacity-40" />
                Bild-URL eingeben
              </div>
            )}
          </div>
        </div>
      );

    case "button":
      return isSelected ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="bg-white text-sm flex-1"
              placeholder="Button-Text"
            />
            <Input
              value={block.buttonColor || "#F47B20"}
              onChange={(e) => onUpdate({ buttonColor: e.target.value })}
              className="bg-white text-sm w-24"
              type="color"
            />
          </div>
          <Input
            value={block.buttonUrl || ""}
            onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
            className="bg-white text-sm"
            placeholder="Link-URL (https://...)"
          />
          <AlignButtons align={block.align} onUpdate={onUpdate} />
        </div>
      ) : (
        <div style={{ textAlign: block.align || "center" }}>
          <span
            className="inline-block px-5 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: block.buttonColor || "#F47B20" }}
          >
            {block.content || "Button"}
          </span>
        </div>
      );

    case "divider":
      return <hr className="border-t border-gray-200 my-1" />;

    case "spacer":
      return isSelected ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Höhe:</span>
          <Input
            type="number"
            value={block.height || 24}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="bg-white w-20 h-7 text-sm"
            min={8}
            max={100}
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      ) : (
        <div className="flex items-center justify-center py-1">
          <span className="text-xs text-muted-foreground">↕ {block.height || 24}px</span>
        </div>
      );

    default:
      return null;
  }
}

function AlignButtons({ align, onUpdate }: { align?: string; onUpdate: (u: Partial<EmailBlock>) => void }) {
  return (
    <div className="flex gap-0.5">
      {([
        { val: "left", Icon: AlignLeft },
        { val: "center", Icon: AlignCenter },
        { val: "right", Icon: AlignRight },
      ] as const).map(({ val, Icon }) => (
        <Button
          key={val}
          variant={(align || "left") === val ? "default" : "outline"}
          size="icon"
          className={`h-7 w-7 ${(align || "left") === val ? "bg-[#F47B20] hover:bg-[#e06a10]" : ""}`}
          onClick={(e) => { e.stopPropagation(); onUpdate({ align: val }); }}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      ))}
    </div>
  );
}
