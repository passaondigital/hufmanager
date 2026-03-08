import { useCallback } from "react";
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
import { GripVertical, Eye, EyeOff, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EditorSection } from "@/hooks/useWebsiteEditor";

interface SectionsPanelProps {
  editor: any;
}

function SortableSection({
  section,
  onToggle,
  onEdit,
  isActive,
}: {
  section: EditorSection;
  onToggle: () => void;
  onEdit: () => void;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg",
        section.enabled ? "bg-card border-border" : "bg-muted/30 border-transparent opacity-60",
        isActive && "ring-2 ring-primary border-primary"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="text-base">{section.icon}</span>
      <span className="flex-1 text-sm font-medium text-foreground truncate">{section.label}</span>
      {section.enabled && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      <Switch
        checked={section.enabled}
        onCheckedChange={onToggle}
        disabled={section.locked}
        className="scale-90"
      />
    </div>
  );
}

export const SectionsPanel = ({ editor }: SectionsPanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const enabledSections = editor.sections.filter((s: EditorSection) => s.enabled);
  const disabledSections = editor.sections.filter((s: EditorSection) => !s.enabled);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = editor.sections.findIndex((s: EditorSection) => s.id === active.id);
      const newIndex = editor.sections.findIndex((s: EditorSection) => s.id === over.id);
      const newSections = arrayMove(editor.sections, oldIndex, newIndex);
      editor.reorderSections(newSections);
    },
    [editor]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Abschnitte</h3>
      </div>

      {/* Active sections - sortable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={enabledSections.map((s: EditorSection) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {enabledSections.map((section: EditorSection) => (
              <SortableSection
                key={section.id}
                section={section}
                isActive={editor.activeSection === section.id}
                onToggle={() => editor.toggleSection(section.id)}
                onEdit={() =>
                  editor.setActiveSection(
                    editor.activeSection === section.id ? null : section.id
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Disabled sections */}
      {disabledSections.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">Inaktiv</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <div className="space-y-1.5">
            {disabledSections.map((section: EditorSection) => (
              <div
                key={section.id}
                className="flex items-center gap-2 p-2.5 rounded-lg opacity-50"
              >
                <span className="text-base">{section.icon}</span>
                <span className="flex-1 text-sm text-muted-foreground">{section.label}</span>
                <Switch
                  checked={false}
                  onCheckedChange={() => editor.toggleSection(section.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
