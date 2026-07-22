import { useRef, useCallback, useEffect } from "react";
import { useMicArbiter } from "@/hooks/useMicArbiter";
import { isWakeWordEnabled } from "@/config/featureFlags";

interface HeyHufiProps {
  onWakeWord: () => void;
  enabled?: boolean;
  isSpeaking?: boolean;
}

const WAKEWORD: "wakeword" = "wakeword";

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
  // `acquire`/`release` direkt destrukturiert statt des ganzen `arbiter`-
  // Objekts: die beiden sind stabile Funktionsreferenzen (siehe
  // useMicArbiter.tsx), das Objekt drumherum wechselt aber bei jedem
  // Zustandswechsel des Arbiters. Effekte unten hängen an `acquire`/
  // `release`, damit sie NICHT bei jedem Arbiter-Zustandswechsel neu
  // laufen (das würde sonst z.B. nach einem Wake-Word-Release sofort
  // wieder ein Reacquire auslösen, bevor useVoiceCapture zum Zug kommt).
  const { acquire, release } = useMicArbiter();
  const recRef = useRef<SpeechRecognition | null>(null);
  const runningRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWord);
  const isSpeakingRef = useRef(isSpeaking ?? false);
  const lastTriggerRef = useRef<number>(0);
  const startedAtRef = useRef(0);
  const failCountRef = useRef(0);
  // Hält der Arbiter das Mikrofon aktuell tatsächlich FÜR UNS?
  const heldRef = useRef(false);
  // Löst die `confirmed`-Promise für den laufenden release() aus, sobald
  // `onend` WIRKLICH feuert — die primäre Freigabe-Bestätigung des Arbiters.
  const endResolveRef = useRef<(() => void) | null>(null);
  // Schützt gegen ein verspätet auflösendes acquire(), nachdem `enabled`
  // zwischenzeitlich schon wieder auf false gewechselt ist.
  const acquireTokenRef = useRef(0);
  const mountedRef = useRef(true);

  // Keep ref in sync so recognition callbacks never have stale closures
  useEffect(() => {
    onWakeWordRef.current = onWakeWord;
  }, [onWakeWord]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking ?? false;
  }, [isSpeaking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Stoppt die laufende Recognition-Session und gibt das Mikrofon über den
  // Arbiter frei — erst wenn `onend` WIRKLICH gefeuert hat (primäre
  // Bestätigung), spätestens nach dem arbiter-internen Sicherheits-Timeout.
  // Das ist die einzige Stelle, an der HeyHufi das Mikrofon wieder hergibt —
  // auch beim Wake-Word-Treffer selbst (siehe rec.onresult unten), nicht nur
  // beim Deaktivieren, damit der Arbiter IMMER weiß, wenn "wakeword" frei ist.
  const stopRecognitionAndRelease = useCallback(() => {
    runningRef.current = false;
    if (!heldRef.current) return; // hatten wir gar nicht (z.B. SR fehlt, oder Flag aus)
    heldRef.current = false;

    const confirmed = new Promise<void>((resolve) => {
      if (recRef.current) {
        endResolveRef.current = resolve;
        try {
          recRef.current.stop();
        } catch {
          resolve();
        }
      } else {
        resolve(); // keine laufende Session mehr -> sofort "beendet"
      }
    });
    recRef.current = null;
    release(WAKEWORD, { confirmed });
  }, [release]);

  const startRecognition = useCallback(() => {
    if (!SR || recRef.current) return;

    const rec: SpeechRecognition = new SR();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
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
        // Wake-Word erkannt → Mikrofon SAUBER über den Arbiter freigeben
        // (nicht nur roh stoppen). Ein roher recRef.current.stop() würde
        // onend intern ohne Freigabe neu starten lassen (runningRef bliebe
        // true) — der Arbiter erführe nie vom Release, und useVoiceCapture
        // müsste beim anschließenden acquire("capture") bis zum
        // Sicherheits-Timeout warten, statt den Übergang direkt zu bekommen.
        stopRecognitionAndRelease();
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
      // Primäre Freigabe-Bestätigung für einen laufenden release() — siehe
      // stopRecognitionAndRelease(). Muss VOR einem eventuellen Neustart
      // aufgelöst werden, da der Arbiter genau darauf wartet.
      endResolveRef.current?.();
      endResolveRef.current = null;
      if (registerEndAndShouldRetry()) {
        const delay = Math.min(300 * 2 ** failCountRef.current, 5000);
        setTimeout(() => {
          if (runningRef.current) startRecognition();
        }, delay);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      recRef.current = null;
      endResolveRef.current?.();
      endResolveRef.current = null;
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
  }, [stopRecognitionAndRelease]);

  useEffect(() => {
    // Der Feature-Flag wird hier zusätzlich zum `enabled`-Prop geprüft, nicht
    // nur vom Aufrufer vorausgesetzt: eine Instanz ohne explizit gesetztes
    // `enabled` (Default `true`, z.B. in CockpitReady) darf NIE lauschen,
    // solange `wakeWordEnabled` global aus ist (außer im Test-Override, siehe
    // isWakeWordEnabled() in featureFlags.ts — ?wakeword=test).
    const shouldRun = enabled && isWakeWordEnabled() && !!SR;
    const token = ++acquireTokenRef.current;

    if (shouldRun) {
      failCountRef.current = 0;
      acquire(WAKEWORD).then(
        () => {
          if (!mountedRef.current || acquireTokenRef.current !== token) {
            // Inzwischen deaktiviert/unmounted, bevor die Übergabe durchkam —
            // das gerade übergebene Mikrofon sofort wieder freigeben, statt
            // es ungenutzt zu halten (es wurde ja nie wirklich gestartet).
            release(WAKEWORD, { confirmed: Promise.resolve() });
            return;
          }
          heldRef.current = true;
          startRecognition();
        },
        () => {
          // Verweigert — z.B. weil der Arbiter kein Consent-Signal
          // (USER_STORAGE_KEYS.HEY_HUFI) findet. Still bleiben, kein Crash;
          // kein Retry, da sich ohne Consent-Änderung nichts ändern würde.
        },
      );
    } else {
      stopRecognitionAndRelease();
    }

    return () => {
      stopRecognitionAndRelease();
    };
  }, [enabled, acquire, release, startRecognition, stopRecognitionAndRelease]);

  return null;
}
