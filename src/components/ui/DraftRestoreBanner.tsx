import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";

interface DraftRestoreBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRestoreBanner({ onRestore, onDiscard }: DraftRestoreBannerProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
      <FileWarning className="h-4 w-4 text-amber-500 shrink-0" />
      <span className="flex-1 text-amber-200 text-xs">Du hast einen gespeicherten Entwurf.</span>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRestore}>Wiederherstellen</Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onDiscard}>Verwerfen</Button>
    </div>
  );
}
