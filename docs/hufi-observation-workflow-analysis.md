# Hufi Observation Workflow — Technische Bestandsanalyse

> Stand: 2026-08-02. Reine Bestandsanalyse (Repository `/home/pascaladmin/hufiapp-dev`,
> Branch `feature/hufi-assistant-cockpit`). Kein Code verändert, keine Migration
> ausgeführt, nichts deployt. Alle Aussagen sind über lokale Dateien
> (Quellcode, `supabase/migrations/*.sql`, generierte `types.ts`) belegt —
> keine Live-Datenbankabfrage, keine echten Nutzerdaten gelesen.
>
> Methodik: Fünf parallele Recherche-Durchgänge (Architektur/Pferde-Kunden,
> Pferdeakte/UI, Termine/Aufgaben, Supabase-Tabellenkatalog/Audit,
> Berechtigungen/Schreibfluss) plus eigene Vertiefung zur Hufi-/Voice-
> Architektur. Unsicherheiten sind durchgängig als "nicht bestätigt"
> markiert.

---

## 1. Executive Summary

Der Zielprozess — "Beobachtung zu einem Pferd dokumentieren, optional
Folgeaufgabe vorbereiten" — muss **nicht bei null anfangen**. Es existiert
bereits eine echte, produktiv nutzbare Pipeline, die dem Ziel überraschend
nahekommt: `src/components/pferdeakte/HufiAIVoiceRecorder.tsx` →
Edge Function `supabase/functions/hufi-ai-voice-finding/index.ts` (echter
Claude-Haiku-Aufruf, Extraktions-Prompt fast deckungsgleich mit dem im
Auftrag genannten Zielschema) → editierbare Vorschau mit explizitem
"Übernehmen" → Speicherung in den echten Tabellen `hoof_entries` +
`hoof_analyses` (`src/components/pferdeakte/PferdeakteHuf.tsx:31-56`).

Der entscheidende **architektonische Unterschied zum Zielbild**: Diese
Pipeline setzt voraus, dass der Nutzer bereits auf der Pferdeakte-Seite
eines konkreten Pferds ist (`horseId` kommt als Prop von der Route, keine
Pferderkennung nötig). Der im Auftrag beschriebene Ablauf — Hufi überall
aktivieren, Pferd/Kunde/Termin aus der Äußerung selbst erkennen — ist
NICHT Teil dieser Pipeline. Diese Fähigkeit existiert nur in einem
separaten, unabhängigen System: der echten Chat-/Voice-Agent-Edge-Function
`supabase/functions/hufi-agent/index.ts` mit echtem Claude-Tool-Use
(`search_entity`, `get_horse_record` u. a.), das aber laut einer
bestehenden Analyse (`AGENT_ANALYSE.md`, Stand 22.07.2026, andere Branch)
für genau den Aktions-Pfad ("Termin/Notiz anlegen") bekannte, dokumentierte
Bugs hat und nicht mit der Hoof-Finding-Pipeline verbunden ist.

**Größter konkreter Einzelfund:** Das bereits vorhandene `create_note`-Tool
des Agentensystems (`src/lib/hufi-actions.ts:433-458`) schreibt **nicht**
in eine pferdegebundene Tabelle, sondern generisch als Freitext-Value in
`hufi_memory` — ohne `horse_id`-Fremdschlüssel, ohne RLS-Bezug zum Pferd.
Für "Beobachtung speichern" ist dieser bestehende Pfad nachweislich
**ungeeignet** (unabhängig von zwei Recherche-Durchgängen bestätigt).

**Empfehlung in einem Satz:** Nicht neu bauen, sondern die bestehende
Hoof-Finding-Pipeline (`hoof_entries`/`hoof_analyses`) als
Speicherziel übernehmen, davor eine neue, schlanke Pferd-/Kontext-
Erkennungsschicht setzen (die es so noch nicht gibt), und das bestehende
`hufi_task_queue`-Bestätigungsmuster für die optionale Folgeaufgabe
wiederverwenden — dafür existiert mit `hufi_followup_suggestions` bereits
sogar die passende Zieltabelle.

---

## 2. Zielbild

Wie im Auftrag beschrieben: Nutzer aktiviert Hufi → spricht/schreibt eine
Beobachtung → Hufi erkennt Pferd/Kunde/Termin/Absicht → fragt bei
Unsicherheit nach → strukturiert die Beobachtung → zeigt Vorschau → Nutzer
bestätigt → serverseitige Speicherung in der richtigen Pferdeakte →
optionale Folgeaufgabe → konkrete Bestätigung → nachvollziehbares
Protokoll → keine Doppelausführung. Dieses Dokument bewertet, wie weit die
bestehende Architektur diesen Prozess bereits trägt.

---

## 3. Aktueller Architekturüberblick

- **Auth**: `src/hooks/useAuth.tsx` — Session aus Supabase Auth, App-Rolle
  separat aus `user_roles` geladen (`fetchUserRole`). Rollen-Union:
  `"provider" | "client" | "admin" | "employee" | "partner" | null`
  (DB-Enum `app_role`, erweitert über mehrere Migrationen).
- **Mandanten/Organisationen — Konflikt, siehe Abschnitt 5.**
- **Provider ↔ Kunde**: über `access_grants` (nicht über Organisation).
- **Kern-Routen**: `/pferde`, `/pferd/:id` (`ProviderHorseDetail.tsx`),
  `/kunden`, `/kalender`, `/management/*` (`src/App.tsx`).
- **Bestehender Hufi-Code liegt an drei unabhängigen Stellen**:
  1. `src/components/assistant-lab/*` — rein visuelles UI-Lab mit
     Mock-Daten, `/hufi-lab`-Route, keine Backend-Anbindung (Gegenstand
     der bisherigen Sessions in diesem Projekt).
  2. `supabase/functions/hufi-agent/index.ts` (1669 Zeilen) + `src/lib/hufi-*.ts`
     (>25 Dateien) — echter Chat-/Sprachassistent mit Claude-Tool-Use,
     Intent-Erkennung, Task-Queue. Produktiv, aber mit bekannten Lücken
     (Abschnitt 9).
  3. `src/components/pferdeakte/HufiAIVoiceRecorder.tsx` +
     `supabase/functions/hufi-ai-voice-finding/index.ts` — echte,
     funktionierende Voice→KI→Befund-Pipeline, unabhängig von (2).

---

## 4. Vorhandene Datenmodelle (Übersicht)

Siehe Abschnitt 10 für die vollständige Tabellenliste. Zentral: **es gibt
keine `clients`-Tabelle** (Kunden = `profiles` mit `role='client'`) und
**keine generische `observations`/`reports`-Tabelle**. Eine Migration
(`20260226120000_emergency-client-recovery-system.sql`) referenziert eine
`clients`-Tabelle, ist aber technisch defekt (kompletter Dateiinhalt als
SQL-Kommentar auswertbar, einzeilig ohne echte Zeilenumbrüche) — **nicht
als reale Tabelle werten**, als Anomalie vermerkt.

---

## 5. Pferde- und Kundenmodell

- **`horses`** (`supabase/migrations/20251203110750_...sql:25`,
  seitdem ~15 Alter-Migrationen): PK `id UUID`, `owner_id → profiles.id`,
  `name`, `readable_id`/`eqid` (menschenlesbar), `deleted_at` (Soft-Delete),
  `organization_id`, `horse_status` (`active|sold|deceased|stolen|archived`).
  **Kein Mehrfachbesitz** — genau ein `owner_id` pro Pferd. Zugriff für
  Provider/Mitarbeiter läuft nicht über einen Fremdschlüssel am Pferd,
  sondern über `access_grants`/`employee_profiles`.
- **Kunden**: `profiles` mit `role='client'`. Zusätzlich `contacts`
  (providerseitige CRM-Liste, unabhängig von echten Accounts).
- **Zwei parallele Organisationsmodelle** (Konflikt, klar benennen):
  1. `organizations` + `profiles.organization_id`/`org_role`,
     `get_user_organization()` (aktuell korrekt gegen `auth.uid()`
     geprüft, `20260719080000_fix_minor_idor_functions.sql:24-33`).
  2. `organization_members` (`20260315224137_...sql:18`, `useOrganization.ts`) —
     **nicht bestätigt**, ob und wie beide Modelle zusammenhängen.
- **Pferde-Suche/Disambiguierung**: `search_profiles_universal()` durchsucht
  nur **Personen**-Profile (readable_id/E-Mail/Name), keine dedizierte
  Pferde-Namenssuche. `src/services/horseService.ts` bietet nur einfache
  ID-/Owner-Filter, **kein Duplikat-Handling**. `AddHorseModal.tsx` prüft
  beim Anlegen nicht auf gleichnamige Pferde. **Für den Hufi-Flow eine
  offene, konkrete Lücke**: bei zwei Pferden namens "Ginger" gibt es aktuell
  keinerlei serverseitige oder clientseitige Disambiguierungslogik.
- **RLS auf `horses`**: solide, mehrfach gehärtete Historie
  (`20260109123207_...sql` Kernpolicies, `20260305212804_...sql`
  Partner-Zugriff + medizinische Datentrennung via Views
  `horses_basic`/`horses_medical`, `20260325143337_...sql` DELETE-Policy).
  Ursprünglich zu weit gefasste Provider-Policy wurde bereits am
  05.12.2025 korrigiert.

**Bewertung**: Pferde-/Kundenmodell ist reif und gut abgesichert — **direkt
nutzbar** für Hufi. Die fehlende Pferde-Disambiguierung ist der einzige
echte Lückenbaustein hier.

---

## 6. Pferdeakte und Beobachtungen

| Modell | Tabelle(n) | Bewertung für Hufi-Flow |
|---|---|---|
| Huf-Verlauf/Befund | `hoof_entries` + `hoof_analyses` (`20260120225516_...sql`, `20251206220518_...sql`) | **Direkt nutzbar** — bereits die reale Zielinfrastruktur, siehe unten |
| Besitzer-Tagebuch | `horse_diary_entries` (`20260301125437_...sql`) | Ungeeignet ohne RLS-Änderung — Owner-only, kein Provider-Insert |
| Gesundheits-Log | `horse_health_logs` (`20260301130430_...sql`) | Ungeeignet ohne RLS-Änderung — Owner-only |
| Partner-Behandlungsnotiz | `partner_treatment_notes` (`20260219144114_...sql`) | Ungeeignet — RLS nur für Rolle `partner`, gutes Vorbild für Felder |
| Pferde-Audit | `horse_audit_log` (`20260312131950_...sql:216`) | Ungeeignet als Beobachtungsspeicher, aber gut erweiterbar für Hufi-Aktions-Logging (Enum-Erweiterung nötig) |
| "hufi_observations" | `20260517180000_hufi_task_queue.sql:50` | **Namenskollision — kein Beobachtungsspeicher.** Teil des Skill-Lernsystems (Verhaltensmuster, `skill_id`), thematisch komplett anders. Nicht verwenden, nicht verwechseln. |

**Die reale Pipeline im Detail** (`src/components/pferdeakte/HufiAIVoiceRecorder.tsx`,
`supabase/functions/hufi-ai-voice-finding/index.ts`,
`src/components/pferdeakte/PferdeakteHuf.tsx:31-56`):

1. Aufnahme oder manuelle Texteingabe (DSGVO: Transkription lokal, kein
   Audio an Dritte — `hufi-ai-voice-finding/index.ts:105-108`).
2. Edge Function ruft Claude Haiku 4.5 mit einem Extraktions-Prompt auf,
   der **fast exakt** das im Auftrag genannte Zielschema liefert: `befund`,
   `massnahme`, `empfehlung`, `huf_werte` (Zehenlänge, Trachtenhöhe,
   Hufwinkel, Strahl-/Wandqualität — deckt "Vorderhuf links" implizit über
   vier Positionsfelder ab), `naechster_termin_wochen`,
   `dringend_tierarzt`/`dringend_osteo`.
3. **Editierbare Vorschau** (Transkript + alle strukturierten Felder als
   Textareas) mit explizitem `handleAccept()` — Vorschau/Bestätigung
   existiert also bereits real, nicht nur im Lab.
4. Erst nach Klick: Speicherung in `hoof_entries` (Freitext-Verlauf,
   `type: "voice_befund"`) **und** `hoof_analyses` (strukturierte
   Messwerte) — zwei Inserts, kein Transaktions-Wrapper sichtbar (Risiko,
   siehe Abschnitt 21).
5. Audit: Edge Function schreibt zusätzlich in `ai_chat_messages`.

**Konkrete Lücken dieser Pipeline relativ zum Zielbild:**
- Kein Pferd-/Kunden-/Termin-Erkennung — `horseId` kommt fix aus der
  Route, `appointment_id` ist aktuell hartcodiert `null`.
- `naechster_termin_wochen` wird extrahiert, aber **nirgends in eine
  Folgeaktion umgesetzt** — reines totes Datenfeld heute.
- `PferdeakteTimeline.tsx` bindet `hoof_entries` noch nicht ein (nicht
  bestätigt, ob absichtlich).
- Kein Aufruf außerhalb der Pferdeakte-Hufseite möglich — keine
  "Hufi überall aktivieren"-Fähigkeit.

---

## 7. Termine

- **`appointments`** (`20251203110750_...sql`): ein Termin referenziert
  **genau ein Pferd** (`horse_id NOT NULL`, keine m:n-Struktur).
- **Status**: ursprünglich kein CHECK-Constraint (deckt sich mit
  CLAUDE.md-Warnung), **aber** seit `20260301155912_...sql` ein
  BEFORE-INSERT/UPDATE-Trigger `trg_validate_appointment`, der neue Writes
  auf eine Whitelist beschränkt (`planned|pending|confirmed|completed|
  cancelled|no_show|requested`). `'scheduled'` ist als Neu-Wert nicht mehr
  zulässig, existiert aber als Altbestand weiter — Lesezugriffe müssen
  beides behandeln (explizit so in `hufi-actions.ts:148-150` kommentiert).
- **Follow-up-Logik existiert bereits real**: `hufi_followup_suggestions`
  (`20260715200000_hufi_followup_suggestions.sql`) wird von einem
  laufenden Cron (`morning-briefing`-Edge-Function, `pg_cron`,
  `20260217201108_...sql`) auf Basis von `horses.shoeing_interval`
  befüllt — **exakt der Mechanismus für "Kontrolle in 4 Wochen"**. Aktuell
  aber nur Text im Morgen-Briefing, keine UI, die daraus einen echten
  Termin bucht.
- **Konfliktprüfung**: nur clientseitig (`AppointmentFormModal.tsx`,
  simpler Datum/Zeit-Abgleich), keine DB-Exclusion-Constraint.
- **Wiederkehrende Termine**: `recurring_group_id` verknüpft, aber keine
  echte Recurrence-Engine.
- **RLS**: `WITH CHECK (has_role(auth.uid(),'provider') AND provider_id =
  auth.uid())` — echte serverseitige Durchsetzung, sicheres Referenzmuster.
- **"Aktueller Termin heute"**: kein fertiger Hook, aber klares Muster
  (`DayCockpit.tsx`: `.eq("provider_id", user.id).eq("date", today)`).

**Bewertung**: Termine sind **direkt nutzbar** als Zuordnungsziel; die
Folgeaufgaben-Infrastruktur ist zu 80 % vorhanden, es fehlt nur die
Verbindung "Vorschlag → gebuchter Termin/Aufgabe".

---

## 8. Aufgaben und Erinnerungen

Es gibt ein **echtes, produktives Aufgabenmodell**, keine reine UI-Lösung:

- **`agent_tasks`** (`20260512200000_agent_tasks.sql`) — **deprecated**
  seit `20260716120000_consolidate_task_queue.sql` ("Schritt 5
  HUFI_ROADMAP"), nur noch historische Referenz, Client schreibt nicht
  mehr hinein.
- **`hufi_task_queue`** (`20260517180000_hufi_task_queue.sql`) — der
  aktive Nachfolger. Statusmaschine `pending → running → awaiting_confirm
  → done|failed|cancelled`, `steps JSONB` (Multi-Step), RLS `auth.uid() =
  user_id`. Ausführung läuft **vollständig clientseitig**
  (`src/lib/hufi-task-engine.ts`: `createActionTask`/`confirmStep`/
  `executeNextStep`) — kein serverseitiger RPC/Edge-Function-Handler, der
  `status='approved'` automatisch abgreift. Die Bestätigungssperre
  (`requires_confirm`/`confirmed_at`) ist reine Client-Orchestrierung;
  echten Schutz bietet nur die RLS der Zieltabellen, die
  `executeHufiAction()` am Ende anspricht.
- **Kein Idempotency-Key-Mechanismus** irgendwo im Schema gefunden
  (`grep idempotenc` → nur zwei zeitfensterbasierte Anti-Spam-Trigger,
  kein echter Key). `confirmStep` könnte bei doppeltem Aufruf
  (Doppelklick, Netzwerk-Retry) zweimal ausführen — **nicht** verhindert.
- `hufi_followup_suggestions` (Abschnitt 7) ist der relevante Baustein für
  die "optionale Folgeaufgabe" — direkt nutzbar als Zieltabelle.

**Bewertung**: Aufgaben-Infrastruktur ist **mit kleiner Erweiterung
nutzbar** — das Bestätigungsmuster existiert, die Idempotenz fehlt.

---

## 9. Hufi- und Voice-Architektur

**Zwei unabhängige Hufi-KI-Systeme, nicht verbunden:**

1. **Chat-/Aktions-Agent** (`supabase/functions/hufi-agent/index.ts`,
   `src/lib/hufi-intent.ts`, `hufi-brain.ts`, `hufi-actions.ts`,
   `hufi-task-engine.ts`): echter Claude-Tool-Use-Loop
   (`callClaudeWithTools`), Tools u. a. `search_entity`,
   `get_horse_record`, `create_appointment`, `cancel_appointment`,
   `create_note`. Zweistufig geroutet: client-seitiger Keyword-Router
   `detectIntent()` entscheidet VOR jedem LLM-Aufruf; nur was nicht als
   `emergency`/`navigation`/`agent_action` erkannt wird, erreicht die
   echte Tool-Use-Pipeline.
2. **Hoof-Finding-Pipeline** (Abschnitt 6): einfacher Ein-Schuss-Aufruf an
   Claude Haiku, kein Tool-Use, kein Task-Queue-Bezug, direkt in die
   Pferdeakte integriert.

**Bekannte, dokumentierte Lücken im Chat-/Aktions-Agent** (Quelle:
`AGENT_ANALYSE.md`, Stand 22.07.2026, Branch `feature/multi-beruf-verkabelung`
— **nicht abschließend verifiziert, ob alle Punkte auf dem aktuellen Stand
noch zutreffen**; ein Gegenbeispiel wurde bereits gefunden: der
dort als fehlend beschriebene `cancel_appointment`-Typ existiert im
aktuellen `hufi-actions.ts:12` bereits):
- `extractAction()` (`hufi-intent.ts:112-120`) hat eine Reihenfolge-Bug:
  "termin" matcht vor "lösche/storniere" → "Termin löschen" wird zu
  "Termin anlegen" geroutet.
- Voice-Modus erhält **keine** Tools (`tools: voiceMode ? [] : HUFI_TOOLS`,
  `index.ts:1114`), der System-Prompt behauptet aber weiterhin Tool-Nutzung
  → das Modell "halluziniert" Tool-Aufrufe als Text.
  `search_entity` ist real, im Voice-Modus nur unerreichbar.
- `agent_action`-Intents (genau die Fälle "Termin/Notiz anlegen") laufen
  **nicht** über die echte Tool-Pipeline, sondern über einen separaten,
  kaputten Keyword-Fallback (`planAndConfirmAction()`), der ein
  Antwortformat erwartet, das im Prompt nie verankert ist — in der Praxis
  toter Pfad.
- Kein strukturiertes Kurzzeitgedächtnis ("worüber reden wir gerade") zum
  Zeitpunkt der Analyse — **aber**: `hufi-agent-client.ts:11-17` definiert
  bereits einen `ConversationFocus`-Typ (`horseId`, `clientId`,
  `pendingClarification`), der als Rundtrip mit der Antwort zurückkommt.
  **Nicht bestätigt**, ob dies die in `AGENT_ANALYSE.md` als "Etappe 3"
  vorgeschlagene Lösung bereits ist oder nur vorbereitet wurde.

**Klare Trennung wiederverwendbarer Bausteine:**

| Kategorie | Beispiele |
|---|---|
| **Produktionsreif, direkt wiederverwendbar** | `hoof_entries`/`hoof_analyses`-Speicherpfad, `HufiAIVoiceRecorder.tsx`-Interaktionsmuster (Aufnahme→AI→editierbare Vorschau→Accept), `hufi_task_queue`-Bestätigungsmuster, `HufiConfirmation.tsx`, `HufiTaskCard.tsx`, RLS-Muster `WITH CHECK (provider_id=auth.uid())` |
| **Echt, aber mit bekannten Lücken** | `hufi-agent`-Tool-Use-Pipeline (funktioniert im Chat-Modus, `agent_action`-Pfad nicht verkabelt) |
| **Nur Mock/Demo** | Alles unter `src/components/assistant-lab/*` — bewusst isoliert, keine Backend-Anbindung, kann als **visuelle Referenz** für Bewegung/Zustände bestehen bleiben, liefert aber keine Datenlogik |
| **Ungeeignet, nicht wiederverwenden** | `_createNote()`/`create_note`-Tool (schreibt in `hufi_memory`, kein Pferdebezug) |
| **Fehlender Baustein** | Pferd-/Kontext-Erkennung außerhalb einer bereits offenen Pferdeakte-Seite — existiert nirgends |

---

## 10. Backend und Supabase — Tabellenkatalog

Alle Angaben aus lokalen Migrationsdateien, keine Live-Abfrage.

| Tabelle | Zweck | Mandant/Autor | RLS | Bemerkung |
|---|---|---|---|---|
| `horses` | Pferdestammdaten | `owner_id`, `organization_id` | ja, gehärtet | Soft-Delete `deleted_at` |
| `profiles` | Nutzer (Provider/Client/...) | `id = auth.uid()` | ja | keine separate `clients`-Tabelle |
| `access_grants` | Provider↔Client-Beziehung | — | ja | Basis für Pferdezugriff von Providern |
| `organizations` / `organization_members` | zwei parallele Org-Modelle | — | ja | **Konflikt, nicht bestätigt ob synchron** |
| `employee_profiles` | Mitarbeiter eines Providers | `provider_id` | ja | `user_id` nullable |
| `appointments` | Termine | `provider_id` | ja | Status-Trigger statt CHECK |
| `hoof_entries` | Huf-Verlauf (Freitext) | `created_by` | ja, granular | **Zielspeicher für Beobachtungen** |
| `hoof_analyses` | Huf-Messwerte (strukturiert) | — | ja | Begleittabelle zu `hoof_entries` |
| `horse_diary_entries` | Besitzer-Tagebuch | `owner_id` | ja, Owner-only | ungeeignet für Provider |
| `horse_health_logs` | Gesundheits-Log | `owner_id` | ja, Owner-only | ungeeignet für Provider |
| `horse_audit_log` | Zugriffs-/Aktions-Log pro Pferd | `actor_id` | ja | fester `action_type`-Enum |
| `hufi_followup_suggestions` | Folgetermin-Vorschläge | `provider_id` | ja | **Zieltabelle für Folgeaufgabe** |
| `agent_tasks` | **DEPRECATED**, alte Task-Queue | `user_id` | ja | nur historisch |
| `hufi_task_queue` | aktive Task-/Bestätigungs-Queue | `user_id` | ja | Ausführung clientseitig |
| `hufi_observations` | **kein Beobachtungsspeicher** — Skill-Lernmuster | `user_id` | ja | Namenskollision, nicht verwenden |
| `hufi_memory`/`hufi_memories` | generisches KI-Gedächtnis | `user_id` | ja, `GRANT ALL...anon` | `version`-Feld = einziges echtes Versionierungsmuster im Schema |
| `hufi_context_log` | EU-AI-Act-Aktionslog | `user_id` | **nicht bestätigt** (keine Migration im Repo, nur in generierten `types.ts:9474` sichtbar) | **Schema-Drift**, siehe Abschnitt 21 |
| `hufi_conversations`/`hufi_messages` | Chat-Session/Nachrichten | `user_id` | ja | — |
| `ai_chat_messages` | weiteres AI-Audit-Log | `user_id` | nicht verifiziert | von `hufi-ai-voice-finding` genutzt |

Keine `clients`-, `reports`-, `transcripts`- oder generische
`audit_log`-Tabelle gefunden (jeweils explizit geprüft, 0 Treffer).

---

## 11. Berechtigungen und RLS

- Aktueller Nutzer: `auth.uid()` (Postgres-Session), App-Rolle separat aus
  `user_roles` (nicht aus dem JWT).
- `get_user_organization()`, `get_owner_horse_ids()`,
  `get_storage_usage()`: aktuell alle korrekt gegen `auth.uid()` geprüft
  (gehärtet in `20260719080000_fix_minor_idor_functions.sql`, nach einem
  dokumentierten IDOR-Audit).
- **Bekannte, teils noch offene Punkte** (`HUFI_TODO.md`, zuletzt
  referenziert Stand 27.07.2026): einzelne SECURITY-DEFINER-Funktionen
  ohne `auth.uid()`-Bindung wurden gefixt; ein Fund
  (`search_horse_by_readable_id` ohne Login, `provider_id IS NULL`-
  Schlupflöcher) war laut dortiger Notiz **noch nicht freigegeben** — für
  diese Analyse nicht neu verifiziert, als offen zu behandeln.
- **Sicheres Referenzmuster**: `appointments`-Insert ist ein direkter
  Client-Insert (kein RPC), aber durch `WITH CHECK
  (has_role(auth.uid(),'provider') AND provider_id = auth.uid())`
  serverseitig hart durchgesetzt — ein manipulierter `userId`-Parameter im
  Client-Code würde von Postgres zurückgewiesen.
- **Kritischer Negativbefund**: `_createNote()` (`hufi-actions.ts:433-458`)
  hat **keine** serverseitige Prüfung, ob das genannte Pferd zum
  aufrufenden Nutzer gehört — weil gar keine `horse_id`-Spalte/RLS-Bindung
  existiert, sondern nur ein Freitext-Value unter dem eingeloggten
  `user_id`. Für einen echten Hufi-Schreibpfad **nicht ausreichend**.
- `hufi_task_queue`/`agent_tasks`: Bestätigungssperre ist reine
  Client-Logik, kein serverseitiger Gate — siehe Abschnitt 8.

---

## 12. Bestehende Schreibflüsse (Referenz)

**Referenzfluss "Termin erstellen"** (vollständig nachvollzogen):

1. UI/Aufrufer: `hufi-actions.ts` als Ausführungsziel eines bestätigten
   Agent-Vorschlags (oder `AppointmentFormModal.tsx` für manuelle Eingabe).
2. Hook/Kette: `hufi-task-engine.ts` → `executeHufiAction(action, userId)`.
3. Validierung: keine Zod-Schicht; serverseitig per Trigger
   `trg_validate_appointment`/`validate_appointment_status()`
   (Status-Enum, Preis ≥ 0, Dauer 1–480 Min.).
4. Schreibzugriff: direkter Insert, `supabase.from("appointments").insert(...)`.
5. Serverprüfung: RLS `WITH CHECK (has_role(...,'provider') AND
   provider_id = auth.uid())`.
6. Zieltabelle: `public.appointments`.
7. Cache/State: keine React-Query-Invalidation im Executor selbst sichtbar
   (**nicht bestätigt**, ob aufrufende Komponente danach invalidiert).
8. Erfolg: Rückgabe `{success:true, message:"✅ Termin am ..."}`.
9. Fehler: try/catch, `{success:false, message:"..."}`.

Dieses Muster (direkter Insert + `WITH CHECK`-Policy als einzige
Server-Schranke, kein RPC) ist der etablierte Standard im Projekt — für
Hufi grundsätzlich wiederverwendbar, sollte aber für den sensibleren
Beobachtungs-Schreibpfad um eine dedizierte RPC mit interner
Autorisierungsprüfung erweitert werden (Begründung: Abschnitt 15).

**Referenzfluss "Hufbefund per Sprache speichern"** — siehe Abschnitt 6,
vollständig dokumentiert, ist der eigentlich relevantere Referenzfluss für
diesen Auftrag.

---

## 13. Wiederverwendbare UI-Komponenten

| Zweck | Komponente | Wiederverwendbarkeit |
|---|---|---|
| Bestätigen/Abbrechen | `src/components/assistant-lab/HufiConfirmation.tsx` | hoch — framework-agnostisch |
| Task-Bestätigung (echt) | `src/components/tasks/HufiTaskCard.tsx` | hoch — bereits an echte Queue gebunden |
| Beobachtungs-Vorschau (Layout) | `HufiObservationPreview.tsx` | mittel — Layout gut, `MockObservation`-Typ ersetzen |
| Mehrdeutige Auswahl | `HufiChoiceCards.tsx`/`HufiHorseCard.tsx` | mittel — UI gut, Datenquelle mocken→echt |
| Voice-Aufnahme→Vorschau (echt) | `HufiAIVoiceRecorder.tsx` | **hoch — der wichtigste Baustein**, siehe Abschnitt 6 |
| Erfolgsanzeige | `HufiSuccessState.tsx` | hoch |
| Cockpit-Einstieg (echt, Live-Daten) | `src/components/assistant/HufiAssistantCockpit.tsx` | hoch als Ambient-Einstiegspunkt |
| Dialog/Sheet/Bottom-Sheet | `src/components/ui/{dialog,sheet,drawer,fullscreen-sheet}.tsx` | hoch, Standard-Set vorhanden |
| Toast | `sonner` (dominant, 263 Fundstellen) neben älterem `useToast` (11) | hoch, `sonner` als De-facto-Konvention (**nicht abschließend bestätigt**) |
| Pferde-/Kundenauswahl | **keine gemeinsame Komponente** — `AppointmentFormModal.tsx` und `CreateInvoiceModal.tsx` bauen je eigene Fetch/Select-Logik | **Lücke** — lohnt sich als gemeinsame Komponente, auch unabhängig von Hufi |
| Timeline | `src/components/pferdeakte/PferdeakteTimeline.tsx` (echt, aggregiert mehrere Quellen) | hoch, müsste um `hoof_entries` erweitert werden |

---

## 14. Gap-Analyse (Zielprozess vs. Architektur)

| # | Schritt | Status | Bewertung |
|---|---|---|---|
| 1 | Input erfassen (Text/Sprache) | vorhanden | `HufiAIVoiceRecorder.tsx` deckt beides ab |
| 2 | Rohtranskript erhalten | vorhanden | lokale Transkription, DSGVO-konform |
| 3 | Pferd erkennen | **fehlt** | Pipeline nutzt fixe `horseId` aus Route, keine Erkennung aus Text |
| 4 | Kunde/Organisation zuordnen | teilweise | über `horses.owner_id` ableitbar, keine explizite Zuordnungslogik im Flow |
| 5 | Termin zuordnen | **fehlt** | `appointment_id` aktuell hartcodiert `null` |
| 6 | Intent erkennen | teilweise | nur im separaten Chat-Agent (mit bekannten Bugs), nicht in der Hoof-Pipeline nötig, da Kontext implizit |
| 7 | Beobachtung strukturieren | vorhanden | Claude-Extraktion, Schema passt sehr gut zum Zielbild |
| 8 | fehlende Angaben erkennen | teilweise | Modell liefert `null` bei Unklarheit, aber keine aktive Rückfrage-Logik |
| 9 | Rückfragen stellen | **fehlt** | keine Slot-Filling-/Klärungs-UI in dieser Pipeline |
| 10 | Vorschau anzeigen | vorhanden | editierbare Felder, echtes UI |
| 11 | Bestätigung einholen | vorhanden | expliziter `handleAccept()` |
| 12 | serverseitig ausführen | vorhanden | echter Insert in `hoof_entries`/`hoof_analyses` |
| 13 | Audit schreiben | teilweise | `ai_chat_messages`, aber kein dediziertes, vollständiges Audit für den Beobachtungs-Inhalt selbst |
| 14 | konkrete Bestätigung anzeigen | vorhanden | Erfolgsmeldung im Recorder |
| 15 | optionale Folgeaufgabe | **fehlt** | `naechster_termin_wochen` wird extrahiert, aber nicht weiterverwendet; `hufi_followup_suggestions` als Zieltabelle vorhanden, aber nicht verbunden |
| 16 | Doppelausführung verhindern | **fehlt** | kein Idempotency-Key, zwei ungeschützte Inserts ohne Transaktion |
| 17 | Fehler sicher behandeln | teilweise | try/catch vorhanden, aber zwei getrennte Inserts ohne Rollback-Garantie |

---

## 15. Empfohlener Action Contract: `HufiCreateObservationAction`

Angepasst an real vorhandene Modelle — **keine neuen Felder ohne fachliche
Grundlage**. Empfehlung: als neue RPC (`SECURITY DEFINER`, analog
`get_storage_usage()`-Muster mit interner `is_provider_for_horse()`-artiger
Prüfung) statt reinem Client-Insert, weil hier — anders als beim
etablierten `appointments`-Muster — eine KI-generierte, nicht direkt vom
Nutzer getippte Struktur gespeichert wird und zwei Tabellen konsistent
befüllt werden müssen (Transaktionsschutz).

### 1. Input Contract
Zweck: was der Nutzer tatsächlich gesagt/geschrieben hat, plus bekannter
Seitenkontext.
- `rawInput: string`, `source: "voice" | "text"`
- `contextHorseId?: string` (falls aus offener Pferdeakte-Seite bekannt —
  deckt den heutigen Fall ab)
- `contextAppointmentId?: string` (falls aus "aktueller Termin heute"-Muster,
  Abschnitt 7, ableitbar)
- Validierung: `rawInput` nicht leer, max. Länge (Missbrauchsschutz).
- Vertrauensgrenze: komplett nutzergeneriert, keine Autorisierungswirkung.

### 2. Proposal Contract
Zweck: KI-Extraktion, wie heute schon von `hufi-ai-voice-finding`
geliefert — Feldnamen bewusst an das bestehende Schema angelehnt.
- `befund`, `massnahme`, `empfehlung: string | null`
- `hufWerte: {...}` (wie `huf_werte` heute)
- `folgeintervallWochen: number | null` (= `naechster_termin_wochen`)
- `horseCandidates: {horseId, horseName, ownerName}[]` (**neu** — fehlt
  heute, notwendig für Schritt 3 des Zielprozesses)
- `missingFields: string[]`
- `confidence: number` (0–1, pro Feld oder gesamt — **nicht bestätigt**,
  ob das Modell das heute liefert; müsste ergänzt werden)
- Validierung: serverseitig nur strukturell (Typen), keine
  Vertrauenswirkung — reiner Vorschlag.

### 3. Confirmation Contract
Zweck: was der Nutzer tatsächlich bestätigt hat — Grundlage für Audit.
- `actionId`, `idempotencyKey: string` (**neu, zwingend** — existiert
  aktuell nirgends im Schema)
- `userId`, `horseId` (final gewählt, nicht mehr Kandidat),
  `appointmentId?`
- `finalObservation` (editierte Version des Proposal Contract)
- `confirmationStatus: "confirmed" | "edited" | "rejected"`
- `confirmedAt: timestamptz`
- Serverseitige Prüfung: `idempotencyKey` muss unique sein (Unique-Index),
  `horseId` muss über `access_grants`/`owner_id` zum `auth.uid()` gehören
  (RPC-intern, analog `get_storage_usage()`).

### 4. Execution Contract
Zweck: der eigentliche, serverseitige Schreibvorgang.
- Insert in `hoof_entries` (Freitext-Zusammenfassung, `type:
  "voice_befund"`, wie heute) **und** `hoof_analyses` (Messwerte) —
  **in einer einzigen RPC-Transaktion**, nicht zwei Client-Inserts wie
  heute.
- Bei gesetztem `folgeintervallWochen`: Upsert in
  `hufi_followup_suggestions` (Zieltabelle existiert bereits).
- Vertrauensgrenze: läuft nur, wenn `confirmationStatus = "confirmed"`
  und `idempotencyKey` noch nicht verwendet wurde.

### 5. Result Contract
- `success: boolean`, `hoofEntryId`, `hoofAnalysisId`,
  `followUpSuggestionId?`, `message: string` (für konkrete
  Nutzer-Bestätigung, wie heute schon `ActionResult.message`).

### 6. Error Contract
- `success: false`, `errorCode` (`horse_not_found` |
  `horse_ambiguous` | `not_authorized` | `duplicate_submission` |
  `validation_failed` | `storage_failed`), `message`,
  `retryable: boolean`.

---

## 16. Policy-Matrix

| Aktion | Risiko | Bestätigung nötig | reversibel | Berechtigung | serverseitige Prüfung | Audit |
|---|---|---|---|---|---|---|
| Beobachtungsentwurf erzeugen | niedrig | nein | — (nur Vorschlag) | eingeloggt | keine (reiner LLM-Aufruf) | ja (heute: `ai_chat_messages`) |
| Pferd automatisch zuordnen | mittel | **ja**, wenn Konfidenz niedrig | ja (Auswahl änderbar vor Speichern) | Zugriff auf Pferd (`access_grants`/`owner_id`) | ja, RPC-intern | ja |
| Pferd nachfragen | niedrig | — | — | eingeloggt | — | optional |
| Beobachtung speichern | **hoch** (schreibt echte Pferdeakte) | **ja, zwingend** | eingeschränkt (kein Undo-UI heute, DB-Zeile technisch löschbar) | `provider`/`employee` mit Zugriff auf das Pferd | **ja, zwingend** (RPC + Idempotency-Key) | **ja, zwingend** |
| Folgeaufgabe vorbereiten | niedrig | nein (nur Vorschlag) | ja | wie oben | — | optional |
| Folgeaufgabe speichern | mittel | ja | ja (Status auf `cancelled` setzbar) | wie oben | ja | ja |
| Bestehende Daten überschreiben | **hoch** | **ja, zwingend** | eingeschränkt | wie oben, zusätzlich Ownership-Check der Zielzeile | ja, zwingend | ja, zwingend |
| Aktion abbrechen | niedrig | nein | ja | eingeloggt | — | optional |
| Aktion rückgängig machen | mittel–hoch | ja | **nicht vorhanden** — kein Soft-Delete/Undo-Pattern für `hoof_entries` heute | wie oben | ja | ja |

---

## 17. MVP-Grenzen (geprüft gegen bestehende Architektur)

**Empfohlener Scope, angepasst:**
- Textinput zuerst — **plus** Wiederverwendung des bereits vorhandenen
  Sprachpfads (lokale Transkription existiert schon, spart Aufwand
  gegenüber "nur Text").
- Ein Pferd pro Vorgang, eine Beobachtung, optionale Maßnahme/
  Folgeintervall — deckt sich 1:1 mit dem heutigen `hoof-voice-finding`-Schema.
- Pferdesuche — **muss neu gebaut werden**, existiert nicht (Abschnitt 5).
- Rückfrage bei Mehrdeutigkeit — **muss neu gebaut werden**, aber
  `HufiChoiceCards.tsx` liefert bereits die UI-Vorlage aus dem Lab.
- Vorschau/Bestätigung — **bereits vorhanden**, nur auf horse-agnostischen
  Einstieg erweitern.
- Echte Speicherung — **bereits vorhanden** (`hoof_entries`/`hoof_analyses`),
  muss nur transaktional + idempotent gemacht werden.
- Audit — teilweise vorhanden, muss vervollständigt werden (Abschnitt 21:
  `hufi_context_log`-Schema-Drift zuerst klären).
- Idempotenz — **muss neu gebaut werden**, existiert nirgends im Schema.
- Mobile Support — UI-Bausteine (Dialog/Sheet) vorhanden, kein
  spezifisches Risiko erkennbar.

**Nicht im ersten MVP** — Liste aus dem Auftrag wird bestätigt, mit einer
Ergänzung: **automatische Terminbuchung aus der Folgeaufgabe** sollte
zusätzlich ausgeschlossen werden — `hufi_followup_suggestions` erzeugt
heute bewusst nur einen *Vorschlag*, kein Auto-Booking, und das sollte für
den ersten Hufi-Flow genauso bleiben (Konsistenz mit bestehendem Verhalten,
geringeres Risiko).

---

## 18. Phasenplan

**Phase 0 — Bestandsanalyse**: dieses Dokument. Abgeschlossen.

**Phase 1 — Contracts und Validierung**
- Ziel: Action Contract (Abschnitt 15) als TypeScript-Typen festschreiben,
  `idempotencyKey`-Spalte/Unique-Index als Migration entwerfen (noch nicht
  anwenden).
- Betroffen: neue Datei `src/lib/hufi-observation-contract.ts` (Typen
  only, keine Ausführungslogik).
- Risiken: Feldbenennung muss mit `hufi-ai-voice-finding`-Schema
  konsistent bleiben, sonst zwei parallele Formate.
- Abnahme: Typen decken alle sechs Contracts ab, mit dem echten
  `hoof_entries`/`hoof_analyses`-Schema abgeglichen.

**Phase 2 — Textbasierter Assistant-Flow mit Mock-Ausführung**
- Ziel: neue, horse-agnostische Einstiegs-UI (kann auf
  `assistant-lab`-Komponenten aufbauen), Ausführung noch gemockt.
- Risiken: Verwechslung mit dem bestehenden Lab — klar als neuer,
  produktiver Pfad kennzeichnen, nicht in `/hufi-lab` bauen.

**Phase 3 — echte Pferdesuche und Kontextauflösung**
- Ziel: neue Pferdesuch-Komponente (schließt die in Abschnitt 13
  benannte Lücke, idealerweise gleich als geteilte Komponente für
  `AppointmentFormModal.tsx`/`CreateInvoiceModal.tsx` mitgedacht),
  Duplikat-Behandlung.
- Abnahme: zwei gleichnamige Test-Pferde werden korrekt als Rückfrage
  behandelt, nicht automatisch geraten.

**Phase 4 — echte Beobachtung speichern**
- Ziel: neue RPC (Execution Contract), die `hoof_entries` +
  `hoof_analyses` transaktional befüllt; Anbindung an den neuen
  Such-/Bestätigungsflow statt der heutigen fixen `horseId`-Prop.
- Risiken: bestehende `HufiAIVoiceRecorder`-Nutzung in der Pferdeakte darf
  nicht brechen — RPC additiv einführen, alten Pfad vorerst parallel lassen.

**Phase 5 — Bestätigung, Audit und Idempotenz**
- Ziel: `idempotencyKey`-Migration anwenden, `hufi_context_log`-Drift
  klären (Abschnitt 21) bevor darauf aufgebaut wird, vollständiges
  Audit-Log für den Beobachtungsinhalt selbst.

**Phase 6 — optionale Folgeaufgabe**
- Ziel: Verbindung `folgeintervallWochen` → `hufi_followup_suggestions`-Upsert.
- Abnahme: "Kontrolle in 4 Wochen" erzeugt real einen Eintrag, der im
  Morning-Briefing erscheint (bestehender Mechanismus, nur neu befüllt).

**Phase 7 — Spracheingabe anschließen**
- Ziel: bestehenden Voice-Pfad (`HufiAIVoiceRecorder`-Muster) an den neuen
  horse-agnostischen Flow koppeln statt an die fixe Pferdeakte-Route.

**Phase 8 — Fehlerfälle und Mobile QA**
- Ziel: Teststrategie (Abschnitt 19) durchspielen, insbesondere
  Doppel-Submit und Mandantenüberschreitung.

**Phase 9 — kontrollierter Rollout**
- Ziel: Feature-Flag-gesteuerte Freigabe für einzelne Provider, wie im
  Projekt an anderer Stelle üblich (`FEATURE_FLAGS`-Muster, in `App.tsx`
  bereits für andere Features verwendet).

---

## 19. Teststrategie

**Unit Tests**: Action-Contract-Validierung (Zod/TS), Pferde-Namens-
Matching-Logik, `folgeintervallWochen`→Datum-Berechnung.

**Integration Tests**: neue RPC end-to-end gegen eine Test-Instanz
(nicht Prod) — eindeutiges Pferd, zwei gleichnamige Pferde, Pferd nicht
gefunden, archiviertes Pferd (`horse_status='archived'`), fehlende
Körperregion, fehlende Beobachtung (sollte ablehnen), optional keine
Maßnahme (sollte akzeptieren), Folgeintervall erkannt, ungültiges Datum,
bestehender Termin vorhanden vs. keiner.

**Datenbanktests**: RLS-Tests mit zwei verschiedenen Test-Providern —
Mandantenüberschreitung muss von Postgres selbst abgelehnt werden, nicht
nur vom Client verhindert werden. IDOR-Regressionstest analog zum
bestehenden Muster in `HUFI_TODO.md`.

**RLS-Tests**: keine Berechtigung (fremder Provider ohne `access_grants`),
Mandantenüberschreitung (Pferd einer anderen Organisation).

**End-to-End-Tests**: doppelter Submit (Idempotency-Key muss zweite
Ausführung verhindern), Netzwerkfehler während der Transaktion (darf
keinen inkonsistenten Zustand — `hoof_entries` ohne `hoof_analyses` —
hinterlassen), Supabase-Fehler, abgelaufene Bestätigung, Nutzer bricht ab,
Erfolg, Rückgängig (**aktuell nicht möglich** — als bekannte Grenze
dokumentieren, nicht testen als ob es existiert).

**Manuelle QA**: Mobile 360 px, Tastaturbedienung, Screenreader
(aria-labels wie bereits im Hufi-Lab etabliert), `prefers-reduced-motion`.

---

## 20. Erfolgskriterien

Wie im Auftrag vorgegeben, unverändert übernommen — keine davon steht im
Widerspruch zur vorgefundenen Architektur:
Beobachtung < 30 Sekunden erfassbar; keine falsche Pferdezuordnung ohne
Bestätigung; jede Änderung vor Ausführung sichtbar; keine Doppelausführung;
keine mandantenfremden Daten zugänglich; Fehler führen nicht zu stiller
Inkonsistenz; Ergebnis in der Pferdeakte auffindbar (bedingt: erfordert
Anbindung an `PferdeakteTimeline.tsx`, siehe Abschnitt 6); Nutzer sieht
konkret was gespeichert wurde; Mobile vollständig nutzbar; Audit
nachvollziehbar (bedingt: erfordert Klärung von Abschnitt 21 zuerst).

---

## 21. Risiken

1. **`hufi_context_log` hat keine Migration im Repo**, existiert aber laut
   generierten Typen live (`types.ts:9474`) — Schema-Drift. Vor jeder
   Erweiterung des Audit-Konzepts klären, wie diese Tabelle tatsächlich
   entstanden ist und ob ihre RLS dem Rest des Schemas entspricht (aus
   lokalen Dateien nicht feststellbar).
2. **Zwei parallele Organisationsmodelle** (`organizations`/
   `profiles.organization_id` vs. `organization_members`) — nicht
   bestätigt, ob synchron. Vor jeder mandantenbezogenen Hufi-Logik klären,
   welches Modell für Provider-Teams maßgeblich ist.
3. **`hufi_task_queue`-Bestätigung ist rein clientseitig orchestriert** —
   kein serverseitiger Gate zwischen "vorgeschlagen" und "ausgeführt"
   außer der RLS der Zieltabelle selbst. Für einen Hufi-Schreibpfad mit
   höherem Risiko (echte Pferdeakte) reicht dieses Muster nicht,
   RPC-basierte Prüfung empfohlen (Abschnitt 15).
4. **Kein Idempotency-Mechanismus im gesamten Schema** — muss komplett neu
   eingeführt werden, nicht nur für Hufi.
5. **Zwei ungeschützte Inserts ohne Transaktion** im bestehenden
   `PferdeakteHuf.tsx`-Pfad (`hoof_entries` dann `hoof_analyses`) — bei
   Fehler zwischen beiden entsteht ein inkonsistenter Zustand schon heute,
   unabhängig von Hufi.
6. **`create_note`/`_createNote` ist nicht mandantensicher** (kein
   `horse_id`-Bezug, keine RLS-Prüfung) — falls dieser Pfad irgendwo als
   Vorbild missverstanden wird, nicht wiederverwenden.
7. **Bekannte, laut `HUFI_TODO.md` teils noch offene IDOR-Punkte** — vor
   Produktivsetzung eines neuen Schreibpfads erneut mit aktuellem Stand
   abgleichen, nicht auf Basis dieses Dokuments als "erledigt" annehmen.
8. **`AGENT_ANALYSE.md` ist zehn Tage älter** als dieser Stand und bezieht
   sich auf einen anderen Branch — mindestens ein dort beschriebener
   Missstand (`cancel_appointment` fehlt im Type-Union) ist im aktuellen
   Code bereits behoben. Alle Punkte aus jenem Dokument vor einer
   Implementierung erneut verifizieren, nicht blind übernehmen.
9. **Kein Undo/Rückgängig-Pattern** für `hoof_entries` — falls „Aktion
   rückgängig machen" (Policy-Matrix) tatsächlich gebraucht wird, ist das
   ein komplett neuer Baustein, kein bestehendes Muster zum Ausbauen.

---

## 22. Offene Entscheidungen

- Welches Organisationsmodell (`organizations` vs. `organization_members`)
  ist für Hufi maßgeblich, falls Team-/Mehrfach-Provider-Szenarien
  relevant werden? (Für den Solo-Provider-MVP vermutlich irrelevant.)
- Soll die neue RPC für Beobachtungen `hoof_entries`/`hoof_analyses`
  direkt erweitern, oder — falls fachlich gewünscht — zusätzliche
  Strukturfelder (Körperregion als eigenes Enum statt implizit über die
  vier `huf_werte`-Positionsfelder) einführen? Das wäre eine
  Schema-Erweiterung, keine neue Tabelle, aber trotzdem abzustimmen.
  Auftrag sagt: nicht automatisch neue Tabelle — dieser Punkt betrifft nur
  mögliche neue Spalten am bestehenden Modell.
- Wie weit soll die Pferdeerkennung reichen — nur Fuzzy-Match auf Namen,
  oder auch "das Pferd, mit dem ich gerade den heutigen Termin habe"
  automatisch bevorzugen (DayCockpit-Muster, Abschnitt 7)?
- Soll `hufi_context_log` weiterverwendet werden, sobald sein
  tatsächlicher Ursprung/Schema-Status geklärt ist, oder wird für Hufi ein
  neues, migrationsverwaltetes Audit-Log bevorzugt?

---

## 23. Empfehlung für den nächsten Bauauftrag

**Phase 1 (Contracts und Validierung) zuerst**, mit einer Vorbedingung:
`hufi_context_log`-Herkunft klären (Frage an dich, nicht technisch aus dem
Repo lösbar) bevor Audit-Design darauf aufbaut. Danach direkt in Phase 3/4
einsteigen (Pferdesuche + echte Speicherung), da die aufwändigste Arbeit
— KI-Extraktion, Vorschau-UI, Speicherpfad — bereits existiert und nur
horse-agnostisch gemacht werden muss, statt neu gebaut zu werden. Die
Sprachanbindung (Phase 7) ist technisch der am wenigsten riskante Teil, da
die komplette Aufnahme-/Transkriptions-Infrastruktur bereits produktiv
läuft.

---

## 24. Contract- und Policy-Spezifikation

> Vertiefungsrunde, Stand 2026-08-02. Vollständige Spezifikation in
> `docs/hufi-observation-phase-1-contracts.md` — dieser Abschnitt fasst
> nur die wichtigsten Ergebnisse zusammen, keine Duplikation.

Zwei gezielte Nachrecherchen haben die in Abschnitt 21/22 offenen Fragen
zu `hufi_context_log` und dem Organisationsmodell abschließend geklärt:

- **`hufi_context_log`** wird im gesamten Repository nur geschrieben, nie
  gelesen (`hufi-actions.ts:102-113`, `hufi-brain.ts:424-434,1096-1103`),
  vermischt Audit- und Lernfeedback-Zwecke ohne Trennung, hat keine
  Migration (vermutlich Dashboard-Artefakt, analog zum dokumentierten Fall
  `hufi_memory`/`hufi_memories`). **Bestätigt: nicht für den
  Observation-Flow verwenden.**
- **Organisationsmodell**: beide gefundenen Konzepte sind für den
  Observation-Flow irrelevant. `organizations`/`profiles.organization_id`
  ist totes Gerüst (nirgends im Anwendungscode beschrieben);
  `organization_members` ist strikt auf das B2B-Portal-Feature begrenzt.
  **Maßgeblich ist ausschließlich `provider_id = auth.uid()`**, exakt das
  Muster von `hoof_analyses`/`hufi_followup_suggestions`.

Auf dieser Grundlage wurden produktionsfähige TypeScript-Contracts (Zod)
unter `src/features/hufi-observation/contracts/` erstellt: Input,
Beobachtungsstruktur, Follow-up, Proposal (inkl. sechsstufiges
Horse-Resolution-Modell), Confirmation, Execution (nur serverseitig
vertrauenswürdige Felder), Result, 19 strukturierte Fehlercodes und eine
Policy-Matrix für neun Aktionen. Kernprinzip durchgängig: Client-Werte
(`userId`, `providerId`, `selectedHorseId`) werden nie direkt in die
Execution-Stufe übernommen, sondern serverseitig neu aufgelöst/
re-autorisiert. Empfohlene Transaktionsstrategie für die nächste
Bauphase: eine dedizierte PostgreSQL-RPC (nicht Client-Inserts, nicht
mehrere Edge-Function-Inserts) — Begründung und vollständige
Kriterien-Abwägung in `docs/hufi-observation-phase-1-contracts.md`
Abschnitt 17.
