import { useState, useCallback } from "react";
import { DocumentBlock, BlockType, OfficeDocument, DocumentBranding } from "./types";
import { BlockRenderer } from "./BlockRenderer";
import { BlockToolbar } from "./BlockToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Save, FileDown, ArrowLeft, CheckCircle2, FileEdit, BookTemplate, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DocumentEditorProps {
  document: Partial<OfficeDocument>;
  onChange: (doc: Partial<OfficeDocument>) => void;
  onSave: () => void;
  onExportPdf: () => void;
  onBack: () => void;
  onSaveAsTemplate?: () => void;
  saving?: boolean;
  horses?: { id: string; name: string }[];
}

function SortableBlock({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onInsertAfter,
}: {
  block: DocumentBlock;
  onChange: (b: DocumentBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertAfter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlockRenderer
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onInsertAfter={onInsertAfter}
        editable
        dragHandleProps={listeners}
      />
    </div>
  );
}

export function DocumentEditor({
  document: doc,
  onChange,
  onSave,
  onExportPdf,
  onBack,
  onSaveAsTemplate,
  saving,
  horses,
}: DocumentEditorProps) {
  const blocks = doc.blocks || [];
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange({ ...doc, blocks: arrayMove(blocks, oldIndex, newIndex) });
    }
  }, [blocks, doc, onChange]);

  const updateBlock = useCallback((index: number, updated: DocumentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    onChange({ ...doc, blocks: newBlocks });
  }, [blocks, doc, onChange]);

  const deleteBlock = useCallback((index: number) => {
    onChange({ ...doc, blocks: blocks.filter((_, i) => i !== index) });
  }, [blocks, doc, onChange]);

  const duplicateBlock = useCallback((index: number) => {
    const original = blocks[index];
    const clone: DocumentBlock = { ...JSON.parse(JSON.stringify(original)), id: crypto.randomUUID() };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, clone);
    onChange({ ...doc, blocks: newBlocks });
  }, [blocks, doc, onChange]);

  const addBlock = useCallback((type: BlockType, placeholderKey?: string, atIndex?: number) => {
    const newBlock: DocumentBlock = {
      id: crypto.randomUUID(),
      type,
      ...(type === "heading" && { headingLevel: 2 as const, value: "" }),
      ...(type === "checklist" && { checklistItems: [{ id: crypto.randomUUID(), label: "", checked: false }] }),
      ...(type === "table" && { rows: 3, cols: 3, tableData: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ value: "" }))) }),
      ...(type === "dropdown" && { options: [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }] }),
      ...(type === "placeholder" && { placeholderKey }),
    };
    const newBlocks = [...blocks];
    if (atIndex !== undefined) {
      newBlocks.splice(atIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange({ ...doc, blocks: newBlocks });
    setInsertAtIndex(null);
  }, [blocks, doc, onChange]);

  const toggleStatus = useCallback(() => {
    onChange({ ...doc, status: doc.status === "completed" ? "draft" : "completed" });
  }, [doc, onChange]);

  const blockCount = blocks.length;
  const filledCount = blocks.filter(b => {
    if (b.type === "separator" || b.type === "placeholder") return true;
    if (b.type === "checkbox") return b.label;
    if (b.type === "checklist") return (b.checklistItems?.length ?? 0) > 0;
    return b.value || b.imageUrl || b.signatureDataUrl || b.drawingDataUrl;
  }).length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={doc.title || ""}
          onChange={(e) => onChange({ ...doc, title: e.target.value })}
          placeholder="Dokumenttitel..."
          className="text-base font-semibold border-none bg-transparent h-auto p-0 focus-visible:ring-0 max-w-xs"
        />
        <Badge
          variant={doc.status === "completed" ? "default" : "secondary"}
          className="cursor-pointer shrink-0 text-[10px]"
          onClick={toggleStatus}
        >
          {doc.status === "completed" ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" />Abgeschlossen</>
          ) : (
            <><FileEdit className="h-3 w-3 mr-1" />Entwurf</>
          )}
        </Badge>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* Horse assignment */}
          {horses && horses.length > 0 && (
            <Select
              value={doc.horse_id || "none"}
              onValueChange={(v) => onChange({ ...doc, horse_id: v === "none" ? undefined : v })}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Pferd zuordnen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Pferd</SelectItem>
                {horses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onSaveAsTemplate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onSaveAsTemplate} className="h-8 w-8">
                  <BookTemplate className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Als Vorlage speichern</TooltipContent>
            </Tooltip>
          )}

          <Button variant="outline" size="sm" onClick={onExportPdf} className="gap-1.5 h-8 text-xs">
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saving ? "Speichert..." : "Speichern"}</span>
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-1.5 border-b bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span>{blockCount} Bausteine</span>
        <span>•</span>
        <span>{filledCount} ausgefüllt</span>
        {blockCount > 0 && (
          <>
            <span>•</span>
            <div className="flex-1 max-w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.round((filledCount / blockCount) * 100)}%` }}
              />
            </div>
            <span>{Math.round((filledCount / blockCount) * 100)}%</span>
          </>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 bg-muted/20">
        <div className="max-w-3xl mx-auto">
          {/* Document "paper" */}
          <div className="bg-card border rounded-xl shadow-sm p-6 lg:p-10 min-h-[600px]">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block, index) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onChange={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                    onDuplicate={() => duplicateBlock(index)}
                    onInsertAfter={() => setInsertAtIndex(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Inline insert toolbar */}
            {insertAtIndex !== null && (
              <div className="flex justify-center py-2">
                <BlockToolbar
                  onAddBlock={(type, key) => addBlock(type, key, insertAtIndex)}
                  variant="inline"
                />
              </div>
            )}

            {/* Add block button */}
            <div className="mt-6 flex justify-center">
              <BlockToolbar onAddBlock={(type, key) => addBlock(type, key)} />
            </div>

            {/* Empty state */}
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileEdit className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="text-base font-medium mb-1">Leeres Dokument</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Klicke auf „Baustein hinzufügen", um dein Dokument zu erstellen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
