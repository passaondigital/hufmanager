import { useState, useCallback } from "react";
import { DocumentBlock, BlockType, OfficeDocument, DocumentBranding } from "./types";
import { BlockRenderer } from "./BlockRenderer";
import { BlockToolbar } from "./BlockToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, FileDown, ArrowLeft } from "lucide-react";
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
  saving?: boolean;
}

function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: DocumentBlock;
  onChange: (b: DocumentBlock) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlockRenderer
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        editable
        dragHandleProps={listeners}
      />
    </div>
  );
}

export function DocumentEditor({ document: doc, onChange, onSave, onExportPdf, onBack, saving }: DocumentEditorProps) {
  const blocks = doc.blocks || [];

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

  const addBlock = useCallback((type: BlockType, placeholderKey?: string) => {
    const newBlock: DocumentBlock = {
      id: crypto.randomUUID(),
      type,
      ...(type === "heading" && { headingLevel: 2 as const, value: "" }),
      ...(type === "checklist" && { checklistItems: [{ id: crypto.randomUUID(), label: "Punkt 1", checked: false }] }),
      ...(type === "table" && { rows: 3, cols: 3, tableData: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ value: "" }))) }),
      ...(type === "dropdown" && { options: [{ label: "Option 1", value: "1" }, { label: "Option 2", value: "2" }] }),
      ...(type === "placeholder" && { placeholderKey }),
    };
    onChange({ ...doc, blocks: [...blocks, newBlock] });
  }, [blocks, doc, onChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Input
          value={doc.title || ""}
          onChange={(e) => onChange({ ...doc, title: e.target.value })}
          placeholder="Dokumenttitel..."
          className="text-lg font-semibold border-none bg-transparent h-auto p-0 focus-visible:ring-0 max-w-md"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportPdf} className="gap-2">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{saving ? "Speichert..." : "Speichern"}</span>
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-4 lg:p-8">
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
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add block button */}
            <div className="mt-6 flex justify-center">
              <BlockToolbar onAddBlock={addBlock} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
