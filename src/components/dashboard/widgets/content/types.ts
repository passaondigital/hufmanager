export interface WidgetContentProps {
  settings: Record<string, unknown>;
  widgetId: string;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  widgetType?: string;
}
