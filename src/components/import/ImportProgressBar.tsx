import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";

interface ImportProgressBarProps {
  current: number;
  total: number;
  phase: "validating" | "importing" | "done";
}

const ImportProgressBar = ({ current, total, phase }: ImportProgressBarProps) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const isDone = phase === "done";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          {isDone ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {isDone
            ? "Import abgeschlossen"
            : phase === "validating"
            ? "Validiere Daten..."
            : `Importiere ${current} von ${total}...`}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-3" />
    </div>
  );
};

export default ImportProgressBar;
