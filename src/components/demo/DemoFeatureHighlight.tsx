import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  className?: string;
  delay?: number;
}

/**
 * Dezentes Feature-Highlight-Badge für Demo-Modus.
 * Blendet nach 5 Sekunden automatisch aus. Nur sichtbar wenn ?demo=true.
 */
export function DemoFeatureHighlight({ label, className, delay = 0 }: Props) {
  const [searchParams] = useSearchParams();
  const [visible, setVisible] = useState(false);
  const isDemo = searchParams.get("demo") === "true";

  useEffect(() => {
    if (!isDemo) return;
    const showTimer = setTimeout(() => setVisible(true), delay);
    const hideTimer = setTimeout(() => setVisible(false), delay + 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isDemo, delay]);

  if (!isDemo || !visible) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase",
        "bg-primary/15 text-primary border border-primary/30",
        "animate-in fade-in slide-in-from-bottom-1 duration-500",
        className
      )}
    >
      {label}
    </div>
  );
}
