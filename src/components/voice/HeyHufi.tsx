import { useRef, useCallback, useEffect } from "react";

interface HeyHufiProps {
  onWakeWord: () => void;
  enabled?: boolean;
  isSpeaking?: boolean;
}

const SR =
  typeof window !== "undefined"
    ? (
        window as unknown as {
          SpeechRecognition?: typeof SpeechRecognition;
          webkitSpeechRecognition?: typeof SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: typeof SpeechRecognition;
        }
      ).webkitSpeechRecognition
    : null;

// Fuzzy wake variants: hey/hei hufi/hoofi/huffy/wufi + okay/hallo hufi
const WAKE_RE = /\b(hey\s+hu[fp]{1,2}[iy]|hei\s+hufi|hey\s+hoofi|okay\s+hufi|ok\s+hufi|hallo\s+hufi|hey\s+wufi)\b/i;
const STANDALONE_RE = /^[\s,!.?]*hufi[\s,!.?]*$/i;
const WAKE_COOLDOWN_MS = 2500;

export function HeyHufi({ onWakeWord, enabled = true, isSpeaking }: HeyHufiProps) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const runningRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWord);
  const isSpeakingRef = useRef(isSpeaking ?? false);
  const lastTriggerRef = useRef<number>(0);

  // Keep ref in sync so recognition callbacks never have stale closures
  useEffect(() => {
    onWakeWordRef.current = onWakeWord;
  }, [onWakeWord]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking ?? false;
  }, [isSpeaking]);

  const startRecognition = useCallback(() => {
    if (!SR || recRef.current) return;

    const rec: SpeechRecognition = new SR();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < WAKE_COOLDOWN_MS) return;

      // Only check the newest result to avoid re-triggering from accumulated history
      const lastResult = ev.results[ev.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase().trim();

      if (WAKE_RE.test(transcript) || STANDALONE_RE.test(transcript)) {
        lastTriggerRef.current = now;
        onWakeWordRef.current();
        // Stop to clear accumulated buffer; onend will auto-restart
        try { recRef.current?.stop(); } catch { /* ignore */ }
      }
    };

    rec.onend = () => {
      recRef.current = null;
      if (runningRef.current) {
        setTimeout(() => {
          if (runningRef.current) startRecognition();
        }, 300);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      recRef.current = null;
      if (ev.error === "not-allowed") {
        // Mikrofon verweigert — still beenden, kein Crash
        runningRef.current = false;
        return;
      }
      if (runningRef.current) {
        setTimeout(() => {
          if (runningRef.current) startRecognition();
        }, 1000);
      }
    };

    runningRef.current = true;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      runningRef.current = false;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    runningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  useEffect(() => {
    if (enabled && SR) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [enabled, startRecognition, stopRecognition]);

  return null;
}
