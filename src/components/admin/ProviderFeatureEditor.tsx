import { Label } from "@/components/ui/label";
import { FeatureStatusSelect } from "@/components/admin/FeatureStatusSelect";
import { FEATURE_DEFINITIONS, FeatureStatus, FeatureStatuses, FeatureKey } from "@/types/featureFlags";
import { cn } from "@/lib/utils";

interface ProviderFeatureEditorProps {
  featureStatuses: FeatureStatuses;
  onFeatureStatusChange: (key: FeatureKey, status: FeatureStatus) => void;
  disabled?: boolean;
}

export function ProviderFeatureEditor({ 
  featureStatuses, 
  onFeatureStatusChange,
  disabled 
}: ProviderFeatureEditorProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Steuere, welche Module dieser Provider sieht und nutzen kann.
      </p>

      <div className="space-y-3">
        {FEATURE_DEFINITIONS.map((feature) => {
          const currentStatus = featureStatuses[feature.key] || feature.defaultStatus;
          const isDisabled = currentStatus === 'disabled';
          
          return (
            <div 
              key={feature.key}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                isDisabled 
                  ? "bg-muted/50 border-muted opacity-60" 
                  : currentStatus === 'beta'
                    ? "bg-orange-500/5 border-orange-500/20"
                    : currentStatus === 'early_access'
                      ? "bg-blue-500/5 border-blue-500/20"
                      : "bg-card border-border"
              )}
            >
              <div className="flex-1">
                <Label className={cn(
                  "font-medium",
                  isDisabled && "text-muted-foreground"
                )}>
                  {feature.name}
                </Label>
                <p className={cn(
                  "text-sm text-muted-foreground",
                  isDisabled && "opacity-70"
                )}>
                  {feature.description}
                </p>
              </div>
              <FeatureStatusSelect
                value={currentStatus}
                onValueChange={(status) => onFeatureStatusChange(feature.key, status)}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
