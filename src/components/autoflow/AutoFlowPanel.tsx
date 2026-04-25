import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoFlowPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoFlowPanel({ open, onOpenChange }: AutoFlowPanelProps) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setInterim("");
  }, []);

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setUnsupported(true);
      return;
    }

    const recognition: SpeechRecognition = new SR();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += t + " ";
        else interimChunk += t;
      }
      if (finalChunk) setTranscript(prev => prev + finalChunk);
      setInterim(interimChunk);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };

    recognition.onerror = () => {
      setRecording(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, []);

  const handleOpenChange = (o: boolean) => {
    if (!o) stopRecognition();
    onOpenChange(o);
  };

  const reset = () => {
    setTranscript("");
    setInterim("");
  };

  const hasContent = transcript.length > 0 || interim.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[55dvh] rounded-t-2xl flex flex-col gap-0 px-4 pb-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            AutoFlow
          </SheetTitle>
        </SheetHeader>

        {/* Transcript area */}
        <div className="flex-1 rounded-xl bg-muted/50 border border-border p-4 overflow-y-auto mb-4">
          {unsupported ? (
            <p className="text-sm text-destructive">
              Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.
            </p>
          ) : hasContent ? (
            <p className="text-sm leading-relaxed">
              <span className="text-foreground">{transcript}</span>
              <span className="text-muted-foreground italic">{interim}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {recording
                ? "Höre zu…"
                : "Mikrofon-Button drücken und Befund oder Notiz einsprechen."}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {hasContent && !recording && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </Button>
          )}

          <button
            onClick={recording ? stopRecognition : startRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
              recording
                ? "bg-destructive text-destructive-foreground shadow-destructive/30 scale-110"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-105 active:scale-95"
            )}
            style={recording ? { animation: "pulse 1.5s infinite" } : undefined}
          >
            {recording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          {transcript && !recording && (
            <Button size="sm" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Senden
            </Button>
          )}
        </div>

        {recording && (
          <p className="text-center text-xs text-muted-foreground mt-3 animate-pulse">
            Aufnahme läuft · Stopp zum Beenden
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
