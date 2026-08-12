import { useRef, useCallback, useEffect } from "react";

// Lokale Typen für die Web Speech API (nicht in allen TS-DOM-Libs enthalten)
type SpeechRecognitionResultLike = { transcript: string };
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike> & { isFinal: boolean }>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface HeyHufiProps {
  onWakeWord: () => void;
  enabled?: boolean;
  isSpeaking?: boolean;
}

const SR =
  typeof window !== "undefined"
    ? (
        window as unknown as {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).webkitSpeechRecognition
    : null;

// Fuzzy wake variants: hey/hei hufi/hoofi/huffy/wufi + okay/hallo hufi
const WAKE_RE = /\b(hey\s+hu[fp]{1,2}[iy]|hei\s+hufi|hey\s+hoofi|okay\s+hufi|ok\s+hufi|hallo\s+hufi|hey\s+wufi)\b/i;
const STANDALONE_RE = /^[\s,!.?]*hufi[\s,!.?]*$/i;
const WAKE_COOLDOWN_MS = 2500;

// Schutz gegen Endlos-Neustart-Schleifen: auf ChromeOS/Chrome kann
// webkitSpeechRecognition mit MediaRecorder (echte Aufnahme) um dasselbe
// Mikrofon kollidieren. Dann endet/scheitert die Session sofort wieder
// (onend/onerror binnen weniger hundert ms), ohne je Sprache zu erkennen —
// und ohne Limit würde das für immer weiterlaufen (Mikrofon-Icon pingt
// endlos, Wake-Word triggert nie). Deshalb: nur Sessions, die kurz nach dem
// Start enden, zählen als "Fehlschlag"; nach MAX_CONSECUTIVE_FAILURES in
// Folge geben wir auf, bis `enabled` erneut auf true wechselt.
const MIN_HEALTHY_SESSION_MS = 1500;
const MAX_CONSECUTIVE_FAILURES = 3;

export function HeyHufi({ onWakeWord, enabled = true, isSpeaking }: HeyHufiProps) {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const runningRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWord);
  const isSpeakingRef = useRef(isSpeaking ?? false);
  const lastTriggerRef = useRef<number>(0);
  const startedAtRef = useRef(0);
  const failCountRef = useRef(0);

  // Keep ref in sync so recognition callbacks never have stale closures
  useEffect(() => {
    onWakeWordRef.current = onWakeWord;
  }, [onWakeWord]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking ?? false;
  }, [isSpeaking]);

  const startRecognition = useCallback(() => {
    if (!SR || recRef.current) return;

    const rec: SpeechRecognitionLike = new SR();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      // Erhalten wir ein echtes Ergebnis, läuft die Session stabil —
      // die Fehler-Zählung wird zurückgesetzt.
      failCountRef.current = 0;
      if (isSpeakingRef.current) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < WAKE_COOLDOWN_MS) return;

      // Only check the newest result to avoid re-triggering from accumulated history
      const lastResult = ev.results[ev.results.length - 1];
      const transcript = lastResult?.[0]?.transcript?.toLowerCase().trim();
      if (!transcript) return;

      if (WAKE_RE.test(transcript) || STANDALONE_RE.test(transcript)) {
        lastTriggerRef.current = now;
        onWakeWordRef.current();
        // Stop to clear accumulated buffer; onend will auto-restart
        try { recRef.current?.stop(); } catch { /* ignore */ }
      }
    };

    // Registriert eine beendete Session als Fehlschlag, wenn sie zu kurz
    // gelebt hat (Indiz für Mikrofon-Konflikt statt normaler Nutzung), und
    // bricht die Neustart-Schleife nach MAX_CONSECUTIVE_FAILURES ab.
    // Gibt true zurück, wenn ein Neustart erfolgen soll.
    function registerEndAndShouldRetry(): boolean {
      if (!runningRef.current) return false; // absichtlicher Stop — kein Fehler
      const livedMs = Date.now() - startedAtRef.current;
      if (livedMs < MIN_HEALTHY_SESSION_MS) {
        failCountRef.current += 1;
      } else {
        failCountRef.current = 0;
      }
      if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
        runningRef.current = false;
        console.warn(
          "[HeyHufi] Wiederholt kurze Recognition-Sessions (vermutlich Mikrofon-Konflikt mit einer laufenden Aufnahme) — Wake-Word pausiert, bis erneut aktiviert wird.",
        );
        return false;
      }
      return true;
    }

    rec.onend = () => {
      recRef.current = null;
      if (registerEndAndShouldRetry()) {
        const delay = Math.min(300 * 2 ** failCountRef.current, 5000);
        setTimeout(() => {
          if (runningRef.current) startRecognition();
        }, delay);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      recRef.current = null;
      if (ev.error === "not-allowed") {
        // Mikrofon verweigert — still beenden, kein Crash
        runningRef.current = false;
        return;
      }
      if (registerEndAndShouldRetry()) {
        const delay = Math.min(1000 * 2 ** failCountRef.current, 8000);
        setTimeout(() => {
          if (runningRef.current) startRecognition();
        }, delay);
      }
    };

    runningRef.current = true;
    startedAtRef.current = Date.now();
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
      failCountRef.current = 0;
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
