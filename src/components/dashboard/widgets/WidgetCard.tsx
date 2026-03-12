import { ReactNode } from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isEditing?: boolean;
  onRemove?: () => void;
  footer?: ReactNode;
  className?: string;
  colSpan?: 1 | 2;
}

export function WidgetCard({
  title,
  icon,
  children,
  isEditing,
  onRemove,
  footer,
  className,
  colSpan = 1,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-shadow",
        isEditing && "border-dashed border-muted-foreground/40 cursor-grab",
        colSpan === 2 && "col-span-2",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {isEditing && (
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          )}
          {icon && <span className="text-base">{icon}</span>}
          {title}
        </h3>
        {isEditing && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-border px-4 py-2">{footer}</div>
      )}
    </div>
  );
}
