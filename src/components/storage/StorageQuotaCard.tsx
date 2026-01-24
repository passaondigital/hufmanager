import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HardDrive, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useStorageQuota, formatBytes, EntityType, STORAGE_QUOTAS } from "@/hooks/useStorageQuota";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StorageQuotaCardProps {
  entityType: EntityType;
  entityId: string | null;
  compact?: boolean;
  showMaxFileSize?: boolean;
  className?: string;
}

export function StorageQuotaCard({
  entityType,
  entityId,
  compact = false,
  showMaxFileSize = true,
  className,
}: StorageQuotaCardProps) {
  const { usage, isLoading, quota } = useStorageQuota(entityType, entityId);

  if (!entityId) return null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className={compact ? "p-3" : "p-4"}>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const percentUsed = usage.percentUsed;
  const isWarning = percentUsed >= 80;
  const isCritical = percentUsed >= 95;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50 border", className)}>
        <HardDrive className={cn(
          "h-4 w-4 flex-shrink-0",
          isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{quota.label}</span>
            <span className="font-medium">
              {formatBytes(usage.used)} / {formatBytes(usage.total)}
            </span>
          </div>
          <Progress 
            value={percentUsed} 
            className={cn(
              "h-1.5",
              isCritical && "[&>div]:bg-destructive",
              isWarning && !isCritical && "[&>div]:bg-amber-500"
            )}
          />
        </div>
        {showMaxFileSize && (
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            max {formatBytes(usage.maxFileSize)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          Speicherplatz
          {isCritical && (
            <Badge variant="destructive" className="ml-auto text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Fast voll
            </Badge>
          )}
          {!isCritical && isWarning && (
            <Badge variant="secondary" className="ml-auto text-xs bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {Math.round(percentUsed)}% belegt
            </Badge>
          )}
          {!isWarning && (
            <Badge variant="secondary" className="ml-auto text-xs bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verfügbar
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {quota.label}-Kontingent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Belegt</span>
            <span className="font-medium">
              {formatBytes(usage.used)} von {formatBytes(usage.total)}
            </span>
          </div>
          <Progress 
            value={percentUsed} 
            className={cn(
              "h-2",
              isCritical && "[&>div]:bg-destructive",
              isWarning && !isCritical && "[&>div]:bg-amber-500"
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{formatBytes(usage.remaining)}</p>
            <p className="text-xs text-muted-foreground">Noch frei</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatBytes(usage.maxFileSize)}</p>
            <p className="text-xs text-muted-foreground">Max. pro Datei</p>
          </div>
        </div>

        {showMaxFileSize && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Einzelne Dateien dürfen maximal {formatBytes(usage.maxFileSize)} groß sein.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline quota indicator for upload buttons
export function StorageQuotaIndicator({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string | null;
}) {
  const { usage, isLoading } = useStorageQuota(entityType, entityId);
  
  if (!entityId || isLoading || !usage) return null;
  
  const percentUsed = usage.percentUsed;
  const isCritical = percentUsed >= 95;
  const isWarning = percentUsed >= 80;
  
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <HardDrive className={cn(
        "h-3 w-3",
        isCritical ? "text-destructive" : isWarning ? "text-amber-500" : ""
      )} />
      <span>
        {formatBytes(usage.remaining)} frei
        <span className="mx-1">•</span>
        max {formatBytes(usage.maxFileSize)}
      </span>
    </div>
  );
}