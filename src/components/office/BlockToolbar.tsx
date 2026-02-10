import { BlockType, BLOCK_TYPE_LABELS, PLACEHOLDER_KEYS } from "./types";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Type, AlignLeft, TextCursorInput, AlignJustify,
  CheckSquare, ListChecks, ChevronDown, CalendarDays,
  Clock, Hash, Table, PenTool, ImagePlus, PenLine,
  Tag, StickyNote, Minus, Plus, MoveVertical, Square,
} from "lucide-react";
import { useState } from "react";

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  heading: Type,
  text: AlignLeft,
  input: TextCursorInput,
  textarea: AlignJustify,
  checkbox: CheckSquare,
  checklist: ListChecks,
  dropdown: ChevronDown,
  date: CalendarDays,
  time: Clock,
  number: Hash,
  table: Table,
  drawing: PenTool,
  image: ImagePlus,
  signature: PenLine,
  placeholder: Tag,
  note: StickyNote,
  separator: Minus,
  spacer: MoveVertical,
  box: Square,
};

const BLOCK_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Text", types: ["heading", "text", "note"] },
  { label: "Eingabe", types: ["input", "textarea", "number", "date", "time"] },
  { label: "Auswahl", types: ["checkbox", "checklist", "dropdown"] },
  { label: "Medien", types: ["image", "drawing", "signature"] },
  { label: "Struktur", types: ["table", "placeholder", "separator", "spacer", "box"] },
];

interface BlockToolbarProps {
  onAddBlock: (type: BlockType, placeholderKey?: string) => void;
  variant?: "default" | "inline";
}

export function BlockToolbar({ onAddBlock, variant = "default" }: BlockToolbarProps) {
  const [open, setOpen] = useState(false);

  const handleAdd = (type: BlockType) => {
    onAddBlock(type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "inline" ? (
          <button className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <Plus className="h-4 w-4" />
            Baustein hinzufügen
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="center" sideOffset={8}>
        <div className="space-y-3">
          {BLOCK_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{group.label}</p>
              <div className="grid grid-cols-2 gap-0.5">
                {group.types.map((type) => {
                  const Icon = BLOCK_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleAdd(type)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-accent/10 hover:text-accent-foreground transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs">{BLOCK_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Platzhalter-Felder</p>
            <div className="grid grid-cols-2 gap-0.5">
              {Object.entries(PLACEHOLDER_KEYS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onAddBlock("placeholder", key); setOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs hover:bg-primary/10 text-primary/80 transition-colors text-left"
                >
                  <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
