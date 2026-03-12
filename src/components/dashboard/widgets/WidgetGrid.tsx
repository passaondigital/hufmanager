import { useState } from "react";
import { DashboardWidgetData, getWidgetDef, getWidgetsForRole, type WidgetDefinition } from "./widgetRegistry";
import { WidgetCard } from "./WidgetCard";
import { WidgetRenderer } from "./WidgetRenderer";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface WidgetGridProps {
  widgets: DashboardWidgetData[];
  isLoading: boolean;
  role: "provider" | "partner" | "employee";
  onUpdateWidget: (update: Partial<DashboardWidgetData> & { id: string }) => void;
  onAddWidget: (widget: Omit<DashboardWidgetData, "id" | "user_id">) => void;
  onRemoveWidget: (id: string) => void;
  onResetWidgets: () => void;
}

export function WidgetGrid({
  widgets,
  isLoading,
  role,
  onUpdateWidget,
  onAddWidget,
  onRemoveWidget,
  onResetWidgets,
}: WidgetGridProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const isMobile = useIsMobile();

  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.position_y !== b.position_y) return a.position_y - b.position_y;
    return a.position_x - b.position_x;
  });

  const availableWidgets = getWidgetsForRole(role);
  const activeTypes = new Set(widgets.map((w) => w.widget_type));
  const addableWidgets = availableWidgets.filter((w) => !activeTypes.has(w.type));

  const handleAddWidget = (def: WidgetDefinition) => {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.position_y), -1);
    onAddWidget({
      widget_type: def.type,
      position_x: 0,
      position_y: maxY + 1,
      width: def.defaultWidth,
      height: def.defaultHeight,
      is_active: true,
      settings: {},
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Edit Toggle */}
      <div className="flex justify-end">
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              setShowStore(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Fertig
            </>
          ) : (
            <>
              <Settings className="h-3.5 w-3.5" />
              Anpassen
            </>
          )}
        </Button>
      </div>

      {/* Widget Grid */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {sortedWidgets.map((widget) => {
          const def = getWidgetDef(widget.widget_type);
          return (
            <WidgetCard
              key={widget.id}
              title={def?.label || widget.widget_type}
              icon={def?.icon}
              isEditing={isEditing}
              onRemove={() => onRemoveWidget(widget.id)}
              colSpan={isMobile ? 1 : (widget.width as 1 | 2)}
            >
              <WidgetRenderer
                type={widget.widget_type}
                settings={widget.settings}
                widgetId={widget.id}
                onUpdateSettings={(settings) =>
                  onUpdateWidget({ id: widget.id, settings })
                }
              />
            </WidgetCard>
          );
        })}
      </div>

      {/* Widget Store */}
      {isEditing && (
        <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Widgets hinzufügen
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground"
              onClick={onResetWidgets}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zurücksetzen
            </Button>
          </div>

          {addableWidgets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Alle verfügbaren Widgets sind aktiv.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {addableWidgets.map((def) => (
                <button
                  key={def.type}
                  onClick={() => handleAddWidget(def)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-accent/50 transition-all text-center"
                >
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-xs font-medium text-foreground">{def.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
