import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  FEATURE_DEFINITIONS, 
  FeatureKey, 
  FeatureStatus, 
  FeatureStatuses,
  migrateBooleanToStatus 
} from "@/types/featureFlags";
import { FeatureStatusBadge } from "@/components/admin/FeatureStatusSelect";
import { ChevronRight, Users, Eye, EyeOff, Beaker, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderData {
  id: string;
  email: string | null;
  full_name: string | null;
  readable_id: string | null;
  feature_flags: Record<string, boolean> | null;
  feature_statuses?: FeatureStatuses | null;
}

interface FeatureRolloutDashboardProps {
  providers: ProviderData[];
  onProviderClick?: (providerId: string) => void;
}

interface FeatureDistribution {
  key: FeatureKey;
  name: string;
  description: string;
  counts: Record<FeatureStatus, number>;
  total: number;
  percentages: Record<FeatureStatus, number>;
}

const STATUS_COLORS: Record<FeatureStatus, string> = {
  disabled: 'bg-muted-foreground',
  beta: 'bg-orange-500',
  early_access: 'bg-blue-500',
  public: 'bg-green-500',
};

export function FeatureRolloutDashboard({ providers, onProviderClick }: FeatureRolloutDashboardProps) {
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);
  const [drillDownStatus, setDrillDownStatus] = useState<FeatureStatus | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  // Calculate distribution for each feature across all providers
  const featureDistributions = useMemo((): FeatureDistribution[] => {
    return FEATURE_DEFINITIONS.map(feature => {
      const counts: Record<FeatureStatus, number> = {
        disabled: 0,
        beta: 0,
        early_access: 0,
        public: 0,
      };

      providers.forEach(provider => {
        // Get the status for this feature - migrate from boolean if needed
        const statuses = migrateBooleanToStatus(
          provider.feature_flags,
          provider.feature_statuses as FeatureStatuses || null
        );
        const status = statuses[feature.key] || feature.defaultStatus;
        counts[status]++;
      });

      const total = providers.length;
      const percentages: Record<FeatureStatus, number> = {
        disabled: total > 0 ? (counts.disabled / total) * 100 : 0,
        beta: total > 0 ? (counts.beta / total) * 100 : 0,
        early_access: total > 0 ? (counts.early_access / total) * 100 : 0,
        public: total > 0 ? (counts.public / total) * 100 : 0,
      };

      return {
        key: feature.key,
        name: feature.name,
        description: feature.description,
        counts,
        total,
        percentages,
      };
    });
  }, [providers]);

  // Get providers for drill-down
  const drillDownProviders = useMemo(() => {
    if (!selectedFeature || !drillDownStatus) return [];
    
    return providers.filter(provider => {
      const statuses = migrateBooleanToStatus(
        provider.feature_flags,
        provider.feature_statuses as FeatureStatuses || null
      );
      const feature = FEATURE_DEFINITIONS.find(f => f.key === selectedFeature);
      const status = statuses[selectedFeature] || feature?.defaultStatus || 'disabled';
      return status === drillDownStatus;
    });
  }, [providers, selectedFeature, drillDownStatus]);

  const handleDrillDown = (featureKey: FeatureKey, status: FeatureStatus) => {
    setSelectedFeature(featureKey);
    setDrillDownStatus(status);
    setDrillDownOpen(true);
  };

  const getStatusIcon = (status: FeatureStatus) => {
    switch (status) {
      case 'disabled':
        return <EyeOff className="w-3 h-3" />;
      case 'beta':
        return <Beaker className="w-3 h-3" />;
      case 'early_access':
        return <Eye className="w-3 h-3" />;
      case 'public':
        return <Sparkles className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Provider gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{providers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Public Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">
              {featureDistributions.filter(f => f.percentages.public > 50).length}
            </p>
            <p className="text-xs text-muted-foreground">über 50% der Provider</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-500 flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              Beta Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">
              {featureDistributions.filter(f => f.counts.beta > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">mit Beta-Usern</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              Versteckte Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {featureDistributions.filter(f => f.percentages.disabled > 80).length}
            </p>
            <p className="text-xs text-muted-foreground">über 80% deaktiviert</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Distribution Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Rollout Status</CardTitle>
          <CardDescription>
            Klicke auf einen Statusbalken, um zu sehen, welche Provider diesen Status haben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Feature</TableHead>
                <TableHead>Verteilung</TableHead>
                <TableHead className="text-center w-[100px]">Public</TableHead>
                <TableHead className="text-center w-[100px]">Beta</TableHead>
                <TableHead className="text-center w-[100px]">Early</TableHead>
                <TableHead className="text-center w-[100px]">Deaktiviert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureDistributions.map((dist) => (
                <TableRow key={dist.key} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{dist.name}</p>
                      <p className="text-xs text-muted-foreground">{dist.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                      {/* Disabled */}
                      {dist.percentages.disabled > 0 && (
                        <div 
                          className={cn(
                            "h-full cursor-pointer transition-opacity hover:opacity-80",
                            STATUS_COLORS.disabled
                          )}
                          style={{ width: `${dist.percentages.disabled}%` }}
                          onClick={() => handleDrillDown(dist.key, 'disabled')}
                          title={`Deaktiviert: ${dist.counts.disabled} Provider`}
                        />
                      )}
                      {/* Early Access */}
                      {dist.percentages.early_access > 0 && (
                        <div 
                          className={cn(
                            "h-full cursor-pointer transition-opacity hover:opacity-80",
                            STATUS_COLORS.early_access
                          )}
                          style={{ width: `${dist.percentages.early_access}%` }}
                          onClick={() => handleDrillDown(dist.key, 'early_access')}
                          title={`Early Access: ${dist.counts.early_access} Provider`}
                        />
                      )}
                      {/* Beta */}
                      {dist.percentages.beta > 0 && (
                        <div 
                          className={cn(
                            "h-full cursor-pointer transition-opacity hover:opacity-80",
                            STATUS_COLORS.beta
                          )}
                          style={{ width: `${dist.percentages.beta}%` }}
                          onClick={() => handleDrillDown(dist.key, 'beta')}
                          title={`Beta: ${dist.counts.beta} Provider`}
                        />
                      )}
                      {/* Public */}
                      {dist.percentages.public > 0 && (
                        <div 
                          className={cn(
                            "h-full cursor-pointer transition-opacity hover:opacity-80",
                            STATUS_COLORS.public
                          )}
                          style={{ width: `${dist.percentages.public}%` }}
                          onClick={() => handleDrillDown(dist.key, 'public')}
                          title={`Öffentlich: ${dist.counts.public} Provider`}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950",
                        dist.counts.public === 0 && "text-muted-foreground opacity-50"
                      )}
                      onClick={() => dist.counts.public > 0 && handleDrillDown(dist.key, 'public')}
                      disabled={dist.counts.public === 0}
                    >
                      {dist.counts.public}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950",
                        dist.counts.beta === 0 && "text-muted-foreground opacity-50"
                      )}
                      onClick={() => dist.counts.beta > 0 && handleDrillDown(dist.key, 'beta')}
                      disabled={dist.counts.beta === 0}
                    >
                      {dist.counts.beta}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950",
                        dist.counts.early_access === 0 && "text-muted-foreground opacity-50"
                      )}
                      onClick={() => dist.counts.early_access > 0 && handleDrillDown(dist.key, 'early_access')}
                      disabled={dist.counts.early_access === 0}
                    >
                      {dist.counts.early_access}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-muted-foreground hover:text-foreground",
                        dist.counts.disabled === 0 && "opacity-50"
                      )}
                      onClick={() => dist.counts.disabled > 0 && handleDrillDown(dist.key, 'disabled')}
                      disabled={dist.counts.disabled === 0}
                    >
                      {dist.counts.disabled}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Öffentlich</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Early Access</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
          <span>Deaktiviert</span>
        </div>
      </div>

      {/* Drill-Down Dialog */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeature && (
                <>
                  {FEATURE_DEFINITIONS.find(f => f.key === selectedFeature)?.name}
                  {drillDownStatus && <FeatureStatusBadge status={drillDownStatus} />}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {drillDownProviders.length} Provider mit diesem Status
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {drillDownProviders.map((provider) => (
                <div 
                  key={provider.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    onProviderClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onProviderClick?.(provider.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{provider.full_name || "Unbekannt"}</p>
                      <p className="text-xs text-muted-foreground">{provider.email}</p>
                    </div>
                  </div>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    #{provider.readable_id || provider.id.slice(0, 8)}
                  </code>
                </div>
              ))}
              {drillDownProviders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Provider gefunden
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
