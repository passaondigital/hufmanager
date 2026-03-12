import type { WidgetContentProps } from "./types";

export default function PlaceholderContent({ widgetType }: WidgetContentProps) {
  return (
    <div className="flex items-center justify-center h-24 text-muted-foreground">
      <p className="text-xs">Wird bald verfügbar</p>
    </div>
  );
}
