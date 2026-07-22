# AGENT_ANALYSE.md

Reine Analyse, Stand 22.07.2026, Branch `feature/multi-beruf-verkabelung`,
Commit `45ef53be`. **Nichts an Code oder Doku sonst verändert, nichts
committet, nichts deployt** — nur diese eine Datei neu angelegt.

Anlass: Der Mic-Arbiter (useMicArbiter) läuft stabil, aber die
Agent-/Konversationsschicht darüber zeigt vier reale Testprotokoll-Befunde
(gegenteilige Aktionen, simulierte Tool-Calls, Kontextverlust, zwei
UX-Brüche). Diese Datei erklärt WARUM, mit exakten Codestellen.

---

## 🔴 Kritisch — Hufi handelt falsch oder gar nicht

### 1. "Termin löschen" wird zu "Termin anlegen" — Root Cause gefunden

Datei: `src/lib/hufi-intent.ts:112-120`

```ts
function extractAction(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rechnung")) return "create_invoice";
  if (lower.includes("termin")) return "create_appointment";   // ← trifft ZUERST
  if (lower.includes("erinnerung") || lower.includes("erinnere")) return "set_reminder";
  if (lower.includes("sende") || lower.includes("nachricht")) return "send_message";
  if (lower.includes("lösche") || lower.includes("storniere")) return "delete";  // ← wird nie erreicht
  return "generic_action";
}
```

**Mechanismus:** Reine `if`-Kette ohne Priorität nach Spezifität. Jede
Nachricht, die sowohl "termin" als auch "lösche"/"storniere" enthält
("Terminlöschen", "Lösche den Termin", "Du sollst für das ganze Jahr
löschen" [+ vorheriger Termin-Kontext]), matcht auf `includes("termin")`
**bevor** die Lösch-Prüfung überhaupt erreicht wird. Das Verb wird
komplett ignoriert — nur das Substantiv "Termin" entscheidet.

**Das ist NICHT die einzige Lücke.** Selbst wenn man die Reihenfolge
fixt, landet man bei `"delete"` in einer Sackgasse:

Datei: `src/lib/hufi-agent-tasks.ts:66-79`
```ts
export function taskTypeToActionType(type: AgentTaskType): HufiAction["type"] {
  switch (type) {
    ...
    case "delete": return "remind_dsgvo";   // ← "Löschen" wird zu "Erinnerung setzen"!
    ...
  }
}
```

Und in `src/lib/hufi-actions.ts` gibt es im `HufiAction["type"]`-Union
(Zeile 8-18) **überhaupt kein** `delete_appointment` / `cancel_appointment`.
`remind_dsgvo` ruft `_setReminder()` auf — schreibt einen Memory-Eintrag,
löscht nichts. Es gibt also **keinen echten "Termin löschen"-Pfad im
Client-Code**, weder korrekt geroutet noch korrekt ausgeführt.

**Wichtig:** Der Fehler passiert **komplett client-seitig, ohne dass die
KI je konsultiert wird.** `detectIntent()` (regelbasiert) erkennt
"agent_action" korrekt (weil `"lösche"` in `ACTION_KW` steht, Zeile 50-55),
aber die konkrete Aktion wird von der oben gezeigten kaputten
`extractAction()`-Funktion bestimmt — rein regelbasiert, kein LLM
beteiligt (Details siehe Abschnitt 1 unten).

**Der einzige Ort, wo ein echtes `cancel_appointment`-Tool existiert und
funktioniert, ist server-seitig** in
`supabase/functions/hufi-agent/index.ts:214` (Claude-Tool-Definition +
Handler) — aber dieser Pfad wird für "agent_action"-Intents nie erreicht
(siehe Punkt 3).

---

### 2. Simulierte Tool-Calls im Voice-Modus — Root Cause gefunden

Datei: `supabase/functions/hufi-agent/index.ts:1114`
```ts
tools: voiceMode ? [] : HUFI_TOOLS, // Voice: keine Tools (zu langsam)
```

Gleichzeitig steht im System-Prompt, der **unabhängig vom Modus immer**
mitgeschickt wird (`HUFI_BASE`, Zeile 41-67, eingebaut in `systemPrompt`
Zeile 1292-1301):
```
Kernregeln:
- IMMER zuerst die Tools nutzen um echte Daten zu holen — nie raten.
- Wenn ein Name unklar ist: search_entity aufrufen, Vorschläge präsentieren.
...
Tool-Nutzung:
- search_entity → immer wenn Name genannt wird und ID unbekannt
- get_appointments → bei Kalender-/Terminanfragen
...
- create/update/cancel_appointment → bei Termin-Actions (nach Bestätigung)
```

**Mechanismus:** Im Voice-Modus bekommt Claude über den `tools`-Parameter
der Anthropic-API **buchstäblich keine einzige Funktion** — das Array ist
leer. Das Modell kann technisch gar keinen `tool_use`-Block erzeugen. Der
System-Prompt sagt ihm aber unverändert, es solle "IMMER zuerst Tools
nutzen" und listet `search_entity` und Co. als verfügbare Werkzeuge auf.
Das Modell tut das Einzige, was es kann: Es beschreibt in Textform, was es
"tun würde" ("Ich rufe jetzt die Pferdeakten auf", "_search_entity wird
aufgerufen..._") — reines Halluzinieren von Werkzeuggebrauch, weil die
Systemanweisung und die tatsächliche API-Konfiguration widersprüchlich
sind. Die Kommentierung "zu langsam" deutet auf eine bewusste
Performance-Entscheidung hin, die aber nie im Prompt nachgezogen wurde.

**`search_entity` ist real** — als Tool-Definition UND Handler
(`index.ts:100`, Handler ab `index.ts:364`), nur eben in Voice nicht
erreichbar. Das Modell hat den Namen nicht erfunden, sondern zitiert ihn
korrekt aus dem System-Prompt — es kann ihn nur nicht ausführen.

**Zweiter, unabhängiger simulierter-Aktions-Bug im "Action"-Modus:**
`planAndConfirmAction()` in `MobileShell.tsx:1105` ruft `askHufiAgent(...,
mode: "action")` auf und erwartet ein JSON `{taskType, payload,
explanation, confirmText}` als **rohen Text-Response**
(`index.ts:1349-1358`, `JSON.parse(cleaned)`). Es gibt **nirgends im
System-Prompt eine Anweisung an das Modell, dieses JSON-Format zu
erzeugen** (grep über die komplette Datei bestätigt: kein Treffer für
`taskType`/`confirmText` im Prompt-Text). Das Modell antwortet also ganz
normal in Prosa, `cleaned.startsWith("{")` ist praktisch nie `true`,
`actionPlan` bleibt `null`, und `planAndConfirmAction` fällt **immer**
auf den kaputten Keyword-Fallback aus Punkt 1 zurück — der "KI-Plan" ist
in der Praxis toter Code, nicht weil der API-Call fehlschlägt, sondern
weil das erwartete Antwortformat nie im Prompt verankert wurde.

---

## 🟡 Macht Hufi unbrauchbar

### 3. Kontextverlust — kein Kurzzeitgedächtnis für "worüber reden wir gerade"

**Es gibt keine Slot-/Entity-Kurzzeitverfolgung.** Grep über
`hufi-brain.ts`, `MobileShell.tsx`, `hufi-intent.ts` nach
`currentHorse`/`activeHorse`/`lastMentioned`/`focusEntity` — **null
Treffer.** Was es stattdessen gibt:

- **Rohe Chat-Historie wird tatsächlich mitgeschickt** (kein reiner
  Einzelaufruf ohne Historie): `MobileShell.tsx:1514-1519`
  (`messages.slice(-6)`) bzw. `:1132-1135` (`messages.slice(-4)`) →
  `askHufiAgent()` → Edge Function truncated nochmal auf
  `MAX_HISTORY = 8` (`index.ts:13, 1304`). Für die reine LLM-Pipeline
  (Wissen/Lookup) ist also ein Kurzfenster von Rohtext-Turns vorhanden.
- **Für den `agent_action`-Pfad greift das aber nicht** —
  `extractHorseName()`/`extractClientName()` (`hufi-intent.ts:64-110`)
  suchen NUR gegen bereits gespeicherte Langzeit-Memory-Einträge
  (`category === "horse_pattern"` / `"client_note"`). Eine im laufenden
  Gespräch genannte, aber noch nicht in `hufiCtx.memory` verewigte
  Besitzerin wird bei jeder neuen Turn erneut nicht gefunden.
- **Kein Zustand für "wartet auf Antwort auf Klärungsfrage".** Es gibt
  zwar einen `correction`-Intent (`"nein"`, `"das stimmt nicht"` etc.,
  `hufi-intent.ts:310-318`), aber keine Slot-Filling-Logik, die eine
  Folge-Äußerung wie "beide gehören derselben Besitzerin" als Antwort auf
  eine vorher gestellte Rückfrage interpretiert. Ob dieser Satz überhaupt
  in einen der bekannten Intents fällt, hängt vom Zufall der
  Keyword-Listen ab — plausibel landet er in `agent_proactive` (Fallback,
  `hufi-intent.ts:391`) oder `knowledge` (kurzer Satz,
  `hufi-intent.ts:387-389`), beides Sackgassen ohne Bezug zur
  vorherigen Frage.

**Fazit:** Es gibt "Gedächtnis" im Sinn von "Text der letzten paar
Nachrichten geht mit" — aber kein strukturiertes "das ist gerade das
Thema", das über reines Text-Wiederholen hinausgeht. Ob ein wiederholter
Fakt tatsächlich ankommt, hängt komplett davon ab, ob das LLM ihn aus dem
Rohtext richtig herausliest — und der `agent_action`-Pfad erreicht das LLM
in der Praxis oft gar nicht (siehe Punkt 2, zweiter Teil).

---

## 🟢 Schon richtig gebaut, kann bleiben

- **Der Claude-Tool-Use-Loop selbst ist sauber implementiert**
  (`callClaudeWithTools`, `index.ts:1081-1168`): iteriert bis
  `MAX_TOOLS_ROUNDS = 4`, führt `tool_use`-Blöcke wirklich aus
  (`executeTool(...)`), füttert `tool_result` zurück, bricht bei
  `stop_reason === "end_turn"` sauber ab. Für den Chat-Modus
  (`voiceMode = false`) ist das eine echte, funktionierende
  Function-Calling-Schicht — kein Fake.
- **Die Tool-Definitionen selbst sind vollständig und gut beschrieben**
  (`search_entity`, `get_appointments`, `get_horse_record`,
  `get_client_overview`, `get_invoice_history`, `send_notification`,
  `create_appointment`, `update_appointment`, `cancel_appointment`,
  `create_invoice`, `create_note`, `create_horse`, `create_contact`,
  `add_expense` — `index.ts:98-303`). `cancel_appointment` existiert
  bereits — der fehlende Teil ist die Verkabelung dorthin, nicht der
  Tool selbst.
- **Navigation-Intent ist sauber deterministisch und bewusst konservativ**
  (`detectNavigationTarget`, `hufi-intent.ts:256-300`): Regex-Matcher mit
  klaren Prioritäten (Ziel-Matcher vor Namens-Fallback,
  Stopword-Filter), bypasst die KI komplett für "öffne Kalender" o.ä. —
  schnell, vorhersehbar, kein Fehlerpotential wie bei `extractAction()`.
- **EU-AI-Act-Logging ist vorhanden**: jede `executeHufiAction()` schreibt
  vorab einen `hufi_context_log`-Eintrag (`hufi-actions.ts:96-114|`), inkl.
  Payload und Begründung (`explanation`-Feld überall gepflegt).
- **Notfall-Erkennung hat höchste Priorität** und läuft vor jeder anderen
  Klassifikation (`hufi-intent.ts:320-325`) — bewusst konservativ mit
  fester Keyword-Liste, kein KI-Risiko in einer sicherheitskritischen
  Situation.
- **Consent-/Mic-Arbitrierung (aus dieser Session)**: stabil, nicht
  Gegenstand dieser Analyse.

---

## Antworten auf die Analysefragen (kompakt)

**1. Wie ist die Agent-Schicht gebaut?** Zweistufig: (a) client-seitiger
regelbasierter Router `detectIntent()` (`hufi-intent.ts`) entscheidet
ZUERST per Keyword-Matching zwischen `emergency`/`navigation`/
`agent_action`/`agent_lookup`/`knowledge`/`correction`/`agent_proactive`
— läuft VOR jedem LLM-Aufruf und kann diesen komplett umgehen. (b) Erst
danach, für die verbleibenden Fälle, kommt die echte LLM-Pipeline
(`hufi-agent`-Edge-Function mit Claude-Tool-Use). Beides greift
ineinander, aber nicht sauber: `agent_action` (genau die Fälle "Termin
anlegen/löschen" etc.) wird NIE an die echte Tool-Use-Pipeline
weitergereicht, sondern läuft über den separaten, kaputten
Keyword-Fallback in `planAndConfirmAction()`. Es gibt also sowohl
Regelbasiert-only-Pfade als auch LLM-Pfade, aber die Aufteilung
zwischen ihnen ist der eigentliche Bruch, nicht das Fehlen einer
Tool-Schicht.

**2. Warum "Löschen" → "Anlegen"?** Siehe 🔴 Punkt 1 oben —
Reihenfolge-Bug in `extractAction()` (`hufi-intent.ts:112-120`), plus:
selbst korrekt erkannt gäbe es keinen echten Ausführungspfad
(`taskTypeToActionType("delete")` → `"remind_dsgvo"`, kein
`delete_appointment`).

**3. Warum simuliert Hufi Tool-Calls?** Siehe 🔴 Punkt 2 — im Voice-Modus
werden dem Modell keine Tools übergeben (`tools: voiceMode ? [] :
HUFI_TOOLS`), der System-Prompt instruiert aber trotzdem zur
Tool-Nutzung. `search_entity` ist ein echtes, im Chat-Modus
funktionierendes Tool — im Voice-Modus nur unerreichbar.

**4. Konversationsgedächtnis?** Rohe Historie wird mitgeschickt
(begrenztes Fenster), aber kein strukturierter Kurzzeitkontext
("aktuell besprochenes Pferd/Kunde"). Siehe 🟡 Punkt 3.

**5. Die zwei UX-Punkte:**
- **Tippen vor Reagieren:** Bewusste Konsequenz des aktuellen
  Zustands, kein Nebeneffekt-Bug: `wakeWordEnabled` ist `false`
  (`featureFlags.ts`, siehe vorherige Session), die einzige
  Content-Aktivierung für Voice ist der manuelle Mic-Button
  (`onMicPress`, `MobileShell.tsx:1887`). Eine automatische
  Gesten-Erkennung existiert bereits für die TTS-Begrüßung
  (`pointerdown`/`keydown`-Listener, `MobileShell.tsx:341-374`, wegen
  Browser-Autoplay-Regeln), reagiert aber auf JEDEN ersten Tap auf der
  Seite, nicht spezifisch auf ein Hufi-Symbol — das ist kein
  zusätzliches, künstliches Lock, sondern schlicht Browser-Policy
  + fehlendes Wake-Word.
- **Tages-Briefing-Zähler:** Hier existieren **zwei parallele,
  unabhängig gebaute Briefing-Systeme mit demselben Typnamen
  `BriefingPayload`**: `src/lib/hufai-proactive.ts`
  (`{text, lines, actions}`, TTL-Gate rein zeitbasiert — 4 Stunden,
  NICHT kalendertag-gebunden, `hufi_briefing_last_shown`) und
  `src/lib/hufi-briefing.ts` (`{time, greeting, sections, totalItems}`,
  korrekt kalendertag- und Zeitfenster-gebunden,
  `hufi_briefing_{time}_{date}`). Beide werden in `MobileShell.tsx`
  gleichzeitig in denselben State (`setProactiveBriefing`) geschrieben
  (Zeilen 428-447) — das ist bereits jetzt ein **echter TypeScript-Fehler**
  (bestätigt im `tsc`-Log aus der vorherigen Session:
  `MobileShell.tsx(445,32): Type '(prev: BriefingPayload) =>
  BriefingPayload | BriefingPayload' is not assignable...`), kein
  Geschmacksfehler. Die inkonsistente Reset-Logik zwischen den beiden
  Systemen (reine 4h-TTL vs. Kalendertag) ist der wahrscheinlichste
  Grund, warum der Zähler/Inhalt nicht sauber bei 0 pro Tag startet —
  ohne gezielte Reproduktion (welches der beiden Systeme genau das
  Testprotokoll gemeint hat) ist das eine begründete Hypothese, keine
  100%ig bewiesene Ursache wie bei Punkt 1-3.

---

## Vorschlag für einen Umbau, in Etappen

Reihenfolge nach Risiko/Nutzen, nicht nach Aufwand — Etappe 1 behebt die
🔴-Punkte mit dem kleinsten Diff.

### Etappe 1 — Sofort-Fixes ohne Architektur-Änderung (~0,5–1 Tag)
- `extractAction()`: Lösch-/Stornier-Prüfung VOR die Termin-Prüfung
  ziehen (Reihenfolge tauschen, `lösche`/`storniere` zuerst).
- Echten `delete`/`cancel`-Pfad ergänzen: neuen `HufiAction`-Typ
  `cancel_appointment` in `hufi-actions.ts`, echten Handler (Supabase
  `.update({status: "cancelled"})` oder `.delete()` je nach
  gewünschter Semantik), `taskTypeToActionType("delete")` darauf ummappen
  statt auf `remind_dsgvo`.
- Voice-Modus: entweder (a) `tools: HUFI_TOOLS` auch in Voice aktivieren
  und Latenz separat messen, oder (b) wenn Performance wirklich zwingt,
  den Voice-System-Prompt-Teil, der Tool-Nutzung verspricht,
  ENTFERNEN/anpassen, damit er nicht mehr behauptet, was nicht
  eingehalten wird. (a) ist ehrlicher, (b) ist der Ein-Zeilen-Fix.
- `mode: "action"` in `hufi-agent`: entweder tot-räumen (kompletten
  Pfad entfernen, `planAndConfirmAction` nur noch Keyword-Fallback ODER
  echte Tool-Use-Antwort nutzen) oder das JSON-Contract tatsächlich im
  Prompt verankern. Aktuell ist es Codeleiche, die stillschweigend nie
  greift.

### Etappe 2 — `agent_action` an die echte Tool-Pipeline anschließen (~2–3 Tage)
Größter Hebel: `agent_action`-Intents (Termin/Rechnung/Notiz/Löschen)
nicht mehr über den separaten Keyword-Fallback + toten JSON-Modus lösen,
sondern über denselben `callClaudeWithTools`-Pfad, der für Chat schon
funktioniert (echte `tool_use`-Blöcke, echte Tool-Ausführung, echtes
Bestätigen). `detectIntent()` bleibt als schnelle Vorklassifikation
(Emergency/Navigation weiter Bypass), aber "agent_action" sollte nur noch
grob vorfiltern ("das ist wahrscheinlich eine Aktion"), die konkrete
Aktion + Parameter kommen vom Modell über echtes Tool-Calling, nicht aus
`extractAction()`. Der Bestätigungs-Dialog (`✓ Bestätigen`/`✗ Ablehnen`)
bleibt erhalten, bekommt aber echte, vom Tool-Call stammende Payloads
statt geratener Keyword-Defaults.

### Etappe 3 — Kurzzeitkontext / Slot-Filling (~2-4 Tage)
Einen kleinen, expliziten Konversationszustand einführen: "zuletzt
erwähntes Pferd/Kunde", "offene Rückfrage + erwartete Antwortart".
Muss nicht komplex sein — reicht z.B. ein `conversationFocus`-Objekt
(`{horseId?, clientId?, pendingClarification?}`) im gleichen React-State
wie `messages`, das bei jeder Turn aktualisiert und dem LLM als Teil des
Kontexts mitgegeben wird, statt sich nur auf Rohtext-Historie zu
verlassen. Löst auch das "3x wiederholen ohne Wirkung"-Problem
strukturell.

### Etappe 4 — Briefing-Systeme konsolidieren (~0,5–1 Tag)
`hufai-proactive.ts` und `hufi-briefing.ts` sind zwei parallele
Implementierungen mit demselben Typnamen und kollidierenden States.
Eines auswählen (empfehlenswert: das kalendertag-gebundene
`hufi-briefing.ts`, da korrekter Reset), das andere entfernen oder klar
abgrenzen (z.B. `hufai-proactive` nur noch für einen anderen,
eigenständigen Zweck als Namen-Duplikat). Behebt nebenbei den
bestätigten `tsc`-Typfehler.

### Etappe 5 — Voice-UX (optional, nach deinem Ermessen)
Erst nach bestandenem Wake-Word-Gerätetest (siehe `HUFI_TODO.md`)
relevant — dann entfällt das Tippen-vor-Reagieren automatisch für
Nutzer mit aktiviertem Consent. Kein Code-Vorschlag hier nötig, reine
Freischalt-Frage.

---

**Ich habe nichts gebaut.** Diese Datei ist das einzige Ergebnis dieser
Session. Entscheidung über Reihenfolge/Umfang der Etappen liegt bei dir.
