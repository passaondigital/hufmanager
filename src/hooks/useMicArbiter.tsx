import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createMicArbiterCore,
  type MicArbiterCore,
  type MicArbiterState,
  type MicConsumerId,
  type MicReleaseOptions,
} from "./micArbiterCore";
import { useAuth } from "./useAuth";
import { ulget, USER_STORAGE_KEYS } from "@/lib/user-storage";

// Zentrale Mikrofon-Arbitrierung — siehe HUFI_TODO.md ("useMicArbiter") und
// HUFI_ROADMAP.md ("AUSFALL 19.07.2026" / Hey-Hufi-Pause). HeyHufi.tsx
// (webkitSpeechRecognition) und useVoiceCapture.ts (getUserMedia/MediaRecorder)
// wollen dasselbe physische Mikrofon — ohne diesen Arbiter verwalteten sie ihren
// Zustand komplett unabhängig, nur lose über einen aus Booleans abgeleiteten
// `enabled`-Prop verbunden. Dieser Hook ist ab jetzt der EINZIGE Weg, das
// Mikrofon zu bekommen: genau ein Consumer hält es gleichzeitig, Übergänge sind
// serialisiert und warten auf eine echte Freigabe-Bestätigung statt auf einen
// festen Timing-Puffer (der laut HUFI_TODO.md schon erfolglos versucht wurde).
//
// Die eigentliche Logik steckt framework-unabhängig in `micArbiterCore.ts`
// (isoliert testbar ohne React) — dieser Wrapper bindet genau eine Instanz
// davon reaktiv an React Context/State.

export type { MicArbiterState, MicConsumerId, MicReleaseOptions };

interface MicArbiterContextValue {
  /** Aktueller Arbiter-Zustand, für UI/Debug-Zwecke reaktiv lesbar. */
  state: MicArbiterState;
  /** Wer das Mikrofon aktuell hält, oder `null` wenn frei. */
  heldBy: MicConsumerId | null;
  /**
   * Fordert das Mikrofon an. Die zurückgegebene Promise resolved erst, wenn
   * das Mikrofon WIRKLICH übergeben wurde (kein optimistisches Resolve).
   * Hält `consumerId` das Mikrofon bereits, resolved sofort (idempotent).
   */
  acquire: (consumerId: MicConsumerId) => Promise<void>;
  /**
   * Gibt das Mikrofon frei. Nur der aktuelle Halter darf freigeben (sonst
   * No-Op). `options.confirmed` sollte auf die echte Session-Ende-Bestätigung
   * des Consumers zeigen (z.B. SpeechRecognition `onend`, MediaRecorder
   * `onstop`) — ohne sie wartet der Arbiter das volle Sicherheitsfenster ab.
   */
  release: (consumerId: MicConsumerId, options?: MicReleaseOptions) => void;
}

const MicArbiterContext = createContext<MicArbiterContextValue | null>(null);

export function MicArbiterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MicArbiterState>("free");
  const [heldBy, setHeldBy] = useState<MicConsumerId | null>(null);

  // Immer aktueller Nutzer für den Consent-Check — bewusst ein Ref statt nur
  // `user?.id` in der Closure, damit `canAcquire` (unten, an den Core
  // übergeben) bei JEDEM acquire()-Aufruf den WIRKLICH aktuellen Nutzer
  // sieht, nicht den Stand beim Erzeugen des Arbiters (der Core wird nur
  // einmal lazy erzeugt, siehe coreRef).
  const { user } = useAuth();
  const userIdRef = useRef<string>(user?.id ?? "");
  userIdRef.current = user?.id ?? "";

  const coreRef = useRef<MicArbiterCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = createMicArbiterCore({
      onChange: (nextState, nextHeldBy) => {
        setState(nextState);
        setHeldBy(nextHeldBy);
      },
      // Einziger Ort für Consent-Gating (siehe HUFI_TODO.md): "wakeword"
      // darf nur mit erteilter Zustimmung (KiSettingsCard-Toggle, gespeichert
      // unter USER_STORAGE_KEYS.HEY_HUFI) akquiriert werden. "capture" (der
      // manuelle Mic-Button) ist davon unabhängig und immer erlaubt.
      canAcquire: (consumerId) => {
        if (consumerId !== "wakeword") return true;
        return ulget(userIdRef.current, USER_STORAGE_KEYS.HEY_HUFI) === "1";
      },
    });
  }
  const core = coreRef.current;

  const value = useMemo<MicArbiterContextValue>(
    () => ({
      state,
      heldBy,
      acquire: core.acquire,
      release: core.release,
    }),
    [state, heldBy, core],
  );

  return <MicArbiterContext.Provider value={value}>{children}</MicArbiterContext.Provider>;
}

export function useMicArbiter(): MicArbiterContextValue {
  const ctx = useContext(MicArbiterContext);
  if (!ctx) {
    throw new Error("useMicArbiter() muss innerhalb von <MicArbiterProvider> aufgerufen werden.");
  }
  return ctx;
}
