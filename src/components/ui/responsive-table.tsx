import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  priority?: "primary" | "secondary"; // primary shows in card title area
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = "Keine Daten vorhanden",
  emptyIcon,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile: Card View
  if (isMobile) {
    const primaryColumns = columns.filter(c => c.priority === "primary" || !c.hideOnMobile);
    const secondaryColumns = columns.filter(c => c.priority === "secondary" && !c.hideOnMobile);

    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item, index) => (
          <Card
            key={String(item[keyField])}
            className={cn(
              "overflow-hidden transition-all animate-slide-up",
              onRowClick && "cursor-pointer hover:shadow-md active:scale-[0.98]"
            )}
            style={{ animationDelay: `${index * 30}ms` }}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              {/* Primary Info */}
              <div className="space-y-2">
                {primaryColumns.slice(0, 3).map((col) => {
                  const value = col.render 
                    ? col.render(item) 
                    : item[col.key as keyof T];
                  
                  return (
                    <div 
                      key={String(col.key)} 
                      className={cn(
                        "flex items-center justify-between gap-2",
                        col.className
                      )}
                    >
                      <span className="text-xs text-muted-foreground font-medium shrink-0">
                        {col.header}
                      </span>
                      <span className="text-sm text-foreground text-right truncate">
                        {value as React.ReactNode}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Secondary Info (if more columns) */}
              {primaryColumns.length > 3 && (
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                  {primaryColumns.slice(3).map((col) => {
                    const value = col.render 
                      ? col.render(item) 
                      : item[col.key as keyof T];
                    
                    return (
                      <div 
                        key={String(col.key)} 
                        className={cn("text-xs", col.className)}
                      >
                        <span className="text-muted-foreground">{col.header}: </span>
                        <span className="text-foreground">{value as React.ReactNode}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Table View
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {columns.filter(c => !c.hideOnMobile || !isMobile).map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.filter(c => !c.hideOnMobile || !isMobile).map((col) => {
                const value = col.render 
                  ? col.render(item) 
                  : item[col.key as keyof T];
                
                return (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "px-4 py-3 text-sm text-foreground",
                      col.className
                    )}
                  >
                    {value as React.ReactNode}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
