/**
 * Synchrone Sperre gegen Doppel-Submits.
 *
 * `disabled={mutation.isPending}` reicht nicht: ein schneller Doppelklick
 * feuert zwei onClick-Events, bevor React den Button neu rendert. Beide
 * Klicks starten dann eine eigene Anlage (gemessen in Production: zwei
 * Kunden bzw. zwei Pferde mit 1–20 ms Abstand). Diese Sperre greift
 * synchron beim ersten Aufruf und gibt erst frei, wenn der Vorgang
 * vollständig abgeschlossen ist.
 */
export function createSubmitLock() {
  let locked = false;
  return async function runLocked<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
    if (locked) return undefined;
    locked = true;
    try {
      return await fn();
    } finally {
      locked = false;
    }
  };
}
