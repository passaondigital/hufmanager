import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FocusIntensity } from "@/hooks/usePhotoFocusEffect";

interface FocusEffectControlsProps {
  intensity: FocusIntensity;
  onChange: (intensity: FocusIntensity) => void;
  isProcessing?: boolean;
}

const OPTIONS: { value: FocusIntensity; label: string }[] = [
  { value: "off", label: "Aus" },
  { value: "light", label: "Leicht" },
  { value: "strong", label: "Stark" },
];

export function FocusEffectControls({ intensity, onChange, isProcessing }: FocusEffectControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Target className="w-4 h-4 text-white/70 shrink-0" />
      <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={isProcessing}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all",
              intensity === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-white/70 hover:text-white hover:bg-white/10",
              isProcessing && "opacity-50 cursor-wait"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isProcessing && (
        <span className="text-xs text-white/50 animate-pulse">Wird angewendet…</span>
      )}
    </div>
  );
}
