// Reine, framework-unabhängige Kernlogik der Mikrofon-Arbitrierung — bewusst
// von React getrennt, damit sie sich isoliert (z.B. via Node-Skript) testen
// lässt, ohne einen Renderer zu brauchen. `useMicArbiter.tsx` ist nur ein
// dünner React-Wrapper um genau eine Instanz von `createMicArbiterCore`.
// Hintergrund/Warum: siehe HUFI_TODO.md ("useMicArbiter") und
// HUFI_ROADMAP.md ("AUSFALL 19.07.2026" / Hey-Hufi-Pause).

export type MicConsumerId = "wakeword" | "capture";
export type MicArbiterState = "free" | "held-wakeword" | "held-capture" | "transitioning";

export interface MicReleaseOptions {
  /**
   * Promise, die resolved, sobald die Audio-Session des Consumers WIRKLICH
   * beendet ist (z.B. `onend` von SpeechRecognition, `onstop` von
   * MediaRecorder). Primäre Bestätigung, auf die der Arbiter wartet, BEVOR
   * er das Mikrofon als frei markiert.
   *
   * `SpeechRecognition.stop()` gibt laut Web-Spec KEINE Garantie, wann die
   * Audio-Session auf OS-Ebene wirklich frei ist — `confirmed` ist daher die
   * beste verfügbare Näherung, kein hartes Versprechen. Fehlt sie oder löst
   * sie nicht rechtzeitig auf, greift `releaseSafetyTimeoutMs` als
   * Rückfallebene, damit kein Consumer das Mikrofon unbegrenzt blockiert.
   */
  confirmed?: Promise<void>;
}

export interface MicArbiterCoreOptions {
  /** Rückfallebene, falls `confirmed` nie auflöst oder fehlt (Default 1500ms). */
  releaseSafetyTimeoutMs?: number;
  /**
   * Rückfallebene gegen ein echtes Deadlock, falls acquire() protokollwidrig
   * aufgerufen wird, ohne dass der aktuelle Halter je release() ruft
   * (Default 6000ms). Erzwingt die Übergabe mit Warnung.
   */
  forceAcquireTimeoutMs?: number;
  /** Wird bei jedem Zustandswechsel aufgerufen (für React-Reaktivität o.ä.). */
  onChange?: (state: MicArbiterState, heldBy: MicConsumerId | null) => void;
  /** Injizierbar für Tests; Default: console.warn/console.error. */
  logger?: { warn: (msg: string) => void; error: (msg: string) => void };
  /**
   * Entscheidet PRO acquire()-Aufruf, ob ein Consumer das Mikrofon bekommen
   * darf — der EINE Ort für Consent-Gating (siehe HUFI_TODO.md), damit keine
   * zweite, konkurrierende Wahrheit (z.B. ein Boolean-Prop beim Aufrufer)
   * daneben existiert. Wird bei jedem acquire() frisch ausgewertet, nicht nur
   * einmalig beim Erzeugen des Arbiters. Default: immer erlaubt.
   */
  canAcquire?: (consumerId: MicConsumerId) => boolean;
}

export interface MicArbiterCore {
  getState: () => MicArbiterState;
  getHeldBy: () => MicConsumerId | null;
  acquire: (consumerId: MicConsumerId) => Promise<void>;
  release: (consumerId: MicConsumerId, options?: MicReleaseOptions) => void;
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve();
      }
    }, ms);
    promise.then(
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      },
    );
  });
}

export function createMicArbiterCore(options: MicArbiterCoreOptions = {}): MicArbiterCore {
  const releaseSafetyTimeoutMs = options.releaseSafetyTimeoutMs ?? 1500;
  const forceAcquireTimeoutMs = options.forceAcquireTimeoutMs ?? 6000;
  const logger = options.logger ?? { warn: (m: string) => console.warn(m), error: (m: string) => console.error(m) };
  const onChange = options.onChange;
  const canAcquire = options.canAcquire;

  let owner: MicConsumerId | null = null;
  let state: MicArbiterState = "free";
  // Serialisiert ALLE acquire()/release()-Übergänge in Aufrufreihenfolge —
  // ein einfacher Promise-Mutex. Verhindert, dass zwei Übergänge
  // gleichzeitig laufen, egal wie schnell Consumer hintereinander aufrufen.
  let chain: Promise<void> = Promise.resolve();
  let waiters: Array<() => void> = [];

  function serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function setState(next: MicArbiterState) {
    state = next;
    onChange?.(state, owner);
  }

  function setOwner(next: MicConsumerId | null) {
    owner = next;
    setState(next === null ? "free" : next === "wakeword" ? "held-wakeword" : "held-capture");
  }

  function acquire(consumerId: MicConsumerId): Promise<void> {
    return serialize(async () => {
      if (owner === consumerId) {
        // Schon im Besitz — idempotent, kein erneuter Übergang nötig.
        return;
      }
      if (canAcquire && !canAcquire(consumerId)) {
        logger.warn(`[useMicArbiter] acquire("${consumerId}") verweigert — keine Zustimmung.`);
        throw new Error(`mic-arbiter: acquire("${consumerId}") denied (no consent)`);
      }
      if (owner !== null) {
        // Bei korrektem release()-vor-acquire()-Protokoll sollte das nie
        // passieren: ein release() desselben Übergabeflusses wurde synchron
        // VORHER aufgerufen und ist wegen der Serialisierung hier immer
        // schon verarbeitet. Tritt es doch auf (Programmierfehler), warten
        // wir statt zu crashen — mit Sicherheits-Timeout gegen Deadlock.
        const otherOwner = owner;
        logger.warn(
          `[useMicArbiter] acquire("${consumerId}") wartet — Mikrofon wird noch von "${otherOwner}" gehalten (kein vorheriges release()?).`,
        );
        setState("transitioning");
        await withTimeout(
          new Promise<void>((resolve) => waiters.push(resolve)),
          forceAcquireTimeoutMs,
        );
        if (owner !== null) {
          logger.error(
            `[useMicArbiter] acquire("${consumerId}") nach ${forceAcquireTimeoutMs}ms erzwungen — "${owner}" hat nie release() aufgerufen.`,
          );
        }
      }
      setOwner(consumerId);
    });
  }

  function release(consumerId: MicConsumerId, releaseOptions?: MicReleaseOptions): void {
    void serialize(async () => {
      if (owner !== consumerId) {
        // Defensive: nur der aktuelle Halter darf freigeben.
        return;
      }
      setState("transitioning");
      // Ohne `confirmed` gilt der Consumer nicht sofort als fertig — wir
      // warten trotzdem das volle Sicherheitsfenster ab, weil wir sonst gar
      // kein Signal über den echten Session-Zustand haben.
      const confirmation = releaseOptions?.confirmed ?? new Promise<void>(() => {});
      await withTimeout(confirmation, releaseSafetyTimeoutMs);
      setOwner(null);
      const pending = waiters;
      waiters = [];
      pending.forEach((resolve) => resolve());
    });
  }

  return {
    getState: () => state,
    getHeldBy: () => owner,
    acquire,
    release,
  };
}
