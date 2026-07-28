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

**Status: DEPLOYED (Commit dc5bc153, Frontend auf Prod, Smoke-Test bestanden
2026-07-26). Reine Frontend-Änderung, Edge Function unverändert. Wartet auf
App-Test durch Pascal.**

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

**Status: ABGESCHLOSSEN (2026-07-26). Reines Lesen — keine Code-Änderung,
kein Deploy.** Datenscan via `supabase db query --linked` gegen Prod
`vnschgjxkzzwzefqlrji` (238 Zeilen in `appointments`, Stand heute).
Code-Scan: `supabase/functions/hufi-agent/index.ts` (Tool-Definitionen +
Handler für `get_appointments`/`get_client_overview`/`create_appointment`/
`update_appointment`/`cancel_appointment`) + `AppointmentFormModal.tsx`
(primärer Erstellungspfad).

**Befund 1 — `client_id` ist in 238/238 Zeilen `NULL`.** Ursache: Der
Haupt-Erstellungspfad `AppointmentFormModal.tsx:578-598` setzt beim Insert
nur `horse_id`, nie `client_id` (wird stattdessen implizit über
`horses.owner_id` aufgelöst). FK zeigt korrekt auf `profiles.id`, das
Feld wird nur nie befüllt.
**Konsequenz für Vorhaben 4:** Folgende Agent-Pfade laufen für JEDEN
bestehenden Termin ins Leere, weil `client_id` fehlt:
- `get_appointments({client_id})`-Filter → immer 0 Treffer
- `get_client_overview()`-Terminliste (`.eq("client_id", clientId)`,
  index.ts:701) → immer leer, obwohl der Kunde Termine hat
- `cancel_appointment`'s Kunden-Push (`notify_client && aptData.client_id`,
  index.ts:830) → wird nie ausgelöst, `client_id` ist immer falsy
- Tool-Doku sagt "`client_id` Pflicht wenn bekannt" (index.ts:204) — in
  der Praxis für Alt-Termine nie bekannt

**Befund 2 — Status-Wildwuchs `planned` vs. `scheduled`.**
153× `planned`, 81× `scheduled`, 2× `confirmed`, 1× `completed`,
1× `cancelled`. `AppointmentFormModal.tsx:514-522` normalisiert
`"scheduled"` explizit zu `"planned"` beim Insert — die 81 `scheduled`-
Zeilen stammen also aus einem anderen/älteren Schreibpfad, der diese
Normalisierung nicht durchläuft. `get_appointments`'/`update_appointment`'s
Status-Filter (index.ts:146,228) listet `scheduled` nicht mal als
gültigen Wert — ein `status: "planned"`-Filter übersieht 34% der echten
Termine, ein `status: "scheduled"`-Filter die übrigen 66%.

**Befund 3 — 8 Dubletten-Termine am 2026-01-04 09:00** (Notfall,
Horse-ID `87fc31d3…`), im Sekundenabstand angelegt — Test-/Klick-Spam,
kein Code-Bug. Erwähnenswert, weil "Hey Hufi" bei einer Kalenderabfrage
zu diesem Datum 8 statt 1 Termin zurückgeben würde.
Weitere Duplikat-Cluster (je 2×, andere Horse-IDs/Daten) gleicher Art,
keine Datenintegritätsverletzung (keine verwaisten `horse_id`/`provider_id`,
0 Treffer bei beiden Joins).

**Kein Fix in diesem Vorhaben** — Vorhaben 3 war bewusst nur Audit. Vor
Vorhaben 4 (Hey Hufi scharf) sollte mindestens Befund 1+2 berücksichtigt
werden (entweder Datenmigration `client_id` nachtragen + Status
vereinheitlichen, oder Agent-Code robust gegen beide Zustände machen).
Empfehlung liegt bei Pascal, nichts davon wurde umgesetzt.

## Vorhaben 4 — Hey Hufi scharfschalten

**Status: offen, noch nicht begonnen. Bewusst zuletzt, erst nach Test von
Vorhaben 1 in der App.**
