import type { WidgetContentProps } from "./types";
import { Cloud, Sun, CloudRain } from "lucide-react";

export default function WeatherContent(_props: WidgetContentProps) {
  // Lightweight weather placeholder - would integrate with weather API
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-2">
      <Sun className="h-10 w-10 text-amber-400" />
      <p className="text-xs text-muted-foreground">Wetter-Widget wird geladen...</p>
      <p className="text-[10px] text-muted-foreground">Standortfreigabe erforderlich</p>
    </div>
  );
}
