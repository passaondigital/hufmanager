import { useState, useEffect, useRef } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WidgetContentProps } from "./types";

export default function WorkTimeContent(_props: WidgetContentProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-3 gap-3">
      <span className="text-2xl font-mono font-bold text-foreground">{formatTime(seconds)}</span>
      <div className="flex gap-2">
        <Button
          variant={isRunning ? "destructive" : "default"}
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isRunning ? "Stopp" : "Start"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Heutige Arbeitszeit</p>
    </div>
  );
}
