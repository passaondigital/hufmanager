import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeatureStatus, STATUS_CONFIG } from "@/types/featureFlags";
import { cn } from "@/lib/utils";

interface FeatureStatusSelectProps {
  value: FeatureStatus;
  onValueChange: (value: FeatureStatus) => void;
  disabled?: boolean;
}

export function FeatureStatusSelect({ value, onValueChange, disabled }: FeatureStatusSelectProps) {
  const config = STATUS_CONFIG[value];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[160px]", config.color)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <StatusIndicator status={value} />
            <span>{config.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="disabled">
          <div className="flex items-center gap-2">
            <StatusIndicator status="disabled" />
            <span>Deaktiviert</span>
          </div>
        </SelectItem>
        <SelectItem value="beta">
          <div className="flex items-center gap-2">
            <StatusIndicator status="beta" />
            <span>Beta Modus</span>
          </div>
        </SelectItem>
        <SelectItem value="early_access">
          <div className="flex items-center gap-2">
            <StatusIndicator status="early_access" />
            <span>Early Access</span>
          </div>
        </SelectItem>
        <SelectItem value="public">
          <div className="flex items-center gap-2">
            <StatusIndicator status="public" />
            <span>Öffentlich</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function StatusIndicator({ status }: { status: FeatureStatus }) {
  const colorMap: Record<FeatureStatus, string> = {
    disabled: 'bg-muted-foreground',
    beta: 'bg-orange-500',
    early_access: 'bg-blue-500',
    public: 'bg-green-500',
  };

  return (
    <span className={cn("w-2 h-2 rounded-full", colorMap[status])} />
  );
}

interface FeatureStatusBadgeProps {
  status: FeatureStatus;
  size?: 'sm' | 'default';
}

export function FeatureStatusBadge({ status, size = 'default' }: FeatureStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Badge 
      variant={config.badgeVariant}
      className={cn(
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        status === 'beta' && 'bg-orange-500/20 text-orange-500 border-orange-500/30',
        status === 'early_access' && 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        status === 'public' && 'bg-green-500/20 text-green-500 border-green-500/30',
      )}
    >
      {config.label}
    </Badge>
  );
}
