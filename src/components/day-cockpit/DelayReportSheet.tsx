import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  FullscreenSheet,
  FullscreenSheetContent,
  FullscreenSheetHeader,
  FullscreenSheetTitle,
  FullscreenSheetDescription,
  FullscreenSheetBody,
  FullscreenSheetFooter,
} from "@/components/ui/fullscreen-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DelayReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (delayMinutes: number) => void;
  isSending?: boolean;
}

const PRESET_DELAYS = [10, 20, 30];

export function DelayReportSheet({ open, onOpenChange, onConfirm, isSending }: DelayReportSheetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const effectiveDelay = useCustom ? parseInt(custom, 10) : selected;
  const isValid = effectiveDelay != null && effectiveDelay > 0 && !isNaN(effectiveDelay);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(effectiveDelay!);
      // Reset
      setSelected(null);
      setCustom("");
      setUseCustom(false);
    }
  };

  return (
    <FullscreenSheet open={open} onOpenChange={onOpenChange}>
      <FullscreenSheetContent className="h-auto max-h-[60vh]" showDragHandle>
        <FullscreenSheetHeader>
          <FullscreenSheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Verspätung melden
          </FullscreenSheetTitle>
          <FullscreenSheetDescription>
            Alle noch ausstehenden Kunden werden benachrichtigt.
          </FullscreenSheetDescription>
        </FullscreenSheetHeader>

        <FullscreenSheetBody className="space-y-4">
          <p className="text-sm font-medium text-foreground">Wie viel Verspätung?</p>
          <div className="flex gap-3">
            {PRESET_DELAYS.map(mins => (
              <button
                key={mins}
                onClick={() => { setSelected(mins); setUseCustom(false); }}
                className="flex-1 rounded-xl py-4 text-center font-bold text-lg transition-colors"
                style={{
                  background: !useCustom && selected === mins ? "#F5970A" : "hsl(var(--muted))",
                  color: !useCustom && selected === mins ? "#111" : "hsl(var(--foreground))",
                }}
              >
                +{mins} min
              </button>
            ))}
          </div>

          <button
            onClick={() => { setUseCustom(true); setSelected(null); }}
            className="w-full text-sm font-medium py-2 rounded-lg transition-colors"
            style={{
              background: useCustom ? "hsl(var(--accent))" : "transparent",
              color: "hsl(var(--foreground))",
            }}
          >
            Eigene Minuten eingeben
          </button>

          {useCustom && (
            <Input
              type="number"
              min={1}
              max={180}
              placeholder="Minuten eingeben..."
              value={custom}
              onChange={e => setCustom(e.target.value)}
              className="text-center text-lg font-bold"
              autoFocus
            />
          )}
        </FullscreenSheetBody>

        <FullscreenSheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSending}
            className="flex-1"
            style={{ background: "#F5970A", color: "#111" }}
          >
            {isSending ? "Wird gesendet..." : `${isValid ? effectiveDelay + " min" : ""} Verspätung melden`}
          </Button>
        </FullscreenSheetFooter>
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
}
