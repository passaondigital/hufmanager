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

**Status: DEPLOYED (Commit 573a7429, Frontend + Edge Function auf Prod
vnschgjxkzzwzefqlrji, Smoke-Test bestanden 2026-07-26). Wartet auf App-Test
durch Pascal.**

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

**Nächster Schritt:** Pascal testet Mehrschritt-Dialoge in der App (bereits
live). Vorhaben 2 wird auf Wunsch parallel gebaut, aber NICHT deployed, bis
Vorhaben 1 in der App bestätigt ist.

---

## Vorhaben 2 — Etappe 4: Briefing-Systeme konsolidieren

**Status: gebaut, wartet auf App-Test durch Pascal. NICHT deployed (Freigabe
erst nach bestätigtem App-Test von Vorhaben 1, wie vereinbart).**

Betroffene Dateien:
- `src/lib/hufai-proactive.ts` — Briefing-Duplikat entfernt (`BriefingPayload`,
  `BriefingAction`, `buildBriefingPayload`, `shouldShowBriefing`,
  `markBriefingShown`, TTL-Konstanten, dazu die nur dafür genutzten
  `weatherLabel`/`isWet`-Helper). Datei ist jetzt reines Wetter-Modul
  (`fetchWeatherContext`/`WeatherContext`, weiterhin von `HufiWeatherWidget.tsx`
  genutzt).
- `src/components/voice/ProactiveBriefing.tsx` — rendert jetzt die
  `hufi-briefing.ts`-Form (`greeting`/`sections`/`totalItems` statt
  `text`/`lines`/`actions`). Eigener `markBriefingShown()`-Aufruf entfernt
  (Once-per-Tag-Marking passiert schon in `MobileShell.tsx` vor dem Bauen
  des Payloads — der zweite Aufruf war Teil der State-Kollision).
- `src/components/layout/MobileShell.tsx` — 4h-TTL-Zweig entfernt, nur noch
  der kalendertag-gebundene Pfad (`hufi-briefing.ts`) bleibt. Als direkte
  Folge (nicht mehr referenziert): `bizCtxRef`/`fetchBusinessContext`-Aufruf
  entfernt (fütterte nur die jetzt gelöschte Lagerbestand-Zeile im alten
  System). Zusätzlich: `buildDailyBriefing` bekommt jetzt echtes Wetter
  statt hart `null` (die Wetter-Sektion des Tages-Briefings war dadurch
  vorher permanent tot) — kleine, direkt angrenzende Verbesserung, kein
  neuer Scope.

tsc nach Vorhaben 2: **83 Fehler** (−1 gegenüber Vorhaben-1-Stand von 84) —
der bekannte `BriefingPayload`-Typkonflikt (Zeile 453) ist behoben, keine
neuen Fehler in den geänderten Dateien.

Guard/Bestätigungszwang geprüft — unverändert intakt (Vorhaben 2 hat den
Edge-Function-Code nicht angefasst).

**Noch zu prüfen (App-Test):** Startet das Tages-Briefing wirklich sauber
bei 0 pro Kalendertag/Zeitfenster (morning/midday/evening)? Erscheint die
Wetter-Sektion jetzt bei Regen/Frost am Morgen?

## Vorhaben 3 — Kalender-Daten-Scan (read-only Audit)

**Status: offen, noch nicht begonnen.**

## Vorhaben 4 — Hey Hufi scharfschalten

**Status: offen, noch nicht begonnen. Bewusst zuletzt, erst nach Test von
Vorhaben 1 in der App.**
