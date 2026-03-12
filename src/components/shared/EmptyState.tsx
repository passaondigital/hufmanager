import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Einheitlicher Empty State für Listen-Seiten.
 * Zeigt Icon + Titel + Beschreibung + optionaler CTA.
 */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-medium text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
