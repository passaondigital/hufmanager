import { BlockType, BLOCK_TYPE_LABELS, PLACEHOLDER_KEYS } from "./types";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Type, AlignLeft, TextCursorInput, AlignJustify,
  CheckSquare, ListChecks, ChevronDown, CalendarDays,
  Clock, Hash, Table, PenTool, ImagePlus, PenLine,
  Tag, StickyNote, Minus, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
};

const BLOCK_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Text", types: ["heading", "text", "note"] },
  { label: "Eingabe", types: ["input", "textarea", "number", "date", "time"] },
  { label: "Auswahl", types: ["checkbox", "checklist", "dropdown"] },
  { label: "Medien", types: ["image", "drawing", "signature"] },
  { label: "Struktur", types: ["table", "placeholder", "separator"] },
];

interface BlockToolbarProps {
  onAddBlock: (type: BlockType, placeholderKey?: string) => void;
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  const [open, setOpen] = useState(false);

  const handleAdd = (type: BlockType) => {
    onAddBlock(type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed">
          <Plus className="h-4 w-4" />
          Baustein hinzufügen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          {BLOCK_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">
                {group.types.map((type) => {
                  const Icon = BLOCK_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleAdd(type)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{BLOCK_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Placeholder sub-menu */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Platzhalter-Felder</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(PLACEHOLDER_KEYS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onAddBlock("placeholder", key); setOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-primary/10 text-primary transition-colors text-left"
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
