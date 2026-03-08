import { CanvasBlockType, BLOCK_TYPE_LABELS, DEFAULT_BLOCK_SIZES, CANVAS_WIDTH } from "./types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Type, AlignJustify, CheckSquare, ChevronDown,
  Star, CalendarDays, ImagePlus, PenLine, PenTool,
  Bone, Info, ZoomIn, ZoomOut, Save,
  FileDown, ArrowLeft, FileEdit, CheckCircle2, Palette,
  MoreVertical, FolderPlus, X,
} from "lucide-react";
import { useState } from "react";

const BLOCK_ICONS: Record<CanvasBlockType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  textarea: AlignJustify,
  checkbox: CheckSquare,
  dropdown: ChevronDown,
  scale: Star,
  date: CalendarDays,
  image: ImagePlus,
  signature: PenLine,
  draw: PenTool,
  graphic: Bone,
  "auto-info": Info,
};

const BLOCK_GROUPS: { label: string; types: CanvasBlockType[] }[] = [
  { label: "Text", types: ["text", "textarea"] },
  { label: "Eingabe", types: ["dropdown", "checkbox", "scale", "date"] },
  { label: "Medien", types: ["image", "signature", "draw", "graphic"] },
  { label: "Auto", types: ["auto-info"] },
];

interface EditorToolbarProps {
  onAddBlock: (type: CanvasBlockType) => void;
  onSave: () => void;
  onExportPdf: () => void;
  onBack: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  saving?: boolean;
  title: string;
  onTitleChange: (t: string) => void;
  status: "draft" | "completed" | "archived";
  onToggleStatus: () => void;
  hasUnsaved?: boolean;
  onToggleBranding?: () => void;
  brandingActive?: boolean;
  horses?: { id: string; name: string; breed: string | null }[];
  selectedHorseId?: string;
  onHorseChange?: (horseId: string | undefined) => void;
  onSaveAsTemplate?: () => void;
}

export function EditorToolbar({
  onAddBlock, onSave, onExportPdf, onBack,
  zoom, onZoomIn, onZoomOut, saving,
  title, onTitleChange, status, onToggleStatus, hasUnsaved,
  onToggleBranding, brandingActive,
  horses, selectedHorseId, onHorseChange, onSaveAsTemplate,
}: EditorToolbarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);

  const selectedHorse = horses?.find(h => h.id === selectedHorseId);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0 overflow-x-auto">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Dokumenttitel..."
        className="text-sm font-semibold bg-transparent border-none outline-none min-w-0 max-w-[200px]"
      />

      <button
        onClick={onToggleStatus}
        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
          status === "completed"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {status === "completed" ? (
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Fertig</span>
        ) : (
          <span className="flex items-center gap-1"><FileEdit className="h-3 w-3" />Entwurf</span>
        )}
      </button>

      {hasUnsaved && (
        <span className="text-[10px] text-amber-500 shrink-0">● Ungespeichert</span>
      )}

      <div className="h-5 w-px bg-border mx-1 shrink-0" />

      {/* Horse Picker - compact */}
      {horses && horses.length > 0 && onHorseChange && (
        <div className="shrink-0 hidden sm:flex items-center">
          {selectedHorse ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
              <span>🐴</span>
              <span className="font-medium max-w-[120px] truncate">
                {selectedHorse.name}
                {selectedHorse.breed ? ` (${selectedHorse.breed})` : ""}
              </span>
              <button
                onClick={() => onHorseChange(undefined)}
                className="p-0.5 rounded-full hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <select
              value=""
              onChange={(e) => onHorseChange(e.target.value || undefined)}
              className="text-xs bg-transparent border rounded px-2 py-1 text-muted-foreground max-w-[160px]"
            >
              <option value="">🐴 Pferd verknüpfen</option>
              {horses.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name}{h.breed ? ` (${h.breed})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="h-5 w-px bg-border mx-1 shrink-0 hidden sm:block" />

      {/* Add Block Tool */}
      <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Baustein</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start" sideOffset={8}>
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
                        onClick={() => { onAddBlock(type); setToolsOpen(false); }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-accent/10 transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs">{BLOCK_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {onToggleBranding && (
        <Button
          variant={brandingActive ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs shrink-0"
          onClick={onToggleBranding}
        >
          <Palette className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Branding</span>
        </Button>
      )}

      <div className="h-5 w-px bg-border mx-1 shrink-0 hidden sm:block" />

      {/* Zoom - hide on mobile */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Herauszoomen</TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-7 w-7">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hineinzoomen</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={onExportPdf} className="gap-1.5 h-8 text-xs">
          <FileDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5 h-8 text-xs">
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{saving ? "Speichert..." : "Speichern"}</span>
        </Button>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSaveAsTemplate && (
              <DropdownMenuItem onClick={onSaveAsTemplate}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Als Vorlage speichern
              </DropdownMenuItem>
            )}
            {/* Mobile-only: horse picker */}
            {horses && horses.length > 0 && onHorseChange && (
              <>
                <DropdownMenuSeparator />
                {horses.slice(0, 8).map(h => (
                  <DropdownMenuItem
                    key={h.id}
                    onClick={() => onHorseChange(h.id)}
                    className={selectedHorseId === h.id ? "bg-primary/10" : ""}
                  >
                    🐴 {h.name}{h.breed ? ` (${h.breed})` : ""}
                  </DropdownMenuItem>
                ))}
                {selectedHorseId && (
                  <DropdownMenuItem onClick={() => onHorseChange(undefined)} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-2" /> Pferd entfernen
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
