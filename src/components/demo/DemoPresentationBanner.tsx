import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Demo-Präsentationsbanner – aktiviert via ?demo=true URL-Parameter.
 * Zeigt schmalen Banner am oberen Rand für Präsentationen.
 */
export function DemoPresentationBanner() {
  const [searchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const isDemo = searchParams.get("demo") === "true";

  if (!isDemo || dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(var(--primary))] to-[#0a0700] text-white px-4 py-2 flex items-center justify-center gap-3 z-50">
      <Target className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium tracking-wide">
        Demo-Modus · HufManager Pferdeakte · März 2026
      </span>
      <button onClick={() => setDismissed(true)} className="absolute right-2 p-1 hover:bg-white/10 rounded">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
