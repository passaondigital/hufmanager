import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { WidgetContentProps } from "./types";

export default function NotesContent({ settings, onUpdateSettings }: WidgetContentProps) {
  const [text, setText] = useState((settings?.text as string) || "");

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== (settings?.text || "")) {
        onUpdateSettings({ ...settings, text });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Eigene Notizen hier eingeben..."
      className="min-h-[80px] text-sm resize-none border-none bg-muted/30 focus-visible:ring-0"
    />
  );
}
