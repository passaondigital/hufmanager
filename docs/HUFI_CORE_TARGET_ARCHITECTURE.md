# HufAI Core — Target Architecture

> Zuletzt aktualisiert: 2026-05-11
>
> Architektur-Kristallisation. Keine Implementierung, keine Migration,
> kein Refactor, kein Deploy.
>
> Quelle: Findings aus `docs/HUFI_SYSTEM_DNA_ANALYSIS.md`,
> `docs/HUFI_VERIFICATION_AUDIT.md` (HEAD `260af789`, Stand 2026-05-08)
> und Jarvis-Level Audit 2026-05-11.
>
> Diese Datei beschreibt den **Soll-Zustand**. Jeder Abschnitt trennt
> deutlich zwischen *existing already* (mit konkretem Datei-/Tabellen-
> Verweis) und *future target* (was neu hinzukäme). Unsicheres ist mit
> `[?]` markiert.
>
> **Kein Marketing. Keine Buzzwords. Keine Fantasie-Features
> disconnected vom aktuellen Code.**
>
> Ergänzende Dokumente (neu ab 2026-05-11):
> - `HUFAI_RUNTIME_VISION.md` — HufAI als Kernprodukt, 4 Tracks
> - `HUFAI_DEVICE_CAPABILITY_MATRIX.md` — Platform-Capabilities
> - `HUFAI_WAKE_RUNTIME_RESEARCH.md` — Wake Reality Check
> - `HUFAI_CLI_VISION.md` — CLI-Konzept
> - `HUFAI_BIOMETRIC_IDENTITY.md` — Passkeys & WebAuthn

---

## 0. HufAI Frontend-Zielstruktur (Neu 2026-05-11)

Die folgende Ordnerstruktur ist das **Ziel** für `src/lib/hufai/`.
Sie existiert noch nicht — heutige Dateien liegen flach in `src/lib/`.

```
src/lib/hufai/

core/
  ├── memory/          — Heute: hufi-brain.ts, hufi-memory.ts (flach)
  │                      Ziel: horse_memory, user_memory, relation_memory API
  ├── context/         — Heute: hufi-context-resolver.ts
  │                      Ziel: Permission-gefilterter Context-Builder
  ├── identity/        — Heute: hufi-biometrics.ts
  │                      Ziel: Auth + Biometrie + Rollen-Resolution
  └── intelligence/    — Heute: ai-routing.ts, hufi-brain.ts
                         Ziel: AI-Router, Credit-System, Model-Selection

runtime/
  ├── session/         — Heute: nicht vorhanden (P0-Lücke)
  │                      Ziel: Multi-Turn-Konversations-State
  ├── device/          — Heute: nicht vorhanden
  │                      Ziel: Platform-Detection, Capability-Flags
  ├── wake/            — Heute: HeyHufi.tsx (Browser SR API)
  │                      Ziel: abstrahierte Wake-Engine (Browser / Porcupine)
  └── offline/         — Heute: TanStack+IndexedDB (Daten), kein Offline-AI
                         Ziel: Ollama-Bridge, Local-Inference-API

layers/
  ├── voice/           — Heute: useHufiTTS.ts, useVoiceCapture.ts, HeyHufi.tsx
  ├── action/          — Heute: hufi-actions.ts, hufi-nav-actions.ts
  ├── recommendation/  — Heute: hufai-proactive.ts (regel-basiert)
  ├── proactive/       — Heute: hufai-proactive.ts (TTL-Gate, Open-Meteo)
  ├── navigation/      — Heute: hufi-intent.ts, hufi-nav-actions.ts
  ├── vision/          — Heute: hufai-media.ts (Upload), F-2 fehlt
  ├── weather/         — Heute: HufiWeatherWidget.tsx, Open-Meteo
  └── horse/           — Heute: hufi-brain.ts (Teile davon)

integrations/
  ├── calendar/        — Heute: nicht vorhanden
  ├── email/           — Heute: Resend via Edge Functions
  ├── weather/         — Heute: Open-Meteo (kostenlos)
  └── stable-systems/  — Heute: sync-vet-pms Edge Function

multimodal/
  ├── image/           — Heute: HufiCam.tsx, hufai-media.ts
  ├── sensor/          — Heute: useHufiGPS.ts, hufi-biometrics.ts
  └── hoof-analysis/   — Heute: ai_status='pending', F-2 nicht implementiert
```

**Migration-Strategie:** Kein Big-Bang-Refactor. Dateien werden bei
nächstem Anfassen in die neue Struktur verschoben. Neue Dateien direkt
in die Zielstruktur anlegen.

---

## 1. The Core Philosophy

### Was Hufi tatsächlich ist

Hufi ist **kein SaaS**. Hufi ist ein **Pferd-Betriebssystem**: eine
permanente, kontextbewusste, multi-Akteur-fähige Software-Schicht, in
der das **Pferd** die kanonische Entität ist und **mehrere Menschen**
(Besitzer, Hufbearbeiter, Tierarzt, Stallbetreiber, Mitarbeiter) auf
*derselben* Wahrheit über das Pferd arbeiten — mit klar abgegrenzten
Sicht- und Eingriffsrechten, mit nachvollziehbarer Historie und mit
einer KI-Schicht, die *vorbereitet, erinnert, vorschlägt und nachfragt*,
aber **niemals autonom** sensible Aktionen auslöst.

Das ist näher an einem Krankenhaus-Informationssystem (HIS) für Pferde
als an einem Friseur-Termin-Planer. Es ist näher an einem Wallet
(Daten gehören dem Pferdebesitzer, mehrere Akteure haben Lese-Erlaubnis)
als an einer klassischen B2B-CRM.

### Warum horse-centric

Heute ist die App provider-zentriert: `horses.provider_id` ist Pflicht,
RLS-Policies starten mit "ist Provider berechtigt?", `hufi_memory.user_id`
ist user-zentriert. Folge: jeder Akteur hat *seine eigene* Sicht auf
das Pferd, niemand sieht die geteilte Wahrheit.

Pferd-zentriert bedeutet:

- Das Pferd ist die einzige Quelle der Wahrheit, an die alle anderen
  Beziehungen hängen.
- Eigentum ist eine Beziehung des Pferdes zu Menschen, nicht umgekehrt.
- Memory gehört dem Pferd, nicht dem Akteur.
- Termine, Befunde, Fotos, Behandlungen sind **Events am Pferd**, nicht
  Datensätze des Providers.

Folge im Datenmodell: `horses.id` ist Primary Key vieler Beziehungen,
nicht `auth.uid()` plus Provider-Filter.

### Warum multi-actor

Ein einziges Pferd hat heute schon (logisch, oft nicht datenmodell-
seitig) bis zu sechs Akteure gleichzeitig: Besitzer, Reitbeteiligung,
Hufbearbeiter, Tierarzt, Physio/Therapeut, Stallbetreiber. In komplexen
Sportstall-Konstellationen kommen Trainer, Schmiedlehrling, Vertreter,
Versicherer dazu.

Heute werden diese Beziehungen über **vier separate Access-Tabellen**
(`access_grants`, `horse_partner_access`, `stall_horse_access`,
`employee_horse_access`) abgebildet — ein Beziehung-pro-Tabelle-
Pattern, das schwer query-bar und schwer auditierbar ist.

Multi-Actor-fähig bedeutet: **eine** zentrale `horse_caregivers`-Sicht
mit Permission-Matrix, jede Akteurs-Rolle als Datensatz, Zeitfenster
(`active_from`, `active_to`), expliziter Consent.

### Warum Frontend nur Cockpit-Layer ist

Heute hat die App 102 Pages, viele für dieselben Daten in
unterschiedlichen Rollensichten. Das ist Wuchs aus der Lovable-/SaaS-
Phase. Die Lehre: jede neue Rolle hat zur Pages-Vermehrung geführt.

Frontend als Cockpit bedeutet: **eine UI-Schicht zeigt, was Hufi
gerade tut, vorbereitet, fragt oder vorschlägt** — alle eigentliche
Logik (Berechtigung, Reasoning, Aktionen, Reminders) lebt im Backend.
Wenn man das Frontend ausschaltet, müsste das Backend trotzdem
weiterlaufen: Reminder verschickt, AutoFlow ausgelöst, Audit
geschrieben. Frontend ist die *Oberfläche*, nicht das *Programm*.

20/80-These (siehe `HUFI_SYSTEM_DNA_ANALYSIS.md` §8): heute eher
50/50, Soll ist 20 % Frontend, 80 % Backend.

### Warum Hufi nicht "just SaaS" ist

- **B2B-Kern:** Hufpfleger zahlen für ihre operative Praxis. Klassisches
  SaaS-Modell.
- **B2C-Layer:** Pferdebesitzer haben kostenlose Sicht auf ihre Pferde.
  Klassisches Consumer-Pattern.
- **Ecosystem-Layer:** Tierarzt, Stallbetreiber, Physio sind weder B2B-
  noch B2C-Kunden, sondern *gemeinsam Beteiligte am gleichen Pferd*.
  Klassisches **Plattform-Pattern**.
- **Compliance-Layer:** Tier-Daten, medizinische Aussagen, EU-AI-Act,
  DSGVO. Compliance-Niveau eines Healthcare-Stacks.
- **Memory-Layer:** Hufi soll lernen, ohne dass das einzelne Pferd-
  Wissen in Cloud-AI-Trainingsdaten landet. **Privacy-First-AI-Pattern**.

Diese vier Schichten gleichzeitig macht Hufi **strukturell anders** als
SaaS-Vorlagen.

---

## 2. Canonical Entity Model

### Heute (existing already)

```
                    Provider                   Client (Owner)
                       │                            │
                       │ owns provider_id           │ owns owner_id
                       │                            │
                       ▼                            ▼
                    horses ────────────────────┐  (single-owner)
                       │                       │
                       │ horse_id              │
                       ▼                       ▼
              ┌───────────────┐    ┌──────────────────────┐
              │  hoof_*       │    │  access_grants       │
              │  appointments │    │  horse_partner_access│
              │  invoices     │    │  stall_horse_access  │
              │  documents    │    │  employee_horse_access│
              └───────────────┘    └──────────────────────┘
```

**Bestätigte Schwächen:**
- `horses.owner_id` ist single-owner.
- `horses.provider_id` als Pflichtfeld zentriert auf Provider.
- Vier separate Access-Tabellen statt einer Konsolidierung.
- `hufi_memory.user_id` ist akteur-, nicht pferd-zentriert
  (siehe `HUFI_VERIFICATION_AUDIT.md` §2 — Schema-Provenance unklar).

### Future Target (Soll)

```
                              ┌─────────────┐
                              │   PERSON    │
                              │ (auth.users)│
                              └──────┬──────┘
                                     │
                          ┌──────────┼──────────┐
                          │          │          │
                          ▼          ▼          ▼
                    profiles    user_roles   memberships
                                                 │
                                                 ▼
                                          organizations
                                                 │
                                                 ▼
                                            stables [?]
                          
                              ┌─────────────┐
                              │    HORSE    │  ← canonical entity
                              │ horses.id   │
                              └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       horse_owners[]       horse_caregivers[]       horse_state
       (Beziehung           (eine Tabelle für        (current
        Person ↔ Horse,      Provider, Vet,          diagnosis,
        share_pct,           Physio, Stable,         beschlag-typ,
        relation_type,       Employee, Trainer,      intervall,
        active_from,         Insurer)                 health flags)
        active_to)           │
                             ▼
                    horse_caregiver_permissions
                    (granular: read_basic,
                     read_medical, write_findings,
                     create_appointments,
                     trigger_emergency)
                                     │
                                     ▼
                              ┌─────────────┐
                              │horse_timeline│  ← Append-Only Events
                              │ horse_id    │
                              │ event_type  │
                              │ payload     │
                              │ created_by  │
                              │ visibility  │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │horse_memory │  ← pferd-zentriert
                              │ horse_id    │
                              │ category    │
                              │ value       │
                              │ source      │
                              │ confidence  │
                              └─────────────┘
```

### Beziehungs-Modell im Detail

| Entität | Beziehung | Heute | Soll |
|---|---|---|---|
| **Person** | hat 1..n Rollen, 1..n Memberships | `auth.users` + `profiles` + `user_roles` | unverändert; `app_role` ENUM erweitern (siehe DNA-Analyse §12) |
| **Organization** | enthält 1..n Personen | `organizations` + `organization_role` (admin/employee) | unverändert |
| **Stable** | gehört 1..n Organizations [?] | `stall_horse_access` als Access-Tabelle, keine `stables`-Entität gefunden [?] | dedizierte `stables`-Tabelle erwägen |
| **Horse** | kanonisch | `horses` mit `owner_id` + `provider_id` | `horses` *ohne* Pflicht-Provider; `owner_id` ersetzt durch `horse_owners`-Relation |
| **horse_owners** | Mensch ↔ Pferd, anteilig, zeitlich | nicht vorhanden | neu — Junction-Table mit `share_pct`, `active_from/to`, `relation_type` (primary/co-owner/lessor/lessee/beneficiary) |
| **horse_caregivers** | Akteur kümmert sich ums Pferd | über 4 separate Tabellen | neu konsolidiert — Felder: `horse_id`, `person_id`, `caregiver_role` (provider/vet/physio/stable/employee/trainer/insurer), `permissions`, `active_from/to`, `consented_at`, `consent_proof_id` |
| **horse_state** | aktueller Status des Pferdes | abgeleitet aus History | neu — persistent gespeichert, per Trigger aus `horse_timeline` aktualisiert |
| **horse_timeline** | jede Aktion am Pferd | nur als Audit (`horse_audit_log`) | neu als Append-Only Event-Stream — **das ist das wichtigste neue Pattern** |
| **horse_memory** | pferd-eigenes Gedächtnis | `hufi_memories.horse_id` (mit `as any`-Cast) | konsolidieren auf `horse_memory` mit klarem Schema |
| **horse_documents** | Equidenpass, Eigentumsurkunde, Versicherung | `horse_documents` existiert | unverändert, evtl. mit Versionierung |

### Approvals

| Aspekt | Heute | Soll |
|---|---|---|
| Approval-Skelett | `hufi-actions.ts` mit `explanation`-Feld | erweitert auf `hufi_approvals`-Tabelle |
| Sensitive Aktion | wird in Notification gepackt | wird als Approval-Card im UI gerendert |
| Bestätigungs-Pfad | manuelles Klicken, kein zentraler Flow | dedizierter Approval-Queue-Endpoint |
| Audit der Genehmigung | `hufi_context_log` | + `hufi_approvals.approved_by`, `approved_at`, `decision`, `decision_reason` |

### Permissions-Matrix (Soll)

```
                         | read_basic | read_medical | write_findings | trigger_emergency | manage_caregivers |
─────────────────────────┼────────────┼──────────────┼────────────────┼───────────────────┼───────────────────┤
horse_owners (primary)   |    ✓       |     ✓        |      –         |       ✓           |        ✓          |
horse_owners (co)        |    ✓       |     ✓        |      –         |       ✓           |     bei Quorum    |
provider                 |    ✓       |     ✓ *      |      ✓         |       ✓           |        –          |
vet                      |    ✓       |     ✓ *      |      ✓ *       |       ✓           |        –          |
physio                   |    ✓       |     ✓ *      |      ✓ *       |       –           |        –          |
stable                   |    ✓       |     –        |      –         |       ✓           |        –          |
employee                 |    ✓       |     ✓ ✱      |      ✓ ✱       |       –           |        –          |
trainer                  |    ✓       |     –        |      –         |       –           |        –          |
insurer                  |    ✓       |     ✓ *      |      –         |       –           |        –          |

* = nur mit consent_proof_id
✱ = nach employee_role (view/employee/team_lead)
```

### Notfall-Pfad (Existing already)

`/notfall/:eqid/:token` Route mit `NotfallZugang`-Page existiert.
Lifecycle des Tokens unklar `[?]`. Soll: Token-Tabelle mit `expires_at`,
`revoked_at`, `created_by`, `purpose`, `scope`.

---

## 3. Event Architecture

### Heute (existing already)

- **Audit-Tabellen:** ~20 Stück (`*_audit_log`, `*_history`,
  `hufi_context_log`, `consent_log`, `autoflow_log`).
- **AutoFlow-Engine** (`autoflow-auto-invoice`, `-monthly-checkin`,
  `-customer-notify`, `-process-lead`) als HTTP/Cron-getriggerte Edge
  Functions, alle loggen in `autoflow_log`.
- **Notification-Engine** (12 Edge Functions, `notifications` Tabelle,
  `push_subscriptions`).
- **Realtime-Channel** über Supabase Postgres Changes + Presence
  (`useHufChat`).
- **Cron-Jobs** für `morning-briefing`, `notification-scheduler`,
  `escalate-unconfirmed`, `legal-change-reminders`,
  `check-overdue-invoices`, `anomaly-detection`,
  `publish-scheduled-posts`, `autoflow-monthly-checkin`,
  `autoflow-process-lead`. Cron-Konfiguration nicht im Repo `[?]`.

**Lücke:** Keine zentrale `events`-Tabelle. Jede Aktion landet in
domain-spezifischer Audit-Tabelle, aber **es gibt keinen Event-Bus
über Akteurs-Grenzen hinweg**. Wenn ein Termin verschoben wird, müssen
alle berechtigten Akteure pro Codepfad einzeln informiert werden.
Keine Retry-/Backoff-/Dead-Letter-Strategie. Keine zentrale Sicht
"was ist heute am Pferd passiert?".

### Future Target

```
            ┌────────────────────────────────────────────────┐
            │              EVENT SOURCES                     │
            │  DB Triggers │ Edge Functions │ Cron │ Action  │
            └────────┬───────────────────────────────────────┘
                     │
                     ▼
            ┌─────────────────────┐
            │  events (zentral)   │ ◄── Append-Only, Single Source
            │  id, type, payload, │      of Truth für alles, was
            │  horse_id?, actor_id│      "passiert" ist.
            │  created_at,        │
            │  status,            │
            │  retry_count,       │
            │  last_error         │
            └────────┬────────────┘
                     │
       ┌─────────────┼─────────────┬─────────────┬─────────────┐
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
   AI listeners  Approval    Notification   Realtime     Audit
   (Hufi Brain)  listener    listener       fanout       trail
   - context     - sensitive - akteur-      - UI         - hufi_
     update       actions     übergreifend    update      context_
   - reasoning   - queue     - fanout zu                  log
   - suggestion   approvals   alle berechtigten          - autoflow
     creation    - escalate   actors                       _log
                 to human
                                  │
                                  ▼
                          ┌──────────────┐
                          │  job queue   │ (Soll)
                          │  retries +   │
                          │  dead letter │
                          └──────────────┘
```

### Event-Typen

| Typ | Trigger | Heute? | Soll |
|---|---|---|---|
| `appointment.created` | Terminerstellung | implizit über Audit | als Event-Typ explizit |
| `appointment.rescheduled` | Verschoben | implizit | explizit, fanout zu allen Akteuren am Pferd |
| `appointment.unconfirmed_escalated` | Cron | `escalate-unconfirmed` | als Event-Typ |
| `invoice.created` | Rechnung erstellt | über `autoflow-auto-invoice` | als Event |
| `invoice.overdue` | Cron | `check-overdue-invoices` | als Event |
| `lead.received` | Lead-Eingang | `funnel-lead-notify` | als Event |
| `befund.recorded` | Befund-Eingabe | `ai_befunde` Insert | als Event-Typ |
| `befund.urgent` | KI markiert `dringend_tierarzt` | über Notification | als Event mit Eskalations-Listener |
| `vaccination.due` | Cron 7-Tage-Vorwarnung | `notification-scheduler` | unverändert, plus Event |
| `deworming.due` | Cron | `notification-scheduler` | unverändert, plus Event |
| `access.granted` | Zugriff erteilt | `client_provider_audit_log` | als Event-Typ |
| `access.revoked` | Zugriff entzogen | Audit | als Event-Typ |
| `consent.granted` / `consent.revoked` | DSGVO | `consent_log` | unverändert, plus Event |
| `legal_agreement.changed` | Versionswechsel | `legal-change-reminders` | als Event |
| `payment.received` | CopeCart | `copecart-webhook` | als Event mit Idempotenz-Lock |
| `horse.state_changed` | Trigger nach Befund | nicht vorhanden | neu — nährt `horse_state` |
| `horse.photo_added` | Foto-Upload | nicht spezifisch erfasst | als Event |
| `caregiver.added` / `caregiver.removed` | Beziehungs-Änderung | über 4 separate Tabellen | als Event-Typ, einheitlich |
| `proactive.suggestion_emitted` | KI hat Vorschlag | implizit in `hufi_context_log` | als Event mit Approval-Pfad |
| `approval.requested` / `approval.decided` | Approval-Flow | nicht vorhanden | neu |

### Routing-Pattern

```
Event → events.insert()
      → Trigger schreibt in domain-Audit-Tabelle (legacy bleibt)
      → Listener-Function liest events mit status='pending'
        ├── AI Listener: Context-Update, Memory-Append, evtl. Vorschlag
        ├── Notification Listener: berechtigte Akteure ermitteln,
        │   per Notification + Push fanout
        ├── Approval Listener (für sensible Events): Approval-Card
        │   in hufi_approvals einreihen
        └── Realtime Listener: über Supabase Realtime an UIs broadcasten
      → events.status = 'processed' / 'failed' / 'requires_approval'
      → Bei 'failed': Retry mit exponential backoff (3 Versuche),
        dann Dead-Letter
```

### Event → Context → Memory → Reasoning → Approval → Action → Audit

> Das ist der zentrale Hufi-Brain-Flow.

```
1. EVENT      → events table append
2. CONTEXT    → Hufi-Brain holt horse_state, horse_memory,
                horse_caregivers, recent timeline
3. MEMORY     → relevante Memory-Einträge laden (per Pferd, per Akteur)
4. REASONING  → Hufi entscheidet:
                - genug Kontext? (sonst: Nachfrage erzeugen)
                - sensible Aktion? (dann: Approval-Pfad)
                - autonome Aktion? (dann: direkt ausführen)
                - keine Aktion? (dann: nur loggen)
5. APPROVAL   → bei sensitiv: hufi_approvals.insert(),
                Akteur sieht Card mit explanation
6. ACTION     → ausgeführt (Edge Function, DB-Update, Notification)
7. AUDIT      → hufi_context_log.append({
                  trigger_event_id, context_snapshot,
                  reasoning_summary, action_taken,
                  approved_by, explanation,
                  user_feedback_pending })
```

---

## 4. Hufi Brain

### Heute (existing already)

- `hufi-brain.ts` mit `fetchHufiContext`, `generateHufiGreeting`,
  `updateHufiMemory`, `learnFromInteraction`, `checkProactiveAlerts`.
- `hufi-actions.ts` mit Action-Factory und `explanation`-Feld.
- `hufi-intent.ts` mit Keyword-Matching für 5 Intent-Typen.
- `hufi-context-resolver.ts` für Pferd-/Kunden-Lookup.
- `ai-routing.ts` mit Claude Haiku/Sonnet, Credit-System,
  Ollama-Fallback.
- `hufi-business.ts` für Provider-B2B-Analytics.

**Lücke:** Alles ist *single-agent, user-zentriert*. Es gibt kein
Konzept "Agent pro Pferd" oder "Agent pro Akteur-Rolle".

### Future Target — Multi-Agent-Hierarchie

```
                    ┌──────────────────────────┐
                    │     SYSTEM AGENT         │
                    │  (Hufi-System)           │
                    │  - Anomalie-Detection    │
                    │  - Cross-User-Insights   │
                    │  - Plan-Tier-Reminders   │
                    │  - Compliance-Watch      │
                    └────────────┬─────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │ PER-HORSE AGENT │  │ PER-ACTOR AGENT │  │ PER-ORG AGENT   │
   │ (one per horse) │  │ (one per user)  │  │ (one per org)   │
   │                 │  │                 │  │                 │
   │ - kennt Pferd-  │  │ - kennt Rolle,  │  │ - aggregiert    │
   │   state         │  │   Routinen,     │  │   Pferd-Status  │
   │ - liest horse_  │  │   Präferenzen   │  │   für Stall     │
   │   memory        │  │ - kennt Geräte  │  │ - Stall-Cockpit │
   │ - schlägt       │  │ - liest user_   │  │ - Tour-Plan-    │
   │   Aktionen vor  │  │   memory        │  │   Vorbereitung  │
   │ - braucht       │  │                 │  │                 │
   │   Consent für   │  │                 │  │                 │
   │   Aktion        │  │                 │  │                 │
   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                          ┌──────▼──────┐
                          │ ACTOR-VIEW  │
                          │ (per role)  │
                          │             │
                          │ - Provider  │
                          │ - Client    │
                          │ - Vet       │
                          │ - Physio    │
                          │ - Stable    │
                          │ - Employee  │
                          │ - Trainer   │
                          │ - Admin     │
                          │ - Botschafter[?] │
                          └─────────────┘
```

### Pro Agent-Typ

#### Per-Horse Agent

- **Verantwortung:** kontinuierlich kontextbewusst über *ein* Pferd.
  Beobachtet Events am Pferd. Schlägt Aktionen vor. Erkennt
  Anomalien (Befund-Häufung, Termin-Lücke, ungewöhnliche
  Beschlag-Intervalle).
- **Heute:** nicht vorhanden.
- **Daten:** liest `horse_state`, `horse_memory`, `horse_timeline`,
  `horse_caregivers` (für Berechtigungs-Filter).
- **Schreibt:** Vorschläge in `hufi_approvals`,
  Memory-Updates in `horse_memory`, Audit in `hufi_context_log`.
- **Lifecycle:** wird per `horse.created`-Event erzeugt, terminiert
  bei `horse.archived`.
- **Privacy:** Pferd-Memory ist akteurs-gefiltert beim Lesen — der
  Agent selbst kennt alles, aber sein Output wird per Permission-
  Matrix gefiltert.

#### Per-Actor Agent

- **Verantwortung:** kennt Routinen, Präferenzen, Geräte, Tageszeit-
  Patterns *einer* Person.
- **Heute:** Anteile in `hufi-brain.ts`'s `fetchHufiContext`,
  `hufi_memory.user_id`-Tabelle.
- **Daten:** `user_memory` (umbenannt aus `hufi_memory`), Plan-Tier,
  Subscription-Status, GA4-Aktivität.
- **Schreibt:** Vorschläge in akteurs-Cockpit, Memory-Updates.
- **Privacy:** liest *nicht* in andere Akteure rein.

#### Provider CoPilot

- **Heute:** AutoFlow + `morning-briefing` + `hufi-brain` Greeting.
- **Soll:** erweiterter Per-Actor-Agent mit Spezialisierung auf
  Tour-Planung, Lead-Klassifikation, Rechnungs-Vorbereitung,
  B2B-Reports.

#### Client Companion

- **Heute:** weitgehend Read-only Sicht ohne KI-Begleitung.
- **Soll:** erweiterter Per-Actor-Agent mit Fokus auf:
  Termin-Erinnerung, Pferd-Status-Zusammenfassung, Notfall-Anleitung,
  Foto-Upload-Aufforderung.

#### Partner Specialist

- **Heute:** Vet-Portal-Suite (`VetSOAPForm`, `VetGOTRechner`).
- **Soll:** erweiterter Per-Actor-Agent mit medizinischen
  Vorschlags-Patterns aus `equine_ontology` plus eigenem
  Treatment-Plan-Speicher (`partner_treatment_plans` heute).

#### Stable Coordinator

- **Heute:** `StallAnfragen.tsx` (Anfragen-Triage).
- **Soll:** Per-Org-Agent für Stallbetreiber, mit Stall-Cockpit für
  alle Pferde im Stall, Provider-Auswahl-Vorschläge,
  Anfragen-Routing.

#### System Agent

- **Heute:** `anomaly-detection`, `morning-briefing` (data-only).
- **Soll:** erweiterter System-Watch für Cross-User-Insights
  (anonymisiert), Plan-Tier-Reminders, Compliance-Drifts.

### Memory-Hierarchie

| Schicht | Heute | Soll |
|---|---|---|
| **System Memory** | `equine_ontology`, Glossar, Werbe-/Affiliate-Daten | unverändert, plus konsolidierte Wissensbasis |
| **Org Memory** | `business_settings`, Teilweise in Plan-Tier | neu — `org_memory` pro Organization |
| **Horse Memory** | `hufi_memories.horse_id` (mit `as any`-Cast) | konsolidieren auf `horse_memory` |
| **Actor Memory** | `hufi_memory.user_id` (kategorisiert) | umbenennen in `user_memory` |
| **Relation Memory** | nicht explizit | neu — `relation_memory` pro `(horse_id, user_id, role)`-Tupel |
| **Session Memory** | React State + IndexedDB (`idb-keyval`) | unverändert |

### Context Resolution

Beim Trigger eines Events oder einer Anfrage:

```
1. Identify horse_id + actor_id + intent.
2. Permission filter: was darf actor an diesem horse sehen?
3. Pull system memory (equine ontology + glossar).
4. Pull horse memory (gefiltert per permission).
5. Pull user memory (eigene Routinen).
6. Pull relation memory (was weiß horse über diesen actor?).
7. Pull recent timeline (last 30 days, gefiltert per permission).
8. Pull org memory (falls in Org-Kontext).
9. Compose context — pseudonymize sensitive fields before AI call.
10. Hand to AI router (Haiku/Sonnet/local).
```

### Knowledge Boundaries

- **Hufi darf wissen:** alles, was in DB steht und für aktuellen Akteur
  permittiert ist.
- **Hufi darf nicht wissen (Cloud-AI-Kontext):** echte Personennamen,
  echte Adressen, echte Telefonnummern — alles über
  Pseudonymisierungs-Layer vor `ai-chat`/`anthropic-proxy`.
- **Hufi darf nicht spekulieren:** medizinische Diagnose,
  Tierarznei-Empfehlung. Beides explizit als "Vorschlag, kein Urteil"
  markiert.
- **Hufi darf nicht über Akteurs-Grenzen sehen** ohne Consent — das
  ist Permission-Matrix-getrieben, nicht Hufi-Entscheidung.

### Privacy Rules

1. Cloud-AI-Calls (Anthropic) sind nur über `anthropic-proxy` Edge
   Function erlaubt, nicht direkt aus dem Frontend.
2. Pseudonymisierung vor jedem Cloud-AI-Call: Pferdenamen, Personen-
   namen, Adressen werden zu Tokens (`HORSE_42`, `PERSON_17`).
3. `hufi_context_log` speichert den Snapshot *vor* Pseudonymisierung
   nur lokal (in DB, kein Cloud-Egress).
4. Lokale Ollama-Fallback-Pfade dürfen ungefiltert sein (kein Cloud-
   Egress).
5. `legal_agreements.version` muss vor jedem KI-Touch akzeptiert sein.

### AI Escalation Rules

```
Severity 1 (Info)        → silent log
Severity 2 (Suggestion)  → in-app notification, no push
Severity 3 (Action proposed) → approval card, push optional
Severity 4 (Urgent)      → push notification, banner, approval required
Severity 5 (Emergency)   → bypass approval, log, notify all caregivers,
                            human-in-the-loop sofort einbeziehen
```

`dringend_tierarzt`-Flag aus `hufi-ai-voice-finding` sollte heute
schon Severity 4 entsprechen — aktueller Code liefert nur einen
boolean, keine Severity-Kategorie. Soll: Severity-Layer einbauen.

---

## 5. Hufi Memory Architecture

### Heute (existing already)

- `hufi_memory` Tabelle (kein `CREATE TABLE` im Repo, nur `as any`-
  Zugriff): kategorisiert key/value, 7 Kategorien,
  `confidence`/`source`/`expires_at`-Felder. Verwendet in
  `hufi-brain.ts`.
- `hufi_memories` Tabelle (gleiche Provenance-Lücke): Markdown-Archiv
  mit 4 `memory_type`-Werten, append/replace-Modi, optional `horse_id`.
  Verwendet in `hufi-memory.ts`.
- `equine_ontology` als Wissensbasis.

**Konflikt:** Zwei parallele Memory-Modelle ohne klare Abgrenzung.
Beide ohne Repo-Migration (siehe `HUFI_VERIFICATION_AUDIT.md` §2,
Risiko MEDIUM).

### Future Target — 6-Schichten-Memory

| Schicht | Inhalt | Gehört wem? | Retention | Lokalisierung |
|---|---|---|---|---|
| **system_memory** | Ontologie, Glossar, Standards | global | unbegrenzt | DB |
| **org_memory** | Geschäfts-Routinen, Plan-Tier | Organization | unbegrenzt | DB, RLS per Org |
| **horse_memory** | Pferd-eigenes Gedächtnis | das Pferd | unbegrenzt; Soft-Delete bei `horse.archived` | DB, RLS per `horse_caregivers` |
| **user_memory** | persönliche Routinen, Präferenzen | Person | unbegrenzt | DB, RLS per `auth.uid()` |
| **relation_memory** | was Akteur über Pferd weiß | `(horse_id, user_id, role)`-Tupel | aktiv solange Caregiver-Beziehung lebt | DB, RLS per Akteur+Pferd |
| **session_memory** | React-State, ungespeicherte Eingabe | aktuelle Session | bis Page-Reload | RAM + `idb-keyval` |

### Migration-Plan für die heutigen Memory-Tabellen

Vor jedem Code-Eingriff: Schema-Provenance herstellen (siehe
`HUFI_VERIFICATION_AUDIT.md` Recommended Next Step).

| Heute | Wird | Wie |
|---|---|---|
| `hufi_memory` (kategorisiert key/value) | aufgespalten in `user_memory` (alle nicht-pferd-spezifischen Kategorien) und `horse_memory` / `relation_memory` (alle pferd-spezifischen) | Migration: SELECT mit horse_id-Bedingung → split |
| `hufi_memories` (Markdown pro `(user_id, memory_type, horse_id)`) | wird zu `horse_memory.markdown_log` (für `pferdeakte`/`pferdebusiness`/`pferdemensch`) und `user_memory.markdown_notes` (für `hufi_notizen`) | gleiche Logik, anderes Ziel-Schema |

### Retention-Strategie

| Schicht | Default-TTL | Soft-Delete? | Vergessen-Trigger |
|---|---|---|---|
| system_memory | unbegrenzt | nein | – |
| org_memory | bis Org-Schließung | ja | `organization.archived` |
| horse_memory | bis Pferd-Tod | ja | `horse.archived` mit 90-Tage-Frist |
| user_memory | bis Account-Schließung | ja | `auth.user.deleted` |
| relation_memory | aktiv solange Caregiver | ja | `caregiver.removed` plus 30 Tage |
| session_memory | Page-Reload | nein | – |

**DSGVO-Right-to-be-Forgotten:** explizit über `user_memory.deleted_at`
und `relation_memory.deleted_at` plus harte Löschung nach 30-Tage-Frist.

### Audit-Strategie

Jede Memory-Schreib-Operation landet in `hufi_context_log` mit:
- `memory_layer` (system/org/horse/user/relation)
- `operation` (create/update/delete)
- `actor_id` (wer hat es ausgelöst)
- `source` (voice/manual/system/ai)
- `before_value`, `after_value` (für Rollback)
- `explanation` (warum)

### Summarization-Strategie

Memory wächst. Pro Schicht:
- **horse_memory:** alle 30 Tage Auto-Summarization-Job (System-Agent),
  der ältere Einträge in einem Markdown-Brief zusammenfasst.
  Originale werden archiviert, nicht gelöscht.
- **user_memory:** ähnlich, aber pro 90-Tage-Fenster.
- **relation_memory:** kürzer (14-Tage-Fenster), weil flüchtiger.

### Semantic Search

Heute: `equine_ontology` mit Levenshtein-Distance plus 3-Stufen-Suche
in `hufi-search.ts`.

Soll: `pgvector`-Extension nutzen, Embeddings für `horse_memory.value`
plus `equine_ontology.term` plus `horse_timeline.event_text`.
Semantische Suche pro Pferd ("zeig mir alle Befunde, die nach
Strahlfäule klingen") und pro Akteur ("welche Pferde haben
Hufrolle-Symptome").

`pgvector`-Verfügbarkeit auf Supabase Pro: ja (Standard). Heutige
Nutzung im Repo: keine `embedding`-Spalten gefunden `[?]`.

---

## 6. Voice + Chat Architecture

### Heute (existing already)

- `HufiVoiceModal.tsx` mit MediaRecorder (webm) → Whisper lokal
  (Port 5000).
- `hufi-ai-voice-finding` Edge Function: ElevenLabs STT + Claude
  Haiku → strukturiertes Befund-JSON (`befund_text`, `massnahme`,
  `huf_werte`, `dringend_tierarzt`).
- `useHufChat` mit Realtime, Presence, Voice-Messages, File-Upload,
  Reactions, Reply-To, 24h-Delete-Window.
- Tabellen: `horse_chat_channels`, `horse_chat_messages`,
  `partner_messages`, `employee_team_messages`,
  `partner_conversations`, `admin_messages`.

### Future Target

#### Voice-First Workflows

| Workflow | Heute | Soll |
|---|---|---|
| Befund-Aufnahme im Stall | `Aufnahme.tsx` + Voice-Modal + `hufi-ai-voice-finding` | unverändert, plus Severity-Layer |
| Termin-Notiz beim Fahren | `tour_breadcrumbs` plus manuelles Eintragen | Voice-Befehl ("nach Termin Hela: Hufgeschwür links vorne") → strukturiertes Update |
| Schnell-Terminabschluss | nicht vorhanden | Voice-First → 3-Minuten-Bestätigung |
| Chat-Voice-Message | `useHufChat` mit `voice_url` | unverändert |
| Hufi-Befehl ("Hufi, plane Tour von morgen") | nicht vorhanden | Voice → Intent → Tour-Vorschlag → Approval |
| Voice-TTS Antwort | nicht vorhanden | optional, Pascal-Entscheidung |

#### Chat-First Workflows

| Workflow | Heute | Soll |
|---|---|---|
| Provider ↔ Client | `horse_chat_channels` per Pferd-Kanal | Pferd-Kanal als Default für Pferd-bezogene Themen |
| Provider ↔ Vet | `partner_messages` plus `horse_chat_*` | konsolidieren: ein Pferd-Kanal mit Permission-Filter |
| Stall-weiter Channel | nicht spezifisch | dedizierter `stable_channel` pro Stall |
| Hufi-Bot-Identität | nicht vorhanden | `hufi-system` als pseudo-User in Chats, mit eigener Identität |

#### Realtime-Architektur

- **Heute:** Supabase Postgres Changes + Presence Channels in
  `useHufChat`.
- **Soll:** zusätzlich `events`-Tabelle als Realtime-Source — UI
  abonniert events mit `horse_id`-Filter und sieht alle Aktivitäten am
  eigenen Pferd live.

#### Horse Channels

```
horse_chat_channels
  │
  ├── default (alle Caregivers, gefiltert per Permission)
  ├── medical (nur Provider, Vet, Physio, Owner)
  ├── billing (nur Provider, Owner)
  └── emergency (alle Caregivers, force-push)
```

Heute: nur ein Channel pro Pferd. Soll: mehrere Sub-Channels.

#### Actor Channels

Direktnachrichten zwischen zwei Personen — heute über
`partner_messages` etc. fragmentiert.

Soll: ein einheitliches `direct_messages`-Modell pro `(person_a, person_b)`-
Tupel.

#### AI Participation Rules

Hufi spricht in Channels:

| Wo | Heute | Soll |
|---|---|---|
| Pferd-Channel `default` | nein | ja, als Vorschlag-Bot, alle 24-48h max. ein Eintrag |
| Pferd-Channel `medical` | nein | ja, mit Disclaimer "kein medizinisches Urteil" |
| Pferd-Channel `billing` | nein | nein, sensible Zahlendaten |
| Pferd-Channel `emergency` | nein | ja, mit Notfall-Anleitung |
| Direktnachrichten | nein | nein |
| Stall-Channel | nein | ja, mit Provider-Vorschlägen |

Hufi schweigt:

- in Direktnachrichten zwischen zwei Personen
- bei aktiven Streit-/Eskalations-Threads
- in `billing`-Channel
- nach mehrfachen "stop"-Reactions

#### Approval Flows

```
User-Voice ("Hufi, lege Termin morgen 10:00 für Hela an")
   → STT → Intent (`agent_action`)
   → Context-Resolution (Hela = horse_id 42)
   → Brain proposes Termin-Draft
   → Approval-Card im UI:
      "Hufi schlägt vor: Termin Hela morgen 10:00.
       [Annehmen] [Anpassen] [Ablehnen]
       Warum dieser Vorschlag? → Tour-Lücke 9-12, Hela 8 Wochen
       überfällig."
   → User klickt Annehmen
   → Action-Execution: Termin in DB, Audit, Notification an Owner
   → Voice-/Chat-Bestätigung: "Termin Hela morgen 10:00 angelegt."
```

#### Voice-to-Structured-Data Pipeline

Heute (existing already):
```
WebM Audio → POST /api/local-ai/transcribe (Whisper)
           → Plain-Text Transkript
           → POST /functions/v1/hufi-ai-voice-finding
           → Claude Haiku mit Strukturier-Prompt
           → JSON { befund_text, massnahme, huf_werte, dringend_tierarzt }
           → ai_befunde Insert (mit horse_id)
```

Soll (future target):
```
... wie heute, plus:
           → Ontology-Recognition (`ontology-service`)
           → ergänzt JSON um anerkannte Begriffe
           → Severity-Klassifikation
           → events.insert({type: 'befund.recorded' or '.urgent'})
           → fanout: alle Caregivers mit Permission `read_medical`
           → bei Severity ≥ 4: zusätzlich Approval-Pfad für Tierarzt-Ruf
```

---

## 7. Approval Architecture

### Heute (existing already)

- `hufi-actions.ts` mit `explanation`-Feld als Skelett
- Notifications werden gesendet, aber kein zentraler Approval-Flow
- `hufi_context_log` für Audit
- DSGVO-Modale (`KiHinweisModal`, `DsgvoConsentModal`)

**Lücke:** Kein Approval-Queue, keine Approval-Card-UX, kein Undo-
Pattern pro Action.

### Future Target

#### Approval Queue

```
hufi_approvals
  id, type, horse_id, actor_id, requested_by (system/per-horse-agent),
  payload (proposed action),
  explanation,
  context_snapshot_id (FK to hufi_context_log),
  status (pending/approved/rejected/expired),
  decision, decision_reason,
  approved_by, approved_at, expires_at,
  undo_token, undo_expires_at
```

#### UX-Pattern

```
┌─────────────────────────────────────────────────┐
│ 💡 Hufi schlägt vor                              │
│                                                  │
│ Termin Hela morgen 10:00 anlegen                │
│                                                  │
│ Warum?                                          │
│ - Tour-Lücke 9-12 morgen                       │
│ - Hela 8 Wochen überfällig (avg 6)              │
│ - 5 km Anfahrt, kein Konflikt                   │
│                                                  │
│ [✓ Annehmen]  [✎ Anpassen]  [✗ Ablehnen]        │
│                                                  │
│ Quelle: Per-Horse-Agent · Severity 2            │
│ Diese Aktion ist nach Annahme 60 Min undo-bar.  │
└─────────────────────────────────────────────────┘
```

### Klassifikation

#### Safe Autonomous Actions (kein Approval)

- Reminder erstellen (in-app, push)
- Tagesbriefing zusammenstellen
- Risiko markieren (nicht versenden)
- Memory-Updates aus eigenen Voice-Eingaben
- Anomalie-Erkennung loggen
- Pseudo-anonymisierte Cross-User-Insights aktualisieren

#### Approval-Required Actions

- Termin erstellen / verschieben / absagen
- Rechnung versenden
- E-Mail an Kunden senden (nicht: in-app Nachricht)
- Mahnung versenden
- Behandlungsplan finalisieren (Tierarzt)
- Befund mit `dringend_tierarzt`-Flag persistieren
- Zugriff erteilen / entziehen
- Plan-Tier-Wechsel
- Kostenpflichtige externe Aktion (z. B. SMS-Versand)

#### Forbidden Autonomous Actions

> Diese Aktionen darf Hufi **niemals**, auch nicht mit Approval.

- Medizinische Diagnose stellen ("Pferd hat Strahlfäule")
- Medikament verschreiben
- Pferd-Daten an externe APIs senden ohne Owner-Consent
- Zahlungen auslösen
- Account-Operationen (Löschung, Plan-Wechsel)
- Massen-Operationen (>10 Datensätze auf einmal)
- Aktionen außerhalb der eigenen Permission-Matrix
- Trainingsdaten-Sammeln für Cloud-AI ohne explizites Opt-In

### Escalation-Pfad

```
Approval expires (nach 24h ohne Reaktion):
  ├── Severity 1-2: silent timeout, in audit als 'expired'
  ├── Severity 3:   reminder push nach 12h, dann timeout
  ├── Severity 4:   eskaliert an alle berechtigten Caregivers
  └── Severity 5:   Notfall-Pfad, sofort an alle, plus Owner-SMS [?]
```

### Undo / Revert

- Jede Approval-bestätigte Aktion erhält ein `undo_token` mit
  60-Min-Expiry.
- Undo schreibt eine kompensierende Aktion (Termin → cancelled,
  Rechnung → storniert, Email → recall-Event).
- Undo selbst wird in `hufi_context_log` audited.

### Audit

- Jede Approval-Entscheidung: `hufi_approvals.status` wechselt,
  Eintrag in `hufi_context_log` mit `decision_reason`.
- Jede ausgeführte Aktion: zusätzlich domain-Audit (z. B.
  `appointments`-history-Eintrag).

---

## 8. Frontend Philosophy

### Heute

- 102 Pages, fragmentiert nach Rolle.
- 21 Portal-Submodule, 11+ davon Stubs (siehe
  `HUFI_VERIFICATION_AUDIT.md` §4).
- Drei separate Dashboards (Provider, Employee, Client).
- Fünf Admin-Pages.
- Subdomain-Routing für 4 Modi.
- Mobile-First-Anteile vorhanden (`use-mobile`,
  `MobileShell`, `MobileBottomNav`), aber nicht durchgehend.

### Future Target — Cockpit-Pattern

#### Hufi Today

> Eine UI-Page pro Akteur, die zeigt, was Hufi heute schon vorbereitet
> hat. Sie ersetzt das fragmentierte "öffne Anfragen, dann Kalender,
> dann Touren"-Pattern.

```
┌───────────────────────────────────────────────────────────┐
│ Heute · 8. Mai 2026 · Hela ·  3 Pferde, 2 Termine         │
│                                                            │
│ 🔔 4 Vorschläge von Hufi:                                  │
│  - 1 Termin vorschlag (Hela morgen 10:00)                  │
│  - 2 Befunde überfällig (Foto-Upload erinnern)             │
│  - 1 Lead heiß (BHS BALANCE Tier)                          │
│                                                            │
│ 📅 2 Termine heute:                                        │
│  - 09:00 Sissy bei Müller (5 km)                          │
│  - 14:00 Bavaria bei Schmidt (Tourmodus)                  │
│                                                            │
│ 💬 3 Nachrichten ungelesen                                 │
│                                                            │
│ ⚠️ 1 Risiko-Marker:                                        │
│  - Pferd "Lou" 12 Wochen ohne Termin (overdue)             │
│                                                            │
│ [Tour vorbereiten] [Anfragen öffnen] [Aufnahme starten]    │
└───────────────────────────────────────────────────────────┘
```

#### Manual Override

- Jeder Hufi-Vorschlag ist ablehnbar.
- Jede AutoFlow-Aktion ist konfigurierbar (an/aus pro Provider).
- Jeder KI-Touch hat ein "warum?"-Tooltip plus DSGVO-Erklärung.
- Kein Vorschlag wird ohne Akteurs-Eingriff bindend.

#### Role-Aware Interfaces

| Rolle | Cockpit-Inhalt |
|---|---|
| Provider | Tagesplan, Anfragen, Risiko-Marker, Lead-Pipeline, Cashflow-Status |
| Client | Pferd-Status, nächste Termine, Nachrichten, Foto-Upload-Aufforderung |
| Vet | Behandlungs-Pipeline, GOT-Vorlagen, ungelesene Befunde, Impf-Reminder |
| Stable | Stall-Pferde, Anfragen-Triage, Provider-Auswahl, Termin-Konflikte |
| Employee | Tour heute, nächstes Pferd, Befund-Vorlagen |
| Admin | Mission-Control, Anomalie-Alerts, neue Provider, Plan-Tier-Drift |

#### Mobile-First Stable Workflows

- Voice-First-Eingang im Stall (Lärm, Hände voll).
- Foto-Upload mit "drei Klicks": Aufnahme → Pferd-Tag → Speichern.
- Termin-Bestätigung in einem Tipp.
- Offline-First mit `idb-keyval` Sync (existiert bereits).

### Was verschwinden sollte

| Heute | Empfehlung |
|---|---|
| 11+ Portal-Stub-Pages (`demos/*`, `modules/*`) | archivieren |
| 6 öffentliche Demo-Logins (heute versteckt via Flag) | später ganz entfernen, Demo-Account in Admin-Bereich verschieben |
| 3 separate Dashboard-Pages | konsolidieren auf ein "Hufi Today" pro Rolle |
| 65 hartkodierte `hufmanager`-Strings | siehe `ROADMAP.md` P1, klassifizieren statt Massen-Replace |
| Email-Pattern-Routing | abgelöst durch Erweiterung von `app_role` ENUM |
| Subdomain-Modi `insurance`/`marketplace`/`veterinary` | auditieren, ob es echte Nutzer gibt — sonst archivieren |

### Was bleibt

| Bereich | Begründung |
|---|---|
| `useHufChat` | Realtime-Layer ist solides Asset |
| `HufiVoiceModal` | Voice-First-Stallpraxis-Asset |
| `MobileShell` + `MobileBottomNav` | Mobile-First-Foundation |
| `Aufnahme.tsx` | Voice-First-Befund-Pfad |
| Provider-Core (Anfragen, Kalender, Pferde, Kunden, Rechnungen, Tour) | operativ produktiv |
| Vet-Portal-Suite (`VetSOAPForm`, `VetGOTRechner`) | Domain-spezifisch wertvoll |
| Botschafter-Pages (Galerie, Bewerben) | sofern Affiliate-Strategie weiterläuft `[?]` |

---

## 9. Legacy vs. Future

| Bereich | Datei / Tabelle | Heute | Strategische Einordnung | Aktion |
|---|---|---|---|---|
| `horses.owner_id` single-owner | `horses` | Pflicht | Blocker für Multi-Owner-Vision | **refactor** zu `horse_owners` Junction |
| `horses.provider_id` Pflichtfeld | `horses` | Pflicht | Provider-zentrisch | **refactor** — Pferd kann ohne Provider existieren (Owner-only) |
| 4 Access-Tabellen (`access_grants`, `horse_partner_access`, `stall_horse_access`, `employee_horse_access`) | mehrere Migrations | aktiv | Fragmentation | **refactor** zu konsolidiertem `horse_caregivers` |
| `app_role` ENUM (2 Werte) | Migration `20251203110750` | aktiv | Datenmodell-Lüge | **refactor** auf 8 Werte |
| `hufi_memory` (kein Migration-Schema) | – | aktiv | Schema-Provenance fehlt | **erst dokumentieren, dann refactoren** |
| `hufi_memories` (kein Migration-Schema) | – | aktiv | gleich | gleich |
| Email-Pattern-Rollen | `lib/portal-user-detect.ts` | aktiv | Sicherheits-/UI-Drift | **archive** nach Rollen-ENUM-Erweiterung |
| Auto-Repair in `useAuth.tsx` | `src/hooks/useAuth.tsx:50-77` | aktiv | LOW-Risiko | **keep** — Convenience für recovered users |
| 21 Portal-Submodule | `App.tsx:338+` | 8 real, 11+ stub | Wartungslast | **archive** demos/, modules/ |
| 6 Demo-Logins | `Auth.tsx`, `setup-demo-accounts` | heute versteckt (`SHOW_DEMO_LOGIN=false`) | Recovery-Done | **remove later** — nach Stabilisierung Demo-Path entfernen |
| 65 `hufmanager`-Strings in `src/` | verstreut | aktiv | Branding-Drift | **classify** (Roadmap P1), keine Massen-Replace |
| Botschafter-System | `botschafter_*` Tabellen, mehrere Pages | aktiv `[?]` | Affiliate-Programm | **verify with Pascal** |
| `ecosystem_*`-Tabellen | mehrere Migrations | aktiv `[?]` | Multi-Hufi-Sync-Pattern | **verify with Pascal** — ggf. strategisches Asset für White-Label |
| `MiniHufManager` (`minihufmanager.assaon.com`) | Nginx-Site, antwortet HTTP 000 | konfiguriert, broken | unklar | **verify with Pascal** — reaktivieren oder Nginx-Site abräumen |
| `_archiv_hufmanager_20260425/` | `/var/www/` | Archiv | Disk-Headroom | **remove later** bei Disk-Druck > 80% |
| `hufmanager-bridge/` | `/var/www/` | unbekannt | unklar | **verify with Pascal** |
| AutoFlow-Engine | 4 Edge Functions, `autoflow_log` | aktiv | strategisches Asset | **keep + extend** |
| `equine_ontology` | Tabelle + Service | aktiv | strategisches Asset (10-Jahres) | **keep + extend** |
| `ai-routing.ts` Credit-System | aktiv | strategisches Asset | **keep + extend** |
| `notification-scheduler` | aktiv | strategisches Asset | **keep + extend** |
| `hufi_context_log` | aktiv | strategisches Asset (EU AI Act) | **keep + extend** |
| `legal_change_*`-Familie | aktiv | strategisches Asset | **keep** |
| `useHufChat` | aktiv | strategisches Asset | **keep + extend** |
| Voice-Pipeline (Whisper + ElevenLabs + Claude) | aktiv | strategisches Asset | **keep + extend** |
| copecart-webhook ohne Replay-Schutz | aktiv | dangerous | **fix nach Schema-Doku** (Audit MEDIUM) |
| `app_role`-Auto-Repair | useAuth.tsx | aktiv | dangerous-by-design `[?]` für künftige Rollen | **document** + **review on role expansion** |

---

## 10. Migration Strategy

> **NICHTS davon ist eine Implementierungsanweisung.** Das ist eine
> Reihenfolge mit Abhängigkeiten. Pascal entscheidet pro Schritt
> separat, ob er gegangen wird.

### P0 — Recovery-Pause-Stabilität

> Was *zuerst* erledigt sein muss, bevor irgendeine Architektur-Arbeit
> beginnt.

1. **Schema-Provenance** für `hufi_memory` und `hufi_memories`
   herstellen (siehe Audit Recommended Next Step). Read-only Auslesen,
   `CREATE TABLE IF NOT EXISTS`-Migration als Repo-Versionierung.
2. **Replay-Protection** für `copecart-webhook` — Idempotenz für
   `admin_revenue_log`, Header-Timestamp-Check.
3. **PWA-/Mobile-Nav-Verifikation** abschließen (`ROADMAP.md` P1).
4. **Auth-Test** auf `app.hufmanager.de` (`ROADMAP.md` P1).

### P1 — Foundation für Architektur-Arbeit

> Was möglich ist, sobald P0 fertig ist.

5. **Cron-Setup** für alle Edge Functions im Repo dokumentieren oder
   auditieren — wann läuft was, wer hat es konfiguriert (`[?]`).
6. **`app_role` ENUM erweitern** auf 8 Werte (`provider`, `client`,
   `admin`, `employee`, `partner`, `stable`, `trainer`, `insurer`)
   plus Migration für bestehende User-Roles. **Erst Rollen-ENUM,
   dann alles andere** — sonst sind alle weiteren Schritte
   nicht abbildbar.
7. **`horse_owners` Junction-Table einführen** — Multi-Owner-
   Fundament. Migration mit `INSERT INTO horse_owners SELECT id,
   owner_id, 'primary', ...`. `horses.owner_id` bleibt zunächst
   redundant für Backward-Compatibility, wird später entfernt.
8. **`horse_caregivers` Konsolidierung** — neue Tabelle, Daten-
   Migration aus `access_grants` + `horse_partner_access` +
   `stall_horse_access` + `employee_horse_access`. Alte Tabellen
   bleiben **physisch als Schreib-Ziele**, werden zusätzlich aus
   `horse_caregivers` synchronisiert (oder umgekehrt) — `INSTEAD OF`-
   View-Trigger sind eine Option, aber technisch nicht trivial und
   müssen separat geprüft werden `[?]`. Backward-Compatibility hat
   Vorrang vor Eleganz.
9. **`events`-Tabelle einführen** — als Append-Only Event-Bus.
   Bestehende Audit-Tabellen bleiben als Views/Filter auf events.
10. **`horse_timeline` einführen** — als kombinierte Sicht aus events
    pro Pferd, gefiltert per Permission.
11. **`horse_state` einführen** — persistenter Pferd-Status, per
    Trigger aus `events` aktualisiert.
12. **Memory-Konsolidierung**: `user_memory` (aus
    nicht-pferd-Kategorien von `hufi_memory`) + `horse_memory` (aus
    `hufi_memories.horse_id` plus pferd-spezifische `hufi_memory`-
    Kategorien) + `relation_memory` (neu).

### P2 — Hufi Brain

13. **Per-Horse-Agent** — Edge Function, die durch einen Worker oder
    Cron-Job auf neue `events` reagiert (DB-Trigger können Edge
    Functions nicht direkt aufrufen — der Worker liest `events` mit
    `status='pending'` und dispatched). Pro `horse_id` Context
    resolved, Vorschläge erzeugt, in `hufi_approvals` einreiht.
14. **Approval-Queue** — `hufi_approvals`-Tabelle plus UI-Card-Pattern.
15. **Severity-Layer** — alle KI-Outputs erhalten Severity 1-5.
16. **`pgvector` für semantische Suche** — Embeddings auf
    `horse_memory.value` und `horse_timeline.event_text`.
17. **Pseudonymisierungs-Layer** — vor jedem Cloud-AI-Call werden
    Pferdenamen/Personennamen tokenisiert.
18. **Hufi-Today-Dashboard** als ein Cockpit pro Rolle.
19. **Per-Actor-Agent / Per-Org-Agent** — als zusätzliche Listener
    auf `events`.

### PARKED — Dinge, die NICHT zu früh gebaut werden dürfen

- Stimmerkennung pro Person (`PASCAL_CONTEXT.md` Nicht-Ziel).
- Autonome Mahnung-Versendung.
- Autonome Kunden-E-Mail-Versendung.
- Branding-Migration weg von HufManager.
- Per-Pferd-Agent als autonomer Bot (ohne Approval-Gate).
- Cloud-AI-Training mit Pferdedaten ohne Pseudonymisierungs-Layer.
- Zweite Hufi-Codebase.
- Öffentliche Kommunikation des 2030-Big-Picture.
- Multi-Tenant-White-Label vor sauberer Memory-Architektur.

### Abhängigkeitsgraph

```
P0 (1, 2, 3, 4)
  │
  ▼
P1.5 (Cron-Setup-Audit)
  │
  ▼
P1.6 (app_role ENUM erweitern)        ◄── Foundation
  │
  ├──────────────────────────────────────┐
  │                                       │
  ▼                                       ▼
P1.7 (horse_owners)              P1.8 (horse_caregivers)
  │                                       │
  └────────────┬──────────────────────────┘
               │
               ▼
       P1.9 (events) + P1.10 (horse_timeline) + P1.11 (horse_state)
               │
               ▼
       P1.12 (Memory-Konsolidierung)
               │
               ▼
       P2.13 (Per-Horse-Agent) ── braucht events + horse_memory
               │
               ├── P2.14 (Approval-Queue)
               │      │
               │      ▼
               │   P2.15 (Severity)
               │
               ├── P2.16 (pgvector)
               ├── P2.17 (Pseudonymisierung)
               ├── P2.18 (Hufi-Today)
               └── P2.19 (Per-Actor-/Per-Org-Agent)
```

### Was muss zuerst passieren

**P0.1 — Schema-Provenance.** Solange das Memory-Schema nicht im Repo
versioniert ist, ist jeder weitere Schritt Spekulation.

### Was darf nicht zu früh passieren

- **Keine `horses.owner_id`-Entfernung**, bevor `horse_owners`
  produktiv geschrieben *und* gelesen wird.
- **Keine `app_role`-ENUM-Erweiterung ohne Migration der bestehenden
  Auto-Repair-Pfade** (sonst rutschen User in `'client'`-Fallback).
- **Kein Per-Horse-Agent ohne Approval-Queue** — sonst werden
  Vorschläge ungefiltert ausgeführt.
- **Keine Cloud-AI-Training-Pipeline ohne Pseudonymisierungs-Layer**.
- **Keine semantische Suche ohne RLS-Filter auf Embeddings** —
  pgvector-Cosine-Distance umgeht Standard-RLS, eigene Filter-Schicht
  notwendig.

---

## 11. The Real Hufi Endgame

> Wie sieht Hufi 3-5 Jahre nach erfolgreicher Architektur-Umsetzung
> aus? Keine Marketing-Sprache. Konkretes Bild.

### Operating Model

- **Kern-Identität:** Hufi ist die Software, durch die Pferde-bezogene
  Arbeit zwischen mehreren Menschen koordiniert wird. Sie wird
  täglich genutzt von Hufpflegern (B2B-zahlende Nutzer),
  Pferdebesitzern (kostenlose Sicht), Tierärzten/Therapeuten/
  Stallbetreibern (Ecosystem-Akteure).
- **Geschäftsmodell:** B2B-Subscription (Hufpfleger zahlen pro Plan-Tier
  über CopeCart) plus optional Premium-Features für Pferdebesitzer und
  Stallbetreiber. Tierärzte können kostenlos teilnehmen oder
  Premium-Werkzeuge buchen (GOT-Rechner, PMS-Sync).
- **B2C-Layer:** Pferdebesitzer haben kostenlose Pferd-Akte, Ecosystem-
  Sichtbarkeit, Termin-Erinnerungen — finanziert durch B2B-Schiene.
- **Plattform-Layer:** Multi-Hufi-Instanzen via `ecosystem_*`-Pattern
  (heute angedeutet, künftig real) — White-Label für andere
  Pferdesport-Brands oder spezielle Märkte (Sportpferde, Trab, Western).

### Human-AI-Interaction Model

- **Hufi spricht nur, wenn es einen Vorschlag hat.** Keine UI-Bot-
  Begrüßungen, kein "Hi, ich bin Hufi". Hufi ist ein still arbeitender
  Helfer.
- **Vorschlag → Approval → Aktion → Audit.** Jede sensible Aktion läuft
  durch diesen Loop. Keine Ausnahmen.
- **Voice-First im Stall** (Hände voll, Lärm, Bewegung), Chat-First am
  Schreibtisch (Detail-Antworten, Listen).
- **Hufi vergisst nie** — Memory ist pferd-zentriert, retentions-
  gesteuert, summarisiert ältere Einträge automatisch.
- **Hufi erklärt sich** — jeder Vorschlag hat ein "warum"-Tooltip mit
  Quellen-Verweis (welches Event hat den Vorschlag ausgelöst, welcher
  Memory-Eintrag wurde benutzt, welche Severity).
- **Hufi macht Fehler sichtbar** — Halluzinationen sind möglich, daher
  hat jedes KI-Output ein "richtig?"-Daumen-Hoch/-Runter-Pattern, das
  in `hufi_feedback` landet und das Brain-Reasoning verbessert.

### Horse Lifecycle Model

```
horse.created (Geburt / Erwerb)
  ├── caregivers.add (primary owner, evtl. co-owner, initial provider)
  ├── horse_state initialisiert
  └── horse_memory pseudo-leer mit Stammdaten

horse.active (operativer Alltag)
  ├── events: Termine, Befunde, Fotos, Behandlungen, Transfers
  ├── horse_state per Trigger aktualisiert
  ├── horse_memory wächst mit jedem Event
  ├── horse_timeline ist die Append-Only-Wahrheit
  ├── caregivers wechseln (Stallwechsel, neuer Tierarzt, Verkauf)
  ├── owner-Wechsel über horse_owners.transfer
  └── Per-Horse-Agent läuft kontinuierlich

horse.archived (Tod / Verkauf außerhalb Hufi-Welt)
  ├── horse_state freezed
  ├── horse_memory in Read-Only mit 90-Tage-Soft-Delete
  ├── caregivers.deactivate
  ├── horse_timeline bleibt für Audit
  └── DSGVO-Lösch-Pfad nach 90-Tage-Frist
```

### Ecosystem Model

- **Ein Pferd, mehrere Akteure** ist das Fundament.
- **Jede Beziehung braucht expliziten Consent** (`partner_data_consents`-
  Pattern, heute bereits angelegt).
- **Cross-Provider-Insights** sind möglich (anonymisiert), wenn der
  Owner zustimmt. Beispiel: "Pferde mit ähnlichem Beschlag-Intervall
  in deiner Region haben X Probleme".
- **External APIs:** Wetter, Geo-Routing, Tier-Pass-Verifikation,
  potenziell Veterinär-PMS-Sync (`sync-vet-pms` heute schon vorhanden).
- **White-Label-Pattern via `ecosystem_*`-Tabellen:** mehrere Hufi-
  Instanzen können sich austauschen (z. B. Hufi-Reining-Edition syncs
  mit Haupt-Hufi für gemeinsame Pferd-Datenbasis).

### Trust Model

- **Audit-everything:** jede Aktion landet in `hufi_context_log` mit
  Explanation. Pascal kann jederzeit zurückverfolgen "warum hat Hufi
  das vorgeschlagen?".
- **No-secret-leakage:** Anthropic-Proxy als Edge Function, keine
  API-Keys im Frontend. Pseudonymisierungs-Layer vor Cloud-Calls.
- **Right-to-be-Forgotten** ist über User-/Pferd-Lösch-Pfade real
  umgesetzt — nicht "irgendwann mal".
- **Local-First-Option:** sensible Befund-Vorklassifikation kann auf
  lokaler Ollama laufen statt Cloud — Pascal entscheidet pro Workflow.
- **Trust-Stages:** ein neuer Hufi-Nutzer fängt mit eingeschränkten
  KI-Funktionen an, gewinnt mit Nutzung Zugriff auf mehr (z. B.
  AutoFlow nach 30 Tagen aktiver Nutzung).

### Compliance Model

- **DSGVO:** versionierte `legal_agreements`, `consent_log`,
  `partner_data_consents`. Right-to-be-Forgotten via Lösch-Pfade.
- **EU AI Act:** Severity-Klassifikation pro KI-Feature, Explanation-
  Felder, Auditierbarkeit, Approval-Pfade für sensible Aktionen.
  Plausible Klassifikation `[?]`: die meisten Features (Chat, Tour-
  Optimierung, Befund-Vorschläge) wirken wie "Limited Risk",
  medizinisch-eingreifende Vorschläge eher wie "High Risk" mit
  Approval-Queue und Disclaimer-Pflicht. **Verbindliche Einordnung
  muss durch Anwalt erfolgen** — diese Architektur trifft keine
  rechtliche Aussage.
- **Tierarznei-Mittel-Recht:** Hufi schlägt nie konkrete Medikamente
  vor — nur Tierarzt-Konsultation als Aktion.
- **Tierhalterhaftpflicht:** dokumentierter Befund-Pfad inkl. Foto-
  Beweis ist Versicherungs-fähig (potenzielles Asset für
  Versicherer-Cross-Sell).

### Business Moat

> Was macht Hufi schwer zu kopieren?

1. **Equine Ontology als Domain-Sprach-Asset** — Aufbau dauert Jahre,
   nicht Monate. Konkurrent muss eigene Pferd-Sprach-DB bauen oder
   schlechter sein.
2. **Audit + Compliance-Reife** — EU AI Act bringt Mitbewerber unter
   Zugzwang; Hufi hat das eingebaut.
3. **Multi-Akteur-Pattern um das Pferd** — Konkurrent baut entweder
   für B2B (Hufpfleger) ODER B2C (Besitzer). Hufi macht beides
   gleichzeitig mit Permission-Matrix.
4. **Voice-First-Stallpraxis** — wenige Wettbewerber bauen wirklich
   für laute Stallumgebungen mit Hände-voll-Bedienung.
5. **Memory-Layer pro Pferd** — wenn es einmal gefüllt ist, ist der
   Wechsel auf Konkurrenten teuer (Lock-In, aber freundlich:
   Export-Pfad muss DSGVO-konform sein).
6. **Pascal-Praxis-Authentizität** — Barhufserviceschmid als
   Praxislabor liefert echte Anforderungen, kein Marketing-Pferd.
7. **Ecosystem-Effekt** — Tierärzte und Stallbetreiber sind
   produktiv mit Hufi → Hufpfleger müssen Hufi nutzen, um anschluss-
   fähig zu sein.

### Was Hufi explizit *nicht* wird

- Kein generisches "AI-Tool für Pferde" mit Marketing-Buzzwords.
- Kein autonomes Bot, das Aktionen ohne Mensch-Approval ausführt.
- Keine Fitness-/Tracker-App.
- Kein Pferdezucht-/Genetik-Tool.
- Kein Marktplatz für Pferdeverkauf (auch wenn `markt.hufiapp.de`
  Subdomain existiert — das ist Demo-Stub `[?]`).
- Keine reine Buchhaltungs-/Steuer-Software.

---

## HufAI — Intelligenz-Phasen (Nachtrag 2026-05-11)

**HufiApp** = Shell / Gerät / Workflow-Oberfläche.
**HufAI** = Kernprodukt — die Intelligenzschicht dahinter.

| Phase | Name | Status |
|---|---|---|
| A–C | Voice Greeting, Push-to-Talk, Navigation Actions | ✅ live |
| D | Wake-Layer — "Hey Hufi" mit opt-in Consent | ✅ live |
| E | Proaktives Tages-Briefing (regel-basiert, kein LLM) | ✅ live |
| F | Multimodales Pferde-Gedächtnis (Foto, Audio, Kontext) | geplant |
| G | Lokale / Offline HufAI Runtime | später |

> Leitfrage: **"Macht das HufAI intelligenter?"**
> Vision: **"Jedes Pferd bekommt eine Stimme."**

HufAI **ersetzt keine Tierärzte** und stellt keine automatisierte
medizinische Diagnose. Es assistiert mit Fakten, Verlaufsdaten,
Kontext — niemals autonom.

---

## Schlussbemerkung

Diese Architektur ist **erreichbar** mit dem heutigen Code-Stand,
wenn die P0/P1-Reihenfolge eingehalten wird. Sie ist **nicht erreichbar**
durch parallele Feature-Entwicklung in der bestehenden 102-Pages-
Struktur.

Die wichtigste Architektur-Entscheidung bleibt:
**Pferd-zentriert refactorisieren — `horse_owners`,
`horse_caregivers`, `horse_timeline`, `horse_memory` einführen,
bevor neue KI-Features oder neue UI-Pages kommen.**

Alles andere folgt daraus. Wer das überspringt, baut weitere Schicht
auf eine user-zentrierte Foundation und macht den späteren Refactor
teurer.

Pascal entscheidet, wann P0 fertig ist und P1 beginnen darf.
Diese Datei ist Snapshot vom 2026-05-11 — stale sobald
Architektur-Entscheidungen getroffen werden.
