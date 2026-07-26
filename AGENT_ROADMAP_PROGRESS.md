# AGENT_ROADMAP_PROGRESS.md

Fortschritts-Tracker für die 4 Vorhaben aus dem Agent-Umbau (Anschluss an
`AGENT_ANALYSE.md`). Wird nach JEDEM Schritt aktualisiert, damit die Arbeit
Sessions überlebt. Beim Fortsetzen zuerst diese Datei lesen.

Branch: `feature/multi-beruf-verkabelung`
tsc-Baseline vor Vorhaben 1: **84 bekannte Fehler** (gemessen 2026-07-26,
`npx tsc --noEmit -p tsconfig.app.json`; Auftrag nannte 162 — Diskrepanz
nicht aufgeklärt, 84 ist der tatsächlich gemessene Stand und die Referenz
für alle folgenden Vorhaben).

Regel für alle 4 Vorhaben: Bestätigungszwang für mutierende Tools und der
Medizin-/Recht-Guard dürfen durch keine Änderung umgangen werden — nach
jedem Vorhaben kurz geprüft.

---

## Vorhaben 1 — Etappe 3: Kurzzeitkontext (conversationFocus)

**Status: gebaut, wartet auf App-Test durch Pascal. NICHT deployed.**

Betroffene Dateien:
- `supabase/functions/hufi-agent/index.ts`
- `src/lib/hufi-agent-client.ts`
- `src/components/layout/MobileShell.tsx`

Was gebaut wurde:
- Neuer Typ `ConversationFocus` (`{horseId?, horseName?, clientId?,
  clientName?, pendingClarification?}`), Rundtrip Client → Edge Function →
  Client.
- Client: neuer State `conversationFocus` neben `messages` in
  `MobileShell.tsx`, wird bei beiden `askHufiAgent`-Aufrufen mitgeschickt
  und aus der Antwort übernommen.
- Server: `conversationFocus` fließt als eigener Block in den System-Prompt
  ("GESPRÄCHSFOKUS aus der letzten Runde"). Wird während des
  Tool-Use-Loops aktualisiert:
  - aus `horse_id`/`client_id` in jedem Tool-Input (`updateFocusFromToolCall`)
  - aus `appointment_id` bei `update_appointment`/`cancel_appointment` (Lookup
    der zugehörigen `horse_id`)
  - aus `search_entity`-Ergebnissen bei genau einem eindeutigen Treffer
  - `pendingClarification` wird gesetzt, wenn Hufis finale Antwort mit "?"
    endet (Heuristik für "hat gerade eine Rückfrage gestellt").
- Korrektur-Flow: der alte Sonderfall für `intent === "correction"` (statische
  Antwort "was soll ich anders machen?", Sackgasse ohne Bezug zum Fokus)
  wurde entfernt. Läuft jetzt durch die normale Pipeline, die
  `conversationFocus` mitschickt.

tsc nach Vorhaben 1: **84 Fehler** — identisch zur Baseline, keine neuen
Fehler in den drei geänderten Dateien (geprüft per Zeilenabgleich gegen
die geänderten Bereiche).

Noch offen / nicht angefasst:
- `pendingClarification`-Heuristik ist bewusst simpel (Text endet mit "?").
  Falls im App-Test auffällt, dass sie zu oft/selten greift: nachschärfen.
- Kein Persistieren von `conversationFocus` über einen Seiten-Reload hinaus
  (reiner In-Memory-React-State, wie `messages` auch) — bewusst nicht gebaut,
  war nicht gefordert.

**Nächster Schritt:** Pascal testet Mehrschritt-Dialoge in der App. Danach
Freigabe für Deploy (Frontend `./deploy.sh` + Edge Function separat per
CLI auf Prod `vnschgjxkzzwzefqlrji`), erst danach Vorhaben 2.

---

## Vorhaben 2 — Etappe 4: Briefing-Systeme konsolidieren

**Status: offen, noch nicht begonnen.**

## Vorhaben 3 — Kalender-Daten-Scan (read-only Audit)

**Status: offen, noch nicht begonnen.**

## Vorhaben 4 — Hey Hufi scharfschalten

**Status: offen, noch nicht begonnen. Bewusst zuletzt, erst nach Test von
Vorhaben 1 in der App.**
