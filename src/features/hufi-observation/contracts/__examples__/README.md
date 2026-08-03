# Beispiel-/Testskripte für die Hufi-Observation-Contracts

Dieses Projekt hat **keine** Testinfrastruktur (kein vitest/jest, kein
Test-Runner, kein `npm test`-Skript, keine bestehenden `*.test.ts`-Dateien
— verifiziert bei der Recherche). Da laut Auftrag keine neue Bibliothek
installiert werden darf, sind die Dateien in diesem Ordner **keine**
automatisch laufende Test-Suite, sondern typgeprüfte Beispiel-/
Assertions-Skripte:

- Jede Datei ruft `Schema.safeParse(...)` mit den im Auftrag geforderten
  Fällen auf und wirft bei unerwartetem Ergebnis einen Fehler
  (`assertTrue`/`assertFalse`, siehe unten — bewusst ohne
  Node-`assert`-Import gehalten, damit die Dateien ohne
  Laufzeitumgebungs-Annahmen auskommen).
- **Geprüft werden sie über `npx tsc --noEmit`** (Typfehler, falsche
  Schema-Nutzung) — das ist der einzige automatisierte Schutz in dieser
  Phase.
- **Manuell ausführbar** sind sie nur mit einem TS-Runner, der in diesem
  Projekt nicht installiert ist (kein `tsx`/`ts-node`/`vite-node`
  gefunden). Wer sie tatsächlich laufen lassen will: z.B. lokal
  `npx --yes tsx <datei>.ts` (installiert `tsx` temporär via npx, ohne es
  dem Projekt hinzuzufügen) oder über einen Editor mit TS-Ausführung.

Wird in der nächsten Bauphase eine echte Testbibliothek eingeführt
(vermutlich vitest, da Vite bereits Build-Tool ist), lassen sich diese
Dateien nahezu unverändert übernehmen — die `assertTrue`/`assertFalse`-
Aufrufe entsprechen strukturell `expect(...).toBe(true)`.
