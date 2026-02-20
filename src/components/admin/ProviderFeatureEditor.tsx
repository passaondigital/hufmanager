import { Label } from "@/components/ui/label";
import { FeatureStatusSelect } from "@/components/admin/FeatureStatusSelect";
import { FeatureStatus, FeatureStatuses, FeatureKey, FeatureCategory, FEATURE_CATEGORIES, getFeaturesByCategory } from "@/types/featureFlags";
import { cn } from "@/lib/utils";
import { Zap, Layers, Sparkles } from "lucide-react";

interface ProviderFeatureEditorProps {
  featureStatuses: FeatureStatuses;
  onFeatureStatusChange: (key: FeatureKey, status: FeatureStatus) => void;
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<FeatureCategory, React.ElementType> = {
  core: Layers,
  autoflow: Zap,
  advanced: Sparkles,
};

const CATEGORY_COLORS: Record<FeatureCategory, string> = {
  core: "text-primary",
  autoflow: "text-amber-500",
  advanced: "text-purple-500",
};

export function ProviderFeatureEditor({ 
  featureStatuses, 
  onFeatureStatusChange,
  disabled 
}: ProviderFeatureEditorProps) {
  const grouped = getFeaturesByCategory();
  const categoryOrder: FeatureCategory[] = ['core', 'autoflow', 'advanced'];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Steuere, welche Module dieser Provider sieht und nutzen kann.
      </p>

      {categoryOrder.map((cat) => {
        const features = grouped[cat];
        if (!features.length) return null;
        const config = FEATURE_CATEGORIES[cat];
        const Icon = CATEGORY_ICONS[cat];

        return (
          <div key={cat}>
            <h4 className={cn("text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5", CATEGORY_COLORS[cat])}>
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </h4>
            <div className="space-y-2">
              {features.map((feature) => {
                const currentStatus = featureStatuses[feature.key] || feature.defaultStatus;
                const isDisabled = currentStatus === 'disabled';
                
                return (
                  <div 
                    key={feature.key}
                    className={cn(
                      "flex items-center justify-between p-2.5 sm:p-3 rounded-lg border transition-colors",
                      isDisabled 
                        ? "bg-muted/50 border-muted opacity-60" 
                        : currentStatus === 'beta'
                          ? "bg-orange-500/5 border-orange-500/20"
                          : currentStatus === 'early_access'
                            ? "bg-blue-500/5 border-blue-500/20"
                            : "bg-card border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <Label className={cn(
                        "font-medium text-sm",
                        isDisabled && "text-muted-foreground"
                      )}>
                        {feature.name}
                      </Label>
                      <p className={cn(
                        "text-xs text-muted-foreground truncate",
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
      })}
    </div>
  );
}
