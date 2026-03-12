import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface ListPageHeaderProps {
  title: string;
  count?: number;
  countLabel?: string;
  action?: ReactNode;
}

/**
 * Einheitlicher Section-Header für Listen-Seiten.
 * Titel links, Badge mit Anzahl, primärer CTA rechts.
 */
export function ListPageHeader({ title, count, countLabel, action }: ListPageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
        {count !== undefined && (
          <Badge variant="secondary" className="shrink-0 text-xs font-medium">
            {count} {countLabel || ""}
          </Badge>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
