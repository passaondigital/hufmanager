# Hufi System DNA — Tiefenanalyse (Jarvis+)

> **Read-only Analyse** der bestehenden HufManager-/HufiApp-Codebase
> (`/hufiapp`, Branch `sprint2/anthropic-and-domains-20260425`,
> HEAD `7c1c0e90`, Stand 2026-05-08).
>
> Ziel: Hufi auf Jarvis+-Premium-Niveau einordnen. Was existiert wirklich,
> was ist Demo, was ist Plattform, was ist Jarvis-Potenzial. Keine
> Marketing-Sprache, keine Spekulation als Fakt. Unsicheres ist mit
> `[?]` markiert.
>
> **Vorab-Korrektur:** Die bisherigen internen Doku-Dateien
> (`ROADMAP.md`, `CURRENT_STATE.md`, `project_hufi_architecture.md`-Memory)
> behaupteten an mehreren Stellen, der Hufi-Memory-Layer und die
> KI-Module seien "Konzept, kein Code". Falsch. Es gibt **11
> `hufi-*.ts`-Module**, **2 Memory-Tabellen** (`hufi_memory`,
> `hufi_memories`), **12 Notification-/Reminder-Edge-Functions**,
> **4 AutoFlow-Edge-Functions**, **20 Audit-Tabellen** und ein
> **vollständiges Compliance-Versionierungs-System**.
> Hufi ist **architektonisch reifer als die Doku zugibt** — und
> gleichzeitig **strategisch fragmentierter als die operative Realität
> verträgt**.

---

## 1. Executive Summary

### Was ist HufManager/HufiApp aktuell wirklich?

Drei parallele Schichten in einer Codebase:

1. **Operativer Hufpflege-Stack** (Provider/Client/Mitarbeiter/Stallbetreiber/
   Partner, Termine, Pferde, Rechnungen, Touren, Akten) — produktiv, stabil,
   geld-relevant.
2. **Plattform-/Portal-Stack** (21 Sub-Module unter `/portal/*` plus
   Subdomain-Routing für `versicherung.`, `markt.`, `tierarzt.`,
   Wildcard `*.assaon.com`) — ambitioniert, breit gestreut, größtenteils
   Fassade ohne zahlende Kunden [?].
3. **KI-Assistenz-Stack** (`hufi-brain`, `hufi-memory`, `ai-routing`,
   `ontology-service`, 7+ KI-Edge-Functions, AutoFlow-Engine,
   Notification-Scheduler) — überraschend weit entwickelt, in Teilen
   schon Jarvis-Vorform, in Teilen ungenutzt.

### Welche Produkt-DNA ist sichtbar?

- **Hochfrequenter Praxis-Alltag** ist überall der reale Treiber: Termine,
  Touren, Befunde, Rechnungen, schnelle Voice-Eingaben.
- **Pferd als Beziehungsknoten** zwischen mehreren Akteuren ist
  *konzeptionell* angelegt (`access_grants`, `horse_partner_access`,
  `stall_horse_access`, `employee_horse_access`), aber Datenmodell-seitig
  noch **single-owner** (`horses.owner_id`).
- **EU-AI-Act-/DSGVO-Bewusstsein** ist tief eingebaut (`hufi_context_log`,
  `consent_log`, `legal_agreements`, `legal_change_notifications`,
  `partner_data_consents`, Explanation-Felder bei jeder Hufi-Action).
  Untypisch reif für Solo-Founder-Projekt — echter Wettbewerbsvorteil.
- **Ontologie-getriebene Sprache** (`equine_ontology` mit Aliases, Tags,
  `formal_term`, `autoflow_field`, `autoflow_action`) — eine seltene,
  domänenspezifische Brücke zwischen Stallsprache und strukturierter
  Datenerfassung.
- **Pflichtgemäße Audit-Trails** (~20 Audit-/History-Tabellen).
  Compliance-Niveau eines mittelgroßen Healthcare-SaaS.

### Was ist schon Plattform?

- `useHufChat` mit Realtime + Presence + Voice + File-Upload + Reactions +
  Reply-To + 24h-Delete-Window — **echte Chat-Plattform**.
- AutoFlow-Engine: Event→Action-Pipelines mit `autoflow_log`-Audit.
- Notification-Engine: 12 Edge Functions für Reminder, Eskalation,
  Termin-/Impf-/Wurmkur-Erinnerung, legal-change, Push.
- Subscription-Layer mit `PLAN_FEATURE_MAP`: granulare Module-Toggle
  pro Plan-Tier (`starter`/höher).
- Voice-Pipeline: Whisper lokal + ElevenLabs STT + Claude Haiku +
  HufiVoiceModal — End-to-End.
- KI-Credit-System: `use_hufi_credit` RPC, Cost-Control eingebaut.

### Was ist noch Demo-/Legacy-/Portal-Welt?

- 6 öffentliche 1-Click-Demo-Logins (heute per Flag in Auth.tsx
  ausgeblendet, Commit `7c1c0e90` — aber Code bleibt im Bundle).
- 21 Portal-Submodule unter `/portal/galerie`, `/portal/versicherung`,
  `/portal/hersteller`, `/portal/tierarzt`, `/portal/lieferant`,
  `/portal/ausbildung`, `/portal/verband` plus 14 Untermodule
  (`/policen`, `/claims`, `/produkte`, `/schulungen`, `/kurse`,
  `/pruefungen`, `/standards`, `/mitglieder`, `/befunde`,
  `/impfungen`, etc.).
- Email-Pattern-Routing für Rollen
  (`hufmanagerbusiness@gmail.com`, `isStallbetreiberDemoEmail`).
- 65 hartkodierte `hufmanager`-Mentions in `src/` (Affiliate-Links,
  E-Mails, UI-Strings) — siehe `ROADMAP.md` P1.
- `botschafter_*`-System (Affiliate-/Empfehlungs-Programm) [?
  funktional aktiv?].

### Wo ist bereits Jarvis-Potenzial erkennbar?

- `hufi-brain.ts` `checkProactiveAlerts()` — Alert-Engine vorhanden.
- `morning-briefing` Edge Function — Cron-getriggertes Tagesbriefing
  als Notification + Push.
- `notification-scheduler` Edge Function — proaktive Reminder für
  Impfungen, Wurmkuren, Access-Expiry, Transfer-Expiry.
- `escalate-unconfirmed` Edge Function — Eskalation unbestätigter
  Termine.
- `hufi-actions.ts` mit Explanation-Feld — Approval-Layer-Skelett.
- `equine_ontology` mit `autoflow_field`/`autoflow_action`-Triggern.
- `hufi_context_log` für jede KI-Aktion — Auditierbarkeit.

### Wo fehlt Backend-Orchestrierung?

- **Kein zentraler Event-Bus** über Akteurs-Grenzen hinweg.
- **Keine Job-Queue** für asynchrone Hufi-Tasks (alles ist Cron oder
  HTTP-getriggert, keine Retry-/Backoff-Logik).
- **Kein Action-Approval-Center** für den Nutzer (Vorschläge werden
  als Notifications geliefert, aber kein "Hufi schlägt vor — du
  bestätigst"-UX-Pattern).
- **Kein per-Pferd-Agent** mit eigenem Zustand und Auslösekontext.
- **Keine zentrale Reminder-Tabelle**: Reminders sind über
  `notifications`, `appointment_reminders` (falls existiert [?]),
  AutoFlow-Logs verstreut.

---

## 2. Rollenmodell

### Belegtes Rollenmodell vs. behauptetes Rollenmodell

| Ebene | Werte | Quelle |
|---|---|---|
| **`app_role` ENUM** (Postgres) | nur 2 Werte: `provider`, `client` | Migration `20251203110750` |
| **`useAuth.tsx` UserRole-Typ** | 5 Werte: `provider \| client \| admin \| employee \| partner` | `src/hooks/useAuth.tsx:8` |
| **`organization_role` ENUM** | `admin`, `employee` | Migration `20260121095002` |
| **`employee_role` ENUM** | `view`, `employee`, `team_lead` | Migration `20260209052203` |
| **UI-/Demo-Rollen** | 6 Sub-Rollen: Hufbearbeiter, Pferdebesitzer, Mitarbeiter, Partner (Tierarzt/Therapeut), Business-Portal, Stallbetreiber | `Auth.tsx:606-611` Demo-Block |

**Diskrepanz:** Datenbank kennt 2 Rollen, App verhält sich wie 8-Rollen-App.
Diese 8 Rollen werden über Hilfs-Tabellen, Email-Pattern-Matching,
Subdomain-Detection und Feature-Flags zusammengeflickt. Sicherheits-
relevant: `useAuth.tsx:50-71` enthält ein **Auto-Repair-Pattern**, das bei
fehlendem Rollen-Eintrag aus `user_metadata.role` einen `user_roles`-Eintrag
erzeugt — User-Metadata ist client-seitig setzbar, das ist eine
**potenzielle Privilege-Escalation-Lücke** [? Auto-Repair sollte verifiziert
werden, ob Metadata-Validierung existiert].

### Pro Rolle

#### Provider (= Hufbearbeiter)

- **Zweck:** Operative Hauptrolle. Verdient Geld. Pflegt Hufpflege-Praxis.
- **Rechte:** Eigentümer der `provider_id`-gebundenen Tabellen
  (`horses.provider_id`, `appointments.provider_id`, `invoices`,
  `services`, `daily_tours`, `employee_profiles`).
- **Datenzugriff:** Eigene Pferde + alle, für die `access_grants` mit
  Provider-Sicht aktiv ist.
- **User Journey:** `/home` → `/anfragen` → `/kalender` →
  `/aufnahme` (Voice-First Befund) → `/pferde/:id` → `/rechnungen` →
  `/buchhaltung` → `/auto-flow` → `/team` → `/hufrente`.
- **Beziehungen:** zu Clients (1:n via `access_grants`), zu Employees
  (1:n via `employee_profiles`), zu Pferden (n:m über Grants), zu
  Partnern via `partner_*`-Tabellen.
- **Backend-Logik:** alle AutoFlow-Functions (Auto-Invoice,
  Monthly-Checkin, Customer-Notify, Process-Lead), Tour-Optimierung
  via `hufi-route.ts`, B2B-Reports via `generateB2BReport`.
- **KI-Berührung:** Voice-Befunde, AutoFlow, hufi-brain Greeting,
  Lead-Klassifikation (`leads.plan_tier` via Commit `88403316`),
  B2B-Angebots-Generator (Claude Haiku).
- **Screens:** Dashboard, Anfragen, Kalender, Aufnahme, Pferde, Kunden,
  Rechnungen, Buchhaltung, Tour, Team, AutoFlow, Hufrente, MeinAngebot,
  Mein/Office, Lager, Ausgaben.
- **Mögliche Hufi-Assistenz:** Tagesbriefing, Lead-Vorqualifikation,
  Tour-Vorbereitung, Befund-Strukturierung, Rechnungs-Entwurf,
  Kunden-Antwort-Vorschlag, Anomalie-Erkennung.
- **Niemals autonom:** Rechnung versenden, Termin verschieben ohne
  Bestätigung, Kunden-Nachricht ohne Approval, Mahnung auslösen,
  Datenfreigabe an Dritte.

#### Client (= Pferdebesitzer)

- **Zweck:** Kunde des Providers. Verfolgt Termine und Akten seiner
  Pferde. Zahlt indirekt.
- **Rechte:** Sicht auf eigene Pferde (`horses.owner_id = auth.uid()`),
  Termine, Rechnungen, Befunde via `Client*`-Pages.
- **User Journey:** `/client-home` → `/client/horses` →
  `/client/horses/:id` → `/client/booking` → `/client/invoices` →
  `/client/chat`.
- **Beziehungen:** Owner-1:n zu Pferden, n:1 zu Provider via Grants,
  optional 1:n zu Stallbetreiber (über `stall_horse_access`).
- **Backend-Logik:** Notfall-Pfad (`NotfallZugang` via `eqid/token`),
  Permission-Verwaltung, partner_data_consents.
- **KI-Berührung:** schwach — primär Read-only-Zugang, eigene
  Akten-Sicht.
- **Screens:** ClientHome, ClientHorses, ClientHorseDetail,
  ClientBooking, ClientInvoices, ClientChat, ClientNotifications,
  ClientPermissions, ClientStallBoard, ClientLocations, ClientProfile,
  ClientAccountType, ClientOrders.
- **Mögliche Hufi-Assistenz:** Termin-Erinnerung, Pferd-Status-
  Zusammenfassung, "Was war beim letzten Termin?", Notfall-Anleitung,
  Foto-Upload-Aufforderung vor Termin, Provider-Kommunikation
  vereinfachen.
- **Niemals autonom:** Behandlung anstoßen, medizinische Diagnose
  stellen, Provider/Tierarzt rufen, Zahlung auslösen, Pferd-Daten
  an Dritte teilen.

#### Employee (= Mitarbeiter / Azubi)

- **Zweck:** Vom Provider eingeladen. Führt Tour aus, dokumentiert
  Behandlungen, sieht Termine.
- **Rechte:** Eingeschränkt durch `employee_role` (`view` /
  `employee` / `team_lead`) und `employee_horse_access`.
- **User Journey:** `/employee` → Touren-/Termin-Sicht → mobile
  Befund-Eingabe.
- **Beziehungen:** n:1 zu Provider, n:m zu Pferden über Access.
- **Backend-Logik:** `employee_audit_log` jeder Aktion,
  `accept-employee-invitation` und `validate-employee-invitation`
  Edge Functions.
- **KI-Berührung:** Voice-Eingabe für Befunde, sonst eher passiv.
- **Screens:** EmployeeDashboard plus geteilte Pages über `useAuth`-
  Role.
- **Mögliche Hufi-Assistenz:** Tour-Reihenfolge, nächstes-Pferd-Brief,
  Befund-Vorschläge anhand letzter Akteneinträge, Foto-Pflichtfeld-
  Erinnerung.
- **Niemals autonom:** Rechnungs-Erstellung (gehört Provider),
  Kunden-Kommunikation jenseits Befund-Sharing, Tour-Reihenfolge final
  ändern ohne Provider-OK, Diagnose-Niveau-Aussagen.

#### Stallbetreiber

- **Zweck:** Verwaltet einen Stall mit mehreren Pferden, koordiniert
  zwischen Pferdebesitzern und externen Dienstleistern.
- **Rechte:** Über `stall_horse_access` und Email-Pattern-Erkennung
  (`isStallbetreiberDemoEmail`). Eigene Stall-Routes
  (`/stall/dashboard`, `StallAnfragen.tsx`).
- **Beziehungen:** 1:n zu Pferden im Stall, 1:n zu Pferdebesitzern,
  n:m zu Dienstleistern.
- **Backend-Logik:** Lead-Forwarding zwischen Pferdebesitzern und
  Hufpflegern (Status-Mismatch heute gefixt: Commit `3522de61`).
- **KI-Berührung:** schwach — primär Anfragen-Dashboard.
- **Screens:** StallAnfragen, plus Stall-Dashboard.
- **Mögliche Hufi-Assistenz:** Anfragen-Triage, "Welcher Provider
  passt zu welchem Pferdebesitzer?", Stall-weite Termin-Konflikt-
  Erkennung, Rundmail-Entwurf an alle Stall-Eigentümer, neue-Pferde-
  Einzug-Onboarding.
- **Niemals autonom:** Provider zuteilen ohne Owner-OK, Termine im
  Namen Dritter buchen, Tier-Daten weitergeben.

#### Partner (= Tierarzt / Therapeut / Physio / Osteopath)

- **Zweck:** Externer Dienstleister, der über Provider Zugang zu
  Pferdedaten erhält. Schreibt Befunde, Behandlungspläne.
- **Rechte:** Granular über `horse_partner_access`,
  `partner_data_consents`, `partner_treatment_notes`,
  `partner_treatment_plans`. Eigene Tabellen-Familie für Rechnungen
  (`partner_invoices`, `partner_invoice_items`,
  `partner_invoice_number_counters`).
- **User Journey:** `/partner-invite/:token` → `/partner-home` →
  geteilte Pferde-Sicht.
- **Beziehungen:** n:m zu Providern, n:m zu Pferden (mit Consent),
  n:1 Owner via `partner_id`.
- **Backend-Logik:** `sync-vet-pms` (PMS-Integration für Tierärzte),
  `accept-employee-invitation`-ähnlicher Flow für Partner.
- **KI-Berührung:** Vet-Portal mit `VetSOAPForm`, `VetGOTRechner`,
  `VetCSVImport`, `generate-vaccination-report` Edge Function.
- **Screens:** PartnerInvite, PartnerPublicProfile, Vet-Portal-Suite
  (VetDashboard, VetSOAPForm, VetGOTRechner, VetCSVImport, VetPMSConnect,
  VetImpfungen).
- **Mögliche Hufi-Assistenz:** Befund-Vorschläge anhand
  `equine_ontology`, GOT-Rechnungs-Generator (existiert),
  Medikations-Risiko-Hinweis, Behandlungsplan-Vorschlag.
- **Niemals autonom:** Diagnose stellen, Medikament verschreiben,
  Behandlungsplan finalisieren, Rechnung versenden.

#### Business-Portal-User (= Hufi Business)

- **Zweck:** Vermutlich Verwalter eines Multi-Hufbearbeiter-Betriebs
  mit Galerie, Schulung, Hersteller-Bezug. **In der Praxis kaum
  belegbar — sieht nach Demo-Sub-Brand aus** [?].
- **Rechte:** über `isPortalBusinessEmail()`,
  `/portal/galerie` Route.
- **Screens:** PortalGallery + 14 Portal-Submodule.
- **Empfehlung:** vor Hufi-Vision auditieren — entweder als echtes
  Produkt-Layer oder als Demo-Stub deklarieren.

#### Admin / Mission Control

- **Zweck:** Pascal selbst und ggf. interne Mitwirkende. Mission-
  Control, Demo-Setup, Account-Management, System-Health.
- **Rechte:** `public.is_admin()` Helper-Function, `service_role`
  Bypass-Pattern.
- **Backend-Logik:** `admin-create-user`, `admin-create-client`,
  `admin-delete-user`, `admin-notifications`, `admin_activity_log`,
  `admin_dunning_log`, `admin_revenue_log`.
- **Screens:** AdminDashboard, MissionControl, AdminNachrichten,
  AdminSeedDemo, AdminSmokeTest, AdminUserDB, AdminQuickMessage.
- **KI-Berührung:** AdminQuickMessage (KI-Broadcast),
  anomaly-detection-Triggering.
- **Mögliche Hufi-Assistenz:** Mission-Control-Tagessicht,
  Anomalie-Auto-Triage, System-Health-Briefing, Provider-Ankommens-
  Liste, Lead-Funnel-Übersicht.
- **Niemals autonom:** Account-Löschung, Plan-Tier-Wechsel,
  Refund-Auslösung, Rolle-Änderung — alles braucht Pascal-OK.

#### Botschafter (= Affiliate / Empfehlungs-Programm) [?]

- **Zweck:** unklar, vermutlich Affiliate-/Empfehlungs-System
  (`register-botschafter`, `botschafter-welcome` Edge Functions,
  `BotschafterAuth`, `BotschafterWarten` Pages, `BotschafterNachrichten`,
  `BotschafterLayout`-Component).
- **Rechte:** eigener Auth-Flow, separater Onboarding.
- **Backend-Logik:** `register-botschafter` Edge Function,
  `botschafter_*`-Tabellen [?].
- **Status:** funktional aktiv? — *muss verifiziert werden*.

#### Versteckte Subdomain-Modi

- `portalMode === 'insurance'` (`versicherung.hufiapp.de`)
- `portalMode === 'marketplace'` (`markt.hufiapp.de`)
- `portalMode === 'veterinary'` (`tierarzt.hufiapp.de`)
- Wildcard `*.assaon.com` Wildcard-Apps

Alle definiert in `usePortalDetection.ts`, gesteuert in `App.tsx:333+`.

---

## 3. Beziehungsmodell

### Zentrale Entitäten und ihre Verknüpfungen

```
Pascal (Owner aller Marken)
  │
  ├── auth.users
  │     ├── profiles (1:1)
  │     ├── user_roles (1:1)
  │     ├── employee_profiles (n:1 zu Provider)
  │     └── organizations (m:n via memberships)
  │
  ├── horses ◄──── access_grants ────► clients
  │     │              │
  │     ├── horse_partner_access ──── partners
  │     ├── stall_horse_access    ──── stallbetreiber
  │     ├── employee_horse_access ──── employees
  │     │
  │     ├── hoof_entries / hoof_history / hoof_photos / hoof_analyses
  │     ├── horse_documents
  │     ├── horse_diary_entries
  │     ├── horse_health_log
  │     ├── horse_exercise_log
  │     ├── horse_intake_history
  │     ├── horse_vaccinations (von notification-scheduler überwacht)
  │     ├── horse_chat_channels ── horse_chat_messages
  │     └── horse_audit_log
  │
  ├── appointments ── appointment_groups (Sammeltermine)
  │     ├── partner_appointments
  │     └── tour_breadcrumbs (GPS-Spur)
  │
  ├── invoices / partner_invoices / admin_invoices
  │     ├── price_groups, surcharge_rules, billing_type
  │     └── service_price_history / partner_service_price_history
  │
  ├── leads (BHS GO/BALANCE/INTENSIV mit plan_tier)
  │
  ├── conversations / partner_messages / employee_team_messages
  │
  ├── notifications / push_subscriptions / admin_messages /
  │   admin_message_replies / admin_message_templates
  │
  ├── hufi_memory (kategorisiert: routine, preference,
  │                horse_pattern, client_note, alert,
  │                dsgvo, permission)
  ├── hufi_memories (Markdown-Archiv: pferdeakte,
  │                  pferdebusiness, pferdemensch, hufi_notizen)
  ├── hufi_context_log (Audit jeder KI-Aktion mit Explanation)
  ├── ai_befunde (Befund-Klassifikation aus Voice)
  ├── ai_chat_messages (Rate-Limit + Audit)
  ├── equine_ontology (Pferd-Domain-Sprache)
  │
  ├── autoflow_settings ── autoflow_log
  │
  ├── legal_agreements / consent_log /
  │   legal_change_notifications / legal_change_confirmations /
  │   partner_data_consents / dsgvo (RLS-context)
  │
  ├── subscription_plans / provider_subscriptions /
  │   client_subscriptions / subscription_settings /
  │   PLAN_FEATURE_MAP (in plan-features.ts)
  │
  └── ecosystem_settings / ecosystem_mappings /
      ecosystem_sync_log / ecosystem_errors
```

### Wer darf was sehen / ändern / einladen?

| Ressource | Provider | Client | Employee | Partner | Stallbetreiber | Admin |
|---|---|---|---|---|---|---|
| `horses` (eigene) | sehen+ändern | – | rolle-eingeschränkt | – | – | – |
| `horses` (fremde) | nur über Grant | nur eigene | über `employee_horse_access` | über `horse_partner_access` | über `stall_horse_access` | alle |
| `appointments` | eigene + von Mitarbeitern | nur eigene Pferd-Termine | view/edit nach `employee_role` | nur Partner-Termine | Stall-Pferd-Termine | alle |
| `invoices` | eigene | nur an einen selbst | – | eigene Partner-Rechnungen | – | alle |
| `chat` (`horse_chat_messages`) | wenn Akteur am Pferd | wenn Owner | wenn `employee_horse_access` | wenn `horse_partner_access` | wenn `stall_horse_access` | alle |
| `hufi_memory` | eigene | eigene | eigene | eigene | eigene | alle |
| `equine_ontology` | read | read | read | read | read | read+write |
| `legal_agreements` | accept | accept | – | accept | accept | alle |

### Wer darf wen einladen?

- **Provider** lädt: Clients (`send-client-invitation`), Employees
  (`send-employee-invitation`), Partner (`send-partner-invitation`).
- **Admin** lädt: Provider (`send-provider-invitation`), neue
  Org-Mitglieder, Botschafter (`register-botschafter`).
- **Client** lädt: niemanden direkt — kann höchstens Provider auf
  sein Pferd freischalten (`access_grants`).
- **Stallbetreiber** lädt: Pferdebesitzer in seinen Stall [? Mechanismus
  unverifiziert].
- **Partner** lädt: niemanden — wird selbst eingeladen.

### Wer arbeitet gemeinsam an einem Pferd?

Ein einziges Pferd kann gleichzeitig haben:
- 1 Owner (`horses.owner_id`)
- 1 Primary Provider (`horses.provider_id`)
- n Provider via `access_grants` (mit Lese-/Schreibrechten)
- n Partner via `horse_partner_access` mit Consent
- 1 Stallbetreiber via `stall_horse_access`
- n Employees via `employee_horse_access` (rollenbeschränkt)

**Kritisch:** All diese Akteure haben gleichzeitig Sicht auf **denselben
Pferd-Kontext**, aber **kein Akteur sieht eine konsolidierte Wahrheit**
über das Pferd. Jeder hat seine eigene Memory (`hufi_memory.user_id` ohne
Pflicht-`horse_id`-Bindung). Das ist die zentrale Architektur-Lücke.

### Wo sind Rechte klar / riskant / unklar?

| Pattern | Status |
|---|---|
| `auth.uid() = owner_id` (Direktbesitz) | klar ✓ |
| `EXISTS (SELECT 1 FROM access_grants ...)` | klar ✓ |
| `has_role(auth.uid(), 'provider'::app_role)` | klar ✓ |
| `is_org_member()`, `is_org_admin()` | klar ✓ |
| `service_role` Bypass | klar (Edge Functions) ✓ |
| **Email-Pattern-Routing** (`isPortalBusinessEmail`, `isStallbetreiberDemoEmail`) | **riskant** — nicht RLS-gekoppelt, nur UI-Logik |
| **Auto-Repair von `user_roles` aus `user_metadata.role`** | **riskant** — Metadata client-seitig setzbar [?] |
| **Multi-Provider-Cross-Access** (zwei Provider an einem Pferd) | unklar — `access_grants` ist UNIQUE auf `(client_id, provider_id)`, also pro Owner ein Grant pro Provider. Was bei zwei Owner-Sichten? |
| **Notfall-Token (`/notfall/:eqid/:token`)** | unklar — wer kann den Link erzeugen? Wann läuft er ab? |

---

## 4. Pferdezentrierte Architektur

### Ist das Pferd bereits zentrale Entität?

**Teilweise — eher kunden-/betriebszentriert.**

Belege für *Pferd-zentriert*:
- `horses` als Beziehungsknoten zu mindestens 9 Tabellen
  (hoof_entries, hoof_history, hoof_photos, hoof_analyses, horse_documents,
  horse_diary_entries, horse_chat_channels, horse_health_log,
  horse_exercise_log, horse_vaccinations, horse_audit_log).
- `equine_type` ENUM (horse/pony/donkey/mule/zebra) — Spezies-Realität.
- `horse_chat_channels` — Pferd hat eigenen Kommunikationskanal.
- `appointment_groups` — Sammeltermine (mehrere Pferde + Personen pro
  Termin).
- `notification-scheduler` überwacht pferd-zentrierte Events
  (`horse_vaccinations`, `horse_dewormings`).

Belege für *Provider-zentriert*:
- `horses.provider_id` als primäre Achse.
- `appointments.provider_id` als Pflichtfeld.
- RLS-Policies starten meist mit "ist Provider berechtigt?" statt
  "ist irgendein Akteur am Pferd berechtigt?"
- `hufi_memory.user_id` ohne `horse_id`-Pflicht.
- `hufi_memories` (mit horse_id) ist die Ausnahme, aber **per
  user+memory_type+horse_id** unique-constrained — also jeder Akteur
  hat seine *eigene* Pferdeakte.
- `horses.owner_id` ist single-owner — Reitbeteiligung,
  Familien-Stalldynamik, Pferd-in-zwei-Ställen ist nicht abbildbar.

### Was ein Pferd haben kann (Soll vs. Ist)

| Aspekt | Vorhanden? | Quelle / Lücke |
|---|---|---|
| **Besitzer** (1+) | ⚠️ nur 1 | `horses.owner_id` single |
| **Hufbearbeiter** (1+) | ⚠️ 1 primary + n via Grant | `provider_id` + `access_grants` |
| **Tierarzt / Partner** (n) | ✓ | `horse_partner_access` |
| **Therapeut / Physio** (n) | ✓ | `horse_partner_access` (gleiche Tabelle) |
| **Stallbetreiber** (1+) | ⚠️ semi | `stall_horse_access` |
| **Mitarbeiter** (n) | ✓ | `employee_horse_access` |
| **Dokumente** | ✓ | `horse_documents` |
| **Fotos** | ✓ | `hoof_photos` (huf-spezifisch) — aber **keine generische `horse_photos`-Tabelle** sichtbar [?] |
| **Termine** (n) | ✓ | `appointments` mit `horse_id` |
| **Befunde** | ✓ | `hoof_entries`, `hoof_analyses`, `partner_treatment_notes`, `ai_befunde` |
| **Historie** | ✓ | `hoof_history`, `horse_audit_log`, `horse_intake_history` |
| **Gesundheits-Log** | ✓ | `horse_health_log` |
| **Bewegungs-Log** | ✓ | `horse_exercise_log` |
| **Impfungen** | ✓ | `horse_vaccinations` |
| **Wurmkur** | ✓ | `horse_dewormings` [?] |
| **Diary / Tagebuch** | ✓ | `horse_diary_entries` |
| **Chat-Kanal** | ✓ | `horse_chat_channels` |
| **KI-Kontext** (eigener) | ❌ | nur user-zentriert in `hufi_memory` |
| **Freigaben (granular)** | ⚠️ verstreut | 4 separate Access-Tabellen statt einer `horse_caregivers`-Konsolidierung |
| **Warnungen** (eigene) | ❌ | nur über `notifications.user_id`, nicht `horse_id` |
| **Erinnerungen** (eigene) | ⚠️ teilweise | `notification-scheduler` triggert pferd-bezogene Reminders, schreibt aber `notifications.user_id` |

### Was fehlt / falsch modelliert ist

1. **`horse_owners` Junction-Table** für Multi-Owner. Heute fehlend.
2. **`horse_caregivers` Konsolidierung** der 4 Access-Tabellen. Heute
   fragmentiert.
3. **`horse_state` persistente Statusspalte** (current diagnosis,
   beschlag-typ, intervall, gesundheits-flags). Heute über Tabellen
   verstreut, abgeleitet aus History.
4. **`horse_timeline` Append-Only Event-Stream** pro Pferd (statt
   pro Akteur). Heute existiert nur `horse_audit_log` (Audit, nicht
   Event-Stream).
5. **`horse_memory`** als Pferd-eigenes Gedächtnis (nicht user-
   gebunden). Heute abwesend.
6. **`horse_photos`** als generische Foto-Tabelle (nicht nur huf-
   spezifisch). Heute nur `hoof_photos` sichtbar [?].

---

## 5. Hufi als Jarvis+ Assistent

### 5.1 Identität

**Wie erkennt Hufi heute Nutzer, Rolle, Gerät, Kontext?**

- **Nutzer:** `auth.users` via Supabase Auth (`useAuth.tsx`).
- **Rolle:** `user_roles.role` (mit Auto-Repair aus
  `user_metadata.role`).
- **Sub-Rolle:** Email-Pattern (`isPortalBusinessEmail`,
  `isStallbetreiberDemoEmail`, `isDemoEmail`).
- **Gerät:** `use-mobile.tsx`, `useDeviceOrientation.tsx`. Kein
  Device-Fingerprint, keine Multi-Device-Sicht.
- **Kontext:** `usePortalDetection` (Subdomain), `useGA4` (Analytics),
  `useOnboarding` (State).

**Was fehlt für sichere Identität?**

- **Multi-Workspace-Flag:** Pascal arbeitet auf Handy/Tablet/Chromebook/PC
  parallel — Hufi sieht das heute nicht als zusammenhängende Identität.
- **Device-Trust-Levels:** "neues Gerät, das ich noch nie gesehen
  habe" sollte sensible Aktionen extra-bestätigen lassen.
- **Auto-Repair-Pattern in `useAuth.tsx`** schafft eine
  Privilege-Escalation-Möglichkeit über `user_metadata.role` [?].
  Soll geprüft werden, ob es Trigger/Policies gibt, die das verhindern.
- **Session-Level-Context:** "war heute schon im Stall, jetzt am
  Schreibtisch" — Tageszeit/Aktivitäts-Mode unbekannt.
- **Voice-/Stimm-Identität bewusst nicht** (Pascal hat in PASCAL_CONTEXT
  Stimmerkennung als Nicht-Ziel markiert, solange Login + Gerät + Rolle
  reichen).

### 5.2 Kontext

**Welche Daten kann Hufi heute schon kennen?**

- Pferde, Kunden, Termine, Rechnungen, Befunde, Fotos, Dokumente
  (über RLS-gefilterten Postgres).
- Letzte Aktivitäten (`*_audit_log`, `hoof_history`).
- Plan-Tier des Users (`provider_subscriptions`,
  `client_subscriptions`, `PLAN_FEATURE_MAP`).
- Memory: `hufi_memory` (kategorisiert), `hufi_memories` (Markdown).
- Ontologie (`equine_ontology`).
- Notifications, ungelesen.
- Lead-Pipeline (`leads.plan_tier`).

**Welche Daten fehlen?**

- **Tageszeit-/Wetter-Kontext:** Wetter ist relevant für Hufpflege-
  Termine. Wetter-API nicht angebunden.
- **Geo-Kontext live:** `tour_breadcrumbs` existiert, aber Hufi sieht
  den aktuellen Standort des Providers nicht aktiv ein.
- **Branchen-News / Pferdewelt:** Welche Krankheiten gerade gehäuft
  auftreten, welche Schmiede-Trends. Heute keine Quelle.
- **Cross-User-Insights** (anonymisiert, optional): "10 andere
  Hufbearbeiter haben heute auch mit X-Problem zu tun".
- **Pferd-eigener Kontext:** das Pferd selbst hat keine Memory.

**Wo müsste der Hufi-Memory-Layer sitzen?**

- **Pro Pferd** (neu): `horse_memory` mit `horse_id` als Primary,
  Lese-Sichten gefiltert per Akteur-Permission.
- **Pro Akteur** (Refactor von `hufi_memory`): user-zentrierte
  Routinen, Präferenzen, Tageszeit-Patterns — aber **nicht** über
  Pferde.
- **Pro Beziehung**: `(horse_id, user_id, role)`-Tupel mit
  rollenspezifischer Sicht auf Pferd-Memory.
- **System-weit**: `equine_ontology` plus Glossar plus Werbe-/
  Affiliate-Material.

**Welche Daten dürfen nicht ungeprüft in AI-Kontext?**

- Echte Kundennamen / Adressen / Telefonnummern in Cloud-AI-Prompt
  (nur über Pseudonymisierung).
- Medikamentennamen (Tierarzneimittel sind reglementiert).
- Diagnose-Aussagen aus Befund-Texten (Halluzinations-Risiko).
- Fotos vor Consent.
- Andere Stall-Mitglieder (selbst wenn technisch sichtbar) ohne
  expliziten Anwendungsbezug.
- Finanzdaten (Umsatzhöhen, Plan-Tier-Wechsel).

### 5.3 Ereignisse

**Welche Events müsste Hufi beobachten?** Existenz heute:

| Event | Heute belegbar? | Quelle |
|---|---|---|
| Termin morgen | ✓ | `send-appointment-reminders` Edge Function |
| Termin unbestätigt → eskaliert | ✓ | `escalate-unconfirmed` Edge Function |
| Termin verschoben | ✓ | `send-reschedule-notification` Edge Function |
| Überfällige Rechnung | ✓ | `check-overdue-invoices` Edge Function |
| Neuer Lead | ✓ | `funnel-lead-notify`, `autoflow-process-lead` |
| Pferd lange nicht gesehen | ⚠️ | implizit in `hufi-brain.ts` `checkProactiveAlerts()` |
| Befund auffällig | ⚠️ | `ai_befunde` mit `dringend_tierarzt`-Flag |
| Fotos fehlen | ❌ | nirgends gefunden |
| Besitzer wartet auf Antwort | ❌ | keine Read-Receipt-/Wartedauer-Logik sichtbar |
| Wetter relevant | ❌ | keine Wetter-API |
| Route ungünstig | ⚠️ | `hufi-route.ts` optimiert nachträglich, kein Live-Verkehrs-Trigger |
| Abo läuft aus | ⚠️ | `provider_subscriptions` hat Felder, aber kein expliziter Reminder sichtbar [?] |
| Dokument fehlt | ❌ | keine Pflicht-/Soll-Listen-Logik sichtbar |
| Zugriff neu erteilt/entzogen | ✓ | `client_provider_audit_log`, `consent_log` |
| Impfung fällig | ✓ | `notification-scheduler` (7-Tage-Vorwarnung) |
| Wurmkur fällig | ✓ | `notification-scheduler` |
| Access-Grant läuft aus | ✓ | `notification-scheduler` (`access_expiring`) |
| Transfer läuft aus | ✓ | `notification-scheduler` (`transfers_expiring`) |
| Legal-Change | ✓ | `legal-change-reminders` Edge Function |
| Mahnung fällig | ⚠️ | `admin_dunning_log` existiert, Auto-Mahnung-Logik unklar [?] |
| Anomalie im System | ✓ | `anomaly-detection` Cron |
| Provider-System-Update | ✓ | `send-system-update` Edge Function |

**Welche brauchen Backend-Eventlogik (neu)?**

- "Fotos fehlen vor Termin"
- "Besitzer wartet auf Antwort > 24h"
- "Wetter relevant (Hagel/Frost im Stallumkreis)"
- "Pferd hat ungewöhnlich viele Befund-Auffälligkeiten in 30 Tagen"
- "Pferd-Beschlag-Intervall überschritten"
- "Provider hat heute >X km gefahren — Hufi schlägt Pause vor"

### 5.4 Proaktivität

**Was darf Hufi proaktiv tun?**

| Aktion | Approval nötig? |
|---|---|
| Erinnern (per Notification, Push, In-App-Banner) | nein |
| Zusammenfassen (Tagesbriefing, Wochenbriefing) | nein |
| Priorisieren (welcher Lead ist heiß, welcher Termin riskant) | nein |
| Vorbereiten (Befund-Vorlage, Rechnung-Entwurf, Tour-Plan) | nein, aber als *Entwurf* markiert |
| Entwurf erstellen (Kunden-Antwort, Angebot, Mahnung) | **ja** |
| Risiko markieren ("Pferd-Status auffällig", "Cashflow knapp") | nein, aber transparent |
| Nachfrage stellen ("Soll ich X tun?") | impliziter Approval-Trigger |
| Tagesbriefing (`morning-briefing`) | nein |

**Was darf Hufi nicht autonom tun?**

| Aktion | Pflicht |
|---|---|
| Rechnung versenden | ja, immer Approval |
| Termin verschieben | ja, immer Approval |
| Termin absagen | ja, immer Approval (egal welche Rolle) |
| Medizinische Diagnose stellen | **niemals**, auch nicht mit Approval |
| Behandlungs-Plan finalisieren | nur Tierarzt mit Approval |
| Zugriff erteilen (`access_grants` create) | ja, immer Owner-Approval |
| Zugriff entziehen | ja, immer Owner-Approval, aber Notfall-Pfad ohne |
| Kostenpflichtige Aktionen (Plan-Wechsel, externes Tool) | ja |
| Nachrichten an Kunden senden | ja, immer Approval mit Vorschau |
| Dokumente an Dritte teilen | ja |
| Pferd-Daten an externe APIs senden | ja, mit Anonymisierung |
| Mahnung versenden | ja, immer Provider-Approval |

### 5.5 Kontrolle

**Wie muss die UX aussehen?**

- **Vorschlag statt Befehl:** Hufi-Vorschläge als Cards mit
  "Annehmen / Ablehnen / Anpassen"-Trio, nicht als Stillsetzungen.
  Heute: Notifications haben kein eingebautes Approval-Pattern.
- **Bestätigungsdialog für sensible Aktionen:** modal mit
  Aktion-Beschreibung, Daten-Diff, Risiko-Hinweis. Heute: nur
  klassische `toast.error/success`-Patterns.
- **Änderungsprotokoll:** alles, was Hufi macht, landet in
  `hufi_context_log` mit `explanation`. **Bereits implementiert.**
- **Rückgängig-Funktion:** Soft-Delete + Audit-Trails für die
  meisten Operationen. Aber kein expliziter "Hufi-Aktion rückgängig"-
  Button. Müsste pro Action-Typ existieren.
- **Sichtbarkeit (Warum schlägt Hufi das vor?):** `explanation`-Feld
  bereits in `hufi-actions.ts`. Müsste in der UI prominent angezeigt
  werden.
- **Datenschutz-Erklärung im Kontext:** `KiHinweisModal` existiert,
  `DsgvoConsentModal` existiert. Müssen in jeden KI-Touch eingebunden
  sein. Heute teilweise.

---

## 6. KI-/Voice-/Chat-Architektur

### Vorhandene KI-Features

#### `src/lib/`-Module (11 hufi-*.ts plus 2)

| Datei | Zweck | KI-Calls? |
|---|---|---|
| `ai-routing.ts` | Zentraler Claude-Dispatcher (Haiku/Sonnet), Credit-System, Ollama-Fallback, 195-Zeilen-System-Prompt | ✓ Anthropic |
| `ontology-service.ts` | `equine_ontology`-getriebene Entity-Recognition mit Levenshtein-Suggestions | ✗ deterministisch |
| `hufi-brain.ts` | Context-Engine: Termine, Rechnungen, Memory, Befunde aggregieren; Greeting; Alerts | ✗ datenaggregat |
| `hufi-memory.ts` | Multi-Tier Memory (`hufi_memories` mit Markdown, 4 Typen) | ✗ |
| `hufi-actions.ts` | Action-Factory mit Explanation-Feld | ✗ |
| `hufi-intent.ts` | Rule-basiert (Keyword-Matching) für 5 Intent-Klassen | ✗ |
| `hufi-context-resolver.ts` | Entity-Lookup (Pferd, Kunde) für Intent-Verarbeitung | ✗ |
| `hufi-search.ts` | 3-Stufen-Suche, AI nur als 3. Stufe (Cost-Control) | ✓ als Fallback |
| `hufi-route.ts` | TSP-Tour-Optimierung (Nearest-Neighbor) | ✗ deterministisch |
| `hufi-business.ts` | B2B-Analytics + `generateClientOffer` | ✓ Claude Haiku |
| `hufi-feedback.ts` | Feedback-Loop, Rating ≤ 2 → Alert in `hufi_memory` | ✗ |

#### Edge Functions mit KI

| Function | Provider | Trigger | Output | Kommentar |
|---|---|---|---|---|
| `ai-chat` | Claude Haiku | HTTP POST (auth) | SSE stream (Anthropic→OpenAI-compat) | Rate-Limit 10/min/user, in `ai_chat_messages` geloggt |
| `anthropic-proxy` | Claude (passthrough) | HTTP POST | JSON | Schützt Frontend-Key |
| `hufi-ai-voice-finding` | ElevenLabs STT (`scribe_v2`) + Claude Haiku | HTTP POST (auth) | strukturiertes Befund-JSON | befund_text, massnahme, huf_werte, dringend_tierarzt |
| `analyze-hoof-image` | Claude Vision | HTTP POST (multipart) | Bildqualität (sharpness, lighting, perspective, score) | fail-safe, kein DB-Write |
| `ai-import-agent` | Claude Sonnet (Tool-Use) | HTTP POST | Kontakt-Klassifikation, Duplikat-Erkennung | für CSV-/Excel-Import |
| `generate-farrier-email` | Claude [?] | HTTP POST | Email-Entwurf | unverifiziert [?] |
| `generate-completion-report` | Claude [?] | HTTP POST | Reports | unverifiziert [?] |
| `generate-full-horse-report` | Claude [?] | HTTP POST | Vollreport | unverifiziert [?] |
| `generate-vaccination-report` | Claude [?] | HTTP POST | Impf-Doku | unverifiziert [?] |
| `generate-partner-report` | Claude [?] | HTTP POST | Partner-Statistik | unverifiziert [?] |
| `generate-werbemittel` | Claude [?] | HTTP POST | Marketing-Material | unverifiziert [?] |

### Voice-Stack

- `HufiVoiceModal` (`src/components/HufiVoiceModal.tsx`):
  MediaRecorder (webm), POST zu `/api/local-ai/transcribe` (lokaler
  Whisper, Port 5000).
- `hufi-ai-voice-finding` Edge Function: ElevenLabs STT + Claude
  → strukturierter Befund-JSON.
- **Welche Workflows verwenden Voice produktiv?**
  - `Aufnahme.tsx` (Befund-Erfassung) — vermutlich der Haupt-Pfad [?].
  - `useHufChat` (Voice-Messages in Chat) — Webm-Upload, kein STT
    automatisch.
- **Was fehlt:** Voice-Befehle ("Hufi, plane Tour von morgen"),
  Voice-Diktat in andere Felder (z. B. Termin-Notiz), Voice-Output
  (TTS).

### Chat-Stack

- `useHufChat` (`src/hooks/useHufChat.ts`): vollständige
  Chat-Implementierung mit Realtime, Presence, Reactions, File-Upload,
  Voice-Messages, Reply-To, 24h-Delete-Window, Optimistic Updates.
- Tabellen: `horse_chat_channels`, `horse_chat_messages`,
  `partner_messages`, `employee_team_messages`, `partner_conversations`,
  `admin_messages`, `admin_message_replies`, `admin_message_templates`,
  `message_reactions`.
- Storage: `chat-images` Bucket.

### HufCam / Vision

- HufCam Backend auf Port 5002 (Python3, PM2-Service `hufi-hufcam`).
- HufCamPro als separate PWA unter `hufcampro.de`.
- `analyze-hoof-image` Edge Function nutzt Claude Vision für
  Bildqualität.
- **Lücke:** Befund-Erkennung aus Foto (z. B. "ist das eine
  Strahlfäule?") nicht produktiv [?]. Existiert ggf. als Stub.

### Lokale Ollama-Modelle

- `hufiai-fast`, `hufiai-core` — Modelfile-Aliase auf `llama3.1`,
  kein Finetuning.
- Verwendet als Fallback in `ai-routing.ts`, wenn kein
  `ANTHROPIC_API_KEY` gesetzt — vermutlich kaum aktiv.
- Strategisches Asset: lokale KI ohne Cloud-Daten-Risiko, könnte für
  sensible Befund-Voraufbereitung interessant werden.

### Conversation-Modelle

- `conversations` Tabelle erwähnt in DB-Memory-Inventar — vermutlich
  Chat-Threads pro Akteursbeziehung [?].
- `useHufChat` arbeitet aber primär auf `horse_chat_*`.
- **Drift:** zwei parallele Chat-Modelle (horse-zentriert vs.
  conversation-basiert)?

### Bewertung

| Komponente | Echtes Assistenzsystem? | Produktionsreif? | Risiken |
|---|---|---|---|
| `ai-chat` Edge | ✓ | ✓ | Halluzination, DSGVO bei Pferdedaten |
| `hufi-ai-voice-finding` | ✓ | ✓ | Halluzination im Befund |
| `analyze-hoof-image` | ✓ | ✓ | Vision-Fehlinterpretation (kein medizinisches Urteil) |
| `ai-import-agent` | ✓ | ✓ | Duplikat-Fehler, Datenschutz beim Upload |
| `hufi-brain` Greeting/Alerts | ✓ | ✓ | datengetrieben, sicher |
| `hufi-search` AI-Fallback | ✓ | ✓ | Cost-Control via 3-Stage |
| `hufi-route` | nicht KI, deterministisch | ✓ | Nearest-Neighbor sub-optimal |
| `ontology-service` | nicht KI, deterministisch | ✓ | nur so gut wie `equine_ontology` |
| `morning-briefing` | KI-frei (data-only) | ✓ | – |
| `notification-scheduler` | KI-frei (data-only) | ✓ | – |
| Ollama-Fallback | Stub | ✗ | wenig getestet |
| HufCam Vision (Befund) | UI-Stub [?] | ✗ | medizinische Aussage |

---

## 7. Backend-Orchestrierung

### Existenz-Matrix

| Komponente | Existiert? | Datei / Tabelle / Function | Risiko / Lücke |
|---|---|---|---|
| **Eventlog** | ⚠️ teilweise | `hufi_context_log`, `*_audit_log` (~20 Tabellen), `autoflow_log`, `consent_log` | Kein einheitlicher Event-Bus; jede Domäne hat eigene Audit-Tabelle |
| **Job Queue** | ❌ | – | Cron + HTTP-Trigger, keine Retry-/Backoff-/Dead-Letter-Logik |
| **Notification Engine** | ✓ | 12 Edge Functions, `notifications` Tabelle, `push_subscriptions`, FCM/Web-Push | Kein Akteurs-übergreifendes Routing ("alle, die berechtigt sind") |
| **Reminder Engine** | ✓ | `notification-scheduler` (Impf, Wurmkur, Access-Expiry, Transfer-Expiry, 7-Tage-Vorwarnung), `send-appointment-reminders`, `legal-change-reminders` | Kein zentraler `reminders` State, nur per-Use-Case |
| **AI Context Builder** | ⚠️ | `hufi-brain.ts` `fetchHufiContext()`, `hufi-context-resolver.ts` | Per-User, nicht per-Pferd |
| **User Preference Store** | ✓ | `hufi_memory` (Kategorie `preference`), `useKiSettings`, `business_settings` | Drift: 3 Stellen, kein einheitlicher Store |
| **Role Permission Engine** | ⚠️ | RLS-Policies (~898), `has_role`, `is_admin`, `is_org_member` | `app_role` ENUM nur 2 Werte; Rollen-Auto-Repair-Risiko |
| **Audit Log** | ✓ | 20 Audit-/History-Tabellen, plus `hufi_context_log` | Sehr gut, aber zerstreut |
| **Action Approval System** | ❌ | `hufi-actions.ts` mit `explanation`-Feld als Skelett | Kein UI-Pattern, keine "Approve/Reject/Modify"-Flow |
| **Background Workers** | ⚠️ | Edge Functions als Cron | Keine echten Workers, alles serverless-stateless |
| **Cron** | ✓ | pg_cron / Supabase Scheduled Functions [?] für `morning-briefing`, `notification-scheduler`, `escalate-unconfirmed`, `autoflow-monthly-checkin`, `autoflow-process-lead`, `legal-change-reminders`, `check-overdue-invoices`, `anomaly-detection`, `publish-scheduled-posts` | Cron-Konfiguration nicht im Repo erkennbar — Setup vermutlich Supabase-Dashboard-side |
| **Edge Function Orchestration** | ❌ | – | Edge Functions kennen sich nicht; Workflow-Engine fehlt |
| **Realtime Bus** | ✓ | Supabase Postgres Changes + Presence Channels (`useHufChat`) | Genutzt für Chat, nicht für Cross-Akteur-Events |

### Was zentral fehlt

1. **Ein zentraler Event-Bus** (`events` Tabelle mit Type, Payload,
   Affected-Actors, Status). Heute: jede Domäne hat eigene Audit-Logs,
   aber kein "irgendein Akteur kann auf jedes Event reagieren"-Pattern.
2. **Eine Job Queue** (z. B. `pg_cron` + `pg_jobs` / pgmq). Heute:
   Trigger/Cron sind brüchig, Retries unklar.
3. **Ein Action Approval Center** als UI- und Backend-Konzept.
4. **Ein zentraler Pferd-Agent** mit eigenem Zustand und Auslöse-
   Kontext.

### Zielbild

```
Event-Source (DB-Trigger | Edge | Cron | User-Action)
       │
       ▼
   events (zentral)  ── Routes ──► Akteur-Listeners
       │                                 │
       ├── hufi_context_log              ├── proactive-suggester
       ├── autoflow_log                  ├── notification-engine
       ├── audit_log_<domain>            ├── reminder-engine
       │                                 └── approval-queue
       ▼
  Realtime Broadcast (UI Update)
```

---

## 8. Frontend als Cockpit

### 20 % Frontend, 80 % Backend — These Bewertung

**Heute: ungefähr 50/50** (zu viel Frontend, zu wenig Orchestrierung).

Belege für zu viel Frontend:
- 102 Pages in `src/pages/`
- 21 Portal-Submodule
- 3 separate Dashboards (Dashboard, EmployeeDashboard, ClientHome)
- 5 Admin-Pages, davon mehrere Stub-mäßig (`AdminSeedDemo`,
  `AdminSmokeTest`)

Belege für reife Backend-Schicht:
- 64+ Edge Functions
- 389 Migrationen
- ~898 RLS-Policies
- AutoFlow + Notification-Scheduler

Um auf 20/80 zu kommen, müssten:
- Portal-Submodule auditiert und reduziert werden.
- 102 Pages auf ~50 Pages konsolidiert (eine Page pro Akteur-View,
  nicht pro Rolle einzeln).
- Cockpit-Pattern: ein "Hufi Today"-Dashboard, das alle anderen
  Bereiche bei Bedarf öffnet.

### Welche Screens sind manuelle Kontrollflächen?

- AdminDashboard, MissionControl, AdminSeedDemo, AdminSmokeTest —
  pure Backend-Operations-UI.
- AutoFlow-UI (in `Auffassen`/`AutoFlow.tsx`) — visualisiert
  Edge-Function-Trigger.
- Buchhaltung, Ausgaben, Lager, Hufrente — Read-/Write-Sichten auf
  DB-Tabellen.

### Welche Screens könnten durch Hufi automatisch vorbereitet werden?

- Tagesplan (`Kalender` heute manuell befüllt — Hufi könnte Tour
  vorschlagen).
- Anfragen-Triage (`Anfragen.tsx` zeigt Liste — Hufi könnte
  vorklassifizieren wie es teilweise schon mit `plan_tier` macht).
- Rechnungs-Erstellung (`Rechnungen.tsx` — Hufi-Entwurf nach jedem
  Termin, AutoFlow tut das schon teilweise).
- Befund-Eingabe (`Aufnahme.tsx` — Voice-First mit Ontologie-
  Vorausfüllung).
- Kunden-Antwort (`Chat.tsx`, `ClientChat.tsx` — Vorschlags-Reply).

### Welche Menü-Kacheln sind echte Core-Bereiche?

- Provider-Core: Dashboard, Anfragen, Kalender, Aufnahme, Pferde,
  Kunden, Rechnungen, Tour.
- Client-Core: ClientHome, ClientHorses, ClientBooking, ClientChat,
  ClientNotifications.
- Admin-Core: MissionControl, AdminDashboard.
- Partner-Core: VetDashboard, VetSOAPForm.

### Welche sind Legacy / Demo?

- Portal-Submodule (`/portal/galerie`, `/portal/versicherung`, …) —
  vermutlich Stub-Demos.
- AdminSeedDemo, AdminSmokeTest — interne Tools.
- ClientStallBoard [?].
- Buchhaltung-Seite — bei kleinem Plan-Tier ggf. nicht sichtbar
  (`PLAN_FEATURE_MAP.module_office`).

### Wo braucht es Chat / Voice?

- Voice: Aufnahme (Befund), Chat-Voice-Messages, Tour-Notizen,
  Termin-Notiz.
- Chat: Provider↔Client, Provider↔Partner, Provider↔Employee,
  Stall-weiter Channel.

### Wo bewusst KEIN Chat / Voice?

- Buchhaltung (sensible Zahlendaten).
- Plan-Wechsel / Subscription-Settings (sensitive Geld-Aktion).
- Admin-Bereich (Audit-relevant).
- Initiale DSGVO-Consent-Erklärung (textbasiert klar).

---

## 9. Legacy vs. Hufi-Core

### Kategorisierung pro Bereich

#### A — echter Hufi-Core (behalten und ausbauen)

| Bereich | Datei / Tabelle | Warum |
|---|---|---|
| Pferde-Stamm | `horses` + `hoof_*` Familie | Kern-Entität |
| Granulare Sharing-Logik | `access_grants`, `horse_partner_access`, `stall_horse_access`, `employee_horse_access` | Multi-Akteur-Plattform |
| Termin-/Tour-Logik | `appointments`, `appointment_groups`, `daily_tours`, `tour_breadcrumbs` | Operativer Kern |
| Service-/Preis-Logik | `services`, `price_groups`, `surcharge_rules`, `*_price_history` | Geschäftsmodell |
| Rechnungs-Logik | `invoices`, `partner_invoices`, `admin_invoices` | Cashflow |
| Ontologie | `equine_ontology` + `ontology-service.ts` | Domain-Sprache |
| KI-Routing | `ai-routing.ts` + Credit-System | Kostenkontrolle |
| Brain | `hufi-brain.ts` + `hufi-context-resolver.ts` + `hufi-actions.ts` + `hufi-intent.ts` | Assistenzlogik |
| AutoFlow | 4 Edge Functions + `autoflow_log` + `autoflow_settings` | Proaktivität |
| Notification-Engine | 12 Edge Functions + `notifications` + `push_subscriptions` | Reminder-Engine |
| Audit | ~20 Audit-Tabellen + `hufi_context_log` | Compliance |
| DSGVO/Legal | `legal_agreements` + `consent_log` + `legal_change_*` + `partner_data_consents` | EU-Compliance-Asset |
| Voice-Pipeline | HufiVoiceModal + Whisper + ElevenLabs + Claude | Stalltauglichkeit |
| Realtime-Chat | `useHufChat` + `horse_chat_*` + `message_reactions` | Plattform-Layer |
| Plan-Tier | `PLAN_FEATURE_MAP` + `provider_subscriptions` | Geschäftsmodell |
| Ecosystem-Sync | `ecosystem_*` + `ecosystem-webhook` [?] | Multi-Tenant-Pattern |

#### B — wertvolle Übergangslogik

| Bereich | Datei | Empfehlung |
|---|---|---|
| Memory-Layer (zwei Modelle) | `hufi_memory`, `hufi_memories` | konsolidieren auf eines, vorzugsweise pferd-zentriert |
| `partner_treatment_*` | partner_treatment_notes/plans | in horse_timeline integrieren |
| `hufi-route.ts` (Nearest-Neighbor) | hufi-route.ts | später durch echte TSP-Library oder Routing-API ersetzen |
| `ai-import-agent` | Edge | wertvoll, aber benötigt mehr Domain-Specific-Tuning |
| `botschafter_*` (Affiliate) | mehrere Pages + Edge | nur behalten, falls Pascal Affiliate-Strategie weiterführt |

#### C — HufManager-Legacy

| Bereich | Datei | Empfehlung |
|---|---|---|
| 6 Demo-Logins | `Auth.tsx:586-622`, `setup-demo-accounts` | versteckt (Commit `7c1c0e90`); Code-Reste später entfernen |
| 65 hartkodierte `hufmanager`-Strings | verteilt in `src/` | Klassifikation in *legitim* vs. *zu migrieren* — siehe ROADMAP P1 |
| 21 Portal-Submodule | `App.tsx:338+` | auditieren — was real, was Demo |
| Email-Pattern-Rollen | `lib/portal-user-detect.ts`, Auth.tsx | durch echte Rollen-Erweiterung ersetzen |
| `_archiv_hufmanager_20260425/` | `/var/www/` | bei Disk-Druck verschieben (siehe PROJECT_MAP) |
| `hufmanager-bridge/` | `/var/www/` | Zweck klären (siehe PROJECT_MAP) |

#### D — Demo / Test / Altlast

| Bereich | Datei | Empfehlung |
|---|---|---|
| `setup-demo-accounts` Edge | – | behalten als Test-Helfer, public-aufrufbar nur für Admin |
| `seed-demo-data` Edge | – | behalten |
| `AdminSeedDemo`, `AdminSmokeTest` | Pages | behalten als interne Tools |
| `MiniHufManager` Demo (`minihufmanager.assaon.com`) | Nginx | siehe PROJECT_MAP — entweder reaktivieren oder abräumen |

#### E — technische Schulden

| Bereich | Quantifizierung |
|---|---|
| ESLint-Errors | 1408 (überwiegend `any`-Typen) |
| Bundle-Größe | 1.2 MB Hauptbundle, 700 kB MissionControl |
| 102 Pages | starke Fragmentierung, Rollen-Duplikate |
| 389 Migrationen | viele Hash-Namen, kein lesbarer Audit |
| Doppelter Memory-Layer | `hufi_memory` + `hufi_memories` |
| `app_role` ENUM | 2 statt 8 Werte |
| Doku-Drift | bisherige Doku behauptete "Hufi-Memory ist Konzept" |

#### F — sofort skalierbare Zukunftskomponenten (Jarvis+ ready)

| Bereich | Warum Jarvis+ |
|---|---|
| AutoFlow-Engine | Event-Action-Pattern, einfach erweiterbar |
| `equine_ontology` | semantische Brücke, 10-Jahres-Asset |
| `hufi_context_log` | EU-AI-Act-konform |
| `ai-routing.ts` Credit-System | Cost-Control für jede Erweiterung |
| `useHufChat` | Realtime-Chat als Bot-Carrier |
| Voice-Pipeline | Stall-tauglicher Eingang |
| `notification-scheduler` | proaktive Reminder-Engine |
| `hufi-brain.ts` | Context-Engine, Erweiterungen einfach |
| `hufi-actions.ts` Approval-Skelett | Approval-Layer-Vorform |

---

## 10. Sicherheits- und Legal-Grenzen

### DSGVO

- ✓ `legal_agreements` + `consent_log` + `legal_change_notifications` +
  `legal_change_confirmations`: versionierte Vertragsakzeptanz.
- ✓ `partner_data_consents`: Pferd-Daten-Freigabe an Tierarzt mit
  expliziter Einwilligung.
- ✓ `dsgvo`-Kategorie in `hufi_memory`: Consent-Status-Memory.
- ⚠️ Lücke: Auto-Repair von Rollen aus `user_metadata` umgeht
  RLS-Audit [?].
- ⚠️ Lücke: Klare Lösch-Pfade pro Akteur (Right-to-be-Forgotten) —
  Soft-Delete vorhanden, harte Löschung mit Cascade unklar [?].

### EU AI Act

- ✓ `hufi_context_log` mit `explanation`-Feld pro KI-Aktion —
  Auditierbarkeit.
- ✓ `KiHinweisModal` und `DsgvoConsentModal` als UX-Touch.
- ✓ Approval-Skelett in `hufi-actions.ts`.
- ⚠️ Lücke: Risk-Klassifikation pro KI-Feature (Low/Limited/High-
  Risk-AI) nicht explizit dokumentiert.
- ⚠️ Lücke: Halluzinationsschutz bei medizinischen Aussagen — keine
  Filterung sichtbar.
- ⚠️ Lücke: Trainings-Daten-Provenance — wenn Hufi mit Pferdedaten
  später lernt, fehlt heute der Layer.

### Rollenrechte

- ✓ ~898 RLS-Policies decken den Großteil ab.
- ⚠️ `app_role` ENUM-Lüge: 8 Rollen werden über Hilfs-Tabellen
  und Email-Pattern geflickt.
- ⚠️ Email-Pattern-Routing
  (`isPortalBusinessEmail`, `isStallbetreiberDemoEmail`) ist
  UI-Logik, nicht RLS-gekoppelt.
- ⚠️ `service_role`-Bypass in Edge Functions ist mächtig, muss in
  jedem Edge-Function-Audit explizit geprüft werden.

### Datenfreigaben

- ✓ `access_grants` granular mit `can_view_*`-Feldern.
- ✓ `partner_data_consents` für Pferdebesitzer-Tierarzt-Sharing.
- ⚠️ Notfall-Token (`/notfall/:eqid/:token`) — Lifecycle unklar.
- ⚠️ `horse_chat_messages` — wer Akteur ist, ist sichtbar; Berechtigungen
  über RLS-Joins komplex.

### Auditierbarkeit

- ✓ 20 Audit-Tabellen.
- ✓ `hufi_context_log` für jede KI-Aktion.
- ✓ `consent_log` für DSGVO.
- ⚠️ Cross-Tabellen-Suche: Audit-Pfad einer einzelnen Aktion über
  alle Audit-Tabellen ist mühsam.

### Sensible AI-Aktionen

| Aktion | Schutzbedarf | Heute? |
|---|---|---|
| Befund-Generierung aus Voice | medizinisch | ⚠️ Halluzinationsrisiko, kein Filter sichtbar |
| Vision-Analyse von Hufbildern | medizinisch | ✓ explizit *nicht* medizinisch (nur Bildqualität) |
| Kunden-E-Mail-Generierung | Kommunikation | ⚠️ kein Approval-UX-Pattern |
| Rechnungs-Entwurf | finanziell | ✓ `autoflow-auto-invoice` als Draft, nicht final |
| Tour-Optimierung | logistisch | ✓ deterministisch |
| Lead-Klassifikation (BHS-Tier) | geschäftlich | ⚠️ ML-Output, sollte als Vorschlag bleiben |

### Medizinische Aussagen

- ✓ `analyze-hoof-image` ist explizit auf Bildqualität beschränkt.
- ⚠️ `hufi-ai-voice-finding` produziert Befund-Texte mit
  `dringend_tierarzt`-Flag — das ist ein medizinisches Urteil [?].
  Sollte als "Vorschlag, keine Diagnose" markiert sein.
- ⚠️ Tierarznei-Mittel-Erwähnung: keine Filterung sichtbar.

### Zahlungs-/Rechnungsaktionen

- ✓ Rechnung-Erstellung bleibt manuell oder als Draft (AutoFlow).
- ⚠️ Mahnung: `admin_dunning_log` existiert, automatischer Versand
  unklar.
- ⚠️ Plan-Tier-Wechsel: über `copecart-webhook` getriggert,
  Sicherheit der Webhook-Validierung unverifiziert [?].

### Kundenkommunikation

- ⚠️ `autoflow-customer-notify` (3 Modi: tour_eta, feedback_request,
  appointment_upcoming) sendet *automatisch* Notifications an
  Kunden — Schwelle, ab wann das Approval bräuchte, unklar.
- ✓ `send-appointment-reminders`: rein zeitbasiert, niedriges Risiko.

### Ziel: Hufi darf alles wissen, aber nicht alles ungeprüft tun

| Wissen | Erlaubt | Tun | Approval |
|---|---|---|---|
| Pferd-Status, Besitzer, Provider | ja | sehen, zusammenfassen | nein |
| Termine, Touren | ja | erinnern, vorbereiten | Verschieben → ja |
| Rechnungen, Mahnstand | ja | priorisieren, Entwurf | Versenden → ja |
| Befunde, Diagnosen | ja | strukturieren, suggerieren | Finalisieren → ja, immer |
| Kunden-Kommunikation-Historie | ja | Antwort-Vorschlag | Senden → ja, immer |
| Geld, Plan-Tier, Subscription | ja | melden, Risiko markieren | Wechseln → ja |
| Zugriffsrechte | ja | melden, vorschlagen | Erteilen/Entziehen → ja |
| Externe Branchen-Daten | ja | einbinden | Teilen → ja |

---

## 11. Zielarchitektur Hufi Core + Hufi Brain + Hufi Voice + Hufi Network

### Hufi Core

**Zweck:** Daten-Fundament. Alles, was operativ stabil sein muss.

| Komponente | Soll-Zustand |
|---|---|
| **Daten** | konsolidiertes Schema mit `horse_owners`, `horse_caregivers`, `horse_state`, `horse_timeline` |
| **Rollen** | `app_role` ENUM auf 8 Werte erweitert; Email-Pattern-Logik abgelöst |
| **Pferdeakte** | Pferd hat eine eigene Wahrheit, nicht n Akteur-Sichten |
| **Termine** | Multi-Akteur-Termine als First-Class-Citizen (`appointment_participants` Tabelle) |
| **Rechnungen** | unverändert; AutoFlow-Drafts bleiben Draft |
| **Freigaben** | konsolidierte `horse_caregivers`-Tabelle statt 4 separate |
| **Kommunikation** | `useHufChat` bleibt, aber Pferd-Kanal ist Default |
| **Dokumente** | `horse_documents` mit Versionierung + Pflichtfelder (Equidenpass etc.) |
| **Multi-Tenant-Sicherheit** | RLS unverändert, plus Org-übergreifende Audit-Reports |

### Hufi Brain

**Zweck:** Kontext, Entscheidungslogik, Assistenz.

| Komponente | Soll-Zustand |
|---|---|
| **Kontextspeicher** | konsolidierter Memory-Layer: `horse_memory` (pferd-zentriert) + `user_memory` (akteur-zentriert) + `relation_memory` (akteur×pferd-zentriert) |
| **Event-Verarbeitung** | zentraler `events`-Bus; Akteur-Listener; Job-Queue mit Retries |
| **Assistenzlogik** | `hufi-brain.ts` erweitert um per-Pferd-Agent + per-Akteur-Agent + System-Agent |
| **AI Context Builder** | Pseudonymisierungs-Layer vor Cloud-AI; Privatsphäre-Filter; Trainings-Daten-Provenance |
| **Daily Briefing** | `morning-briefing` erweitern um per-Akteur-Personalisierung + Pferd-zentrierte Highlights |
| **Reminder Engine** | `notification-scheduler` erweitern um Wetter, Geo, Pferd-Pattern |
| **Action Suggestions** | `hufi-actions.ts` als Suggestion-Queue mit `Approve/Reject/Modify` UX |
| **Approval Layer** | neuer `hufi_approvals` Tabelle: jede sensitive Aktion landet hier; UI-Card pro Approval |
| **Memory Layer** | siehe Kontextspeicher |

### Hufi Voice

**Zweck:** Stall-tauglicher Eingang.

| Komponente | Soll-Zustand |
|---|---|
| **Spracheingabe** | `HufiVoiceModal` bleibt, plus Voice-Befehl-Modus ("Hufi, lege Termin an") |
| **STT** | Whisper (lokal, Standard) + ElevenLabs (Cloud, optional für höhere Genauigkeit) |
| **Intent Detection** | `hufi-intent.ts` erweitert um agent_proactive, agent_action, agent_lookup, knowledge, emergency |
| **Befund-Dokumentation** | `hufi-ai-voice-finding` als Default-Pfad in `Aufnahme.tsx` |
| **Terminabschluss** | Voice-First, mit Bestätigungs-TTS [optional] |
| **Sicherheitsbestätigung** | jede sensible Aktion: Voice-Eingabe → strukturiertes Modal → Approval-Fingertipp |

### Hufi Network

**Zweck:** Rollenübergreifender Austausch zwischen Akteuren am Pferd.

| Komponente | Soll-Zustand |
|---|---|
| **Rollenübergreifender Austausch** | Pferd-Kanal als Default-Kommunikationsraum, nicht 1:1-Chats |
| **Pferdezentrierte Freigaben** | `horse_caregivers` mit Permission-Matrix |
| **Dienstleister-Netzwerk** | `partners`-Sicht erweitern: Tierarzt sieht Hufbearbeiter-Termine eines geteilten Pferdes (mit Consent) |
| **Stall-/Besitzer-/Provider-Verknüpfung** | Stallbetreiber-View als "Stall-Cockpit" mit allen Pferden, Akteuren, Terminen |

---

## 12. Konkrete Erkenntnisse

### Die 20 wichtigsten Erkenntnisse

1. **Hufi-Layer existiert real**, nicht "Konzept". 11 `hufi-*.ts`-Module,
   2 Memory-Tabellen, 7+ KI-Edge-Functions, AutoFlow-Engine,
   12 Notification-Edge-Functions live.
2. **`access_grants` ist das beste Architektur-Stück** — granular,
   audit-fähig, RLS-kompatibel.
3. **`equine_ontology` ist 10-Jahres-Asset** — domänenspezifische
   Sprach-Brücke.
4. **AutoFlow ist echter Event-Action-Engine** — Multi-Modus
   (manual/suggest/auto), `autoflow_log`-Audit.
5. **Voice-Pipeline End-to-End funktional** (Whisper + ElevenLabs +
   Claude + HufiVoiceModal).
6. **EU-AI-Act-Compliance eingebaut**, nicht nachgerüstet
   (`hufi_context_log`, `legal_change_*`, `partner_data_consents`).
7. **`horses.owner_id` ist single-owner** — blockiert Multi-Owner-
   Realität.
8. **`hufi_memory` ist user-zentriert, nicht pferd-zentriert** —
   architektonisch falsch für Hufi-Vision.
9. **Zwei parallele Memory-Modelle** sind Drift, nicht bewusste Wahl.
10. **`app_role` ENUM hat nur 2 Werte** für 8 UI-Rollen.
11. **`useAuth.tsx` Auto-Repair aus `user_metadata.role`** ist
    potenzielles Privilege-Escalation-Risiko [? muss verifiziert werden].
12. **21 Portal-Submodule sind Altlast** aus SaaS-/Investorenphase.
13. **102 Pages sind Lovable-Fragmentation**.
14. **389 Migrationen ohne sprechende Namen** — kein lesbarer
    Audit-Pfad.
15. **`PLAN_FEATURE_MAP` ist granular**: Module + AutoFlow-Toggles
    pro Tier — ungenutzt für Hufi-Tier-Logik [?].
16. **`notification-scheduler` überwacht Impfungen, Wurmkur,
    Access-Expiry** — proaktive Reminder schon real.
17. **`escalate-unconfirmed` eskaliert unbestätigte Termine** —
    soft-touch-Pattern existiert.
18. **`legal-change-*` ist vollständiges Compliance-Versionierungs-
    System** — über die meisten Mitbewerber.
19. **`hufi-search` macht AI nur als 3. Stufe** — Cost-Control
    eingebaut.
20. **Ecosystem-System** (`ecosystem_*`-Tabellen, `ecosystem-webhook`)
    ist Multi-Hufi-Sync-Pattern angedeutet — funktional unklar [?].

### Die 10 größten Risiken

1. **Single-Owner-Pferd** blockiert Hufi-Vision.
2. **Doppelter Memory-Layer** macht Hufi-Brain widersprüchlich.
3. **Email-Pattern-Rollen** sind sicherheitskritisch.
4. **Auto-Repair aus user_metadata.role** ist Privilege-Escalation-
   Verdacht [?].
5. **Portal-Submodule** als Demo-Stub-Felder mit echtem Code-
   Footprint.
6. **Bundle-Größe (1.2 MB)** — Mobile-Bandbreite.
7. **Lint-Schulden (1408 Errors)** — externe Mitwirkende blockiert.
8. **`app_role` ENUM-Lüge** — jede neue Rolle braucht Hilfs-Flicken.
9. **Migrations-Wust** — 389 Files ohne lesbaren Audit-Pfad.
10. **Halluzinations-Risiko bei `hufi-ai-voice-finding`-Befunden** —
    medizinische Aussagen (`dringend_tierarzt`-Flag) ohne Filter.

### Die 10 größten Chancen

1. **`equine_ontology` ausbauen** zur reichsten Pferd-Sprach-DB.
2. **`access_grants` zu `horse_caregivers`-Konsolidierung** machen.
3. **`horse_timeline` einführen** als zentralen Event-Stream.
4. **AutoFlow um Multi-Akteur-Trigger erweitern**.
5. **Voice-First-UX** als Markenmerkmal ausbauen.
6. **Hufi-Brain pferd-zentriert refactoren**.
7. **EU-AI-Act-Compliance vermarkten** — Wettbewerbsvorteil.
8. **`equine_ontology` für semantische Suche** über Provider hinweg.
9. **Ecosystem-Sync-Layer** als White-Label-Plattform-Pattern [?].
10. **`PLAN_FEATURE_MAP` an Hufi-Tier-Logik koppeln** — Hufi-Funktionen
    pro Plan staffeln.

### Die 10 Architekturentscheidungen, die Pascal treffen muss

1. **Pferd-zentriert oder user-zentriert?** Beeinflusst alles.
2. **Memory-Layer konsolidieren** — `hufi_memory` vs. `hufi_memories`
   auf eine Wahrheit.
3. **`app_role` ENUM erweitern** auf 8 Rollen.
4. **`horse_owners` Junction-Table einführen** — Multi-Owner.
5. **`horse_timeline` einführen** — Event-Stream pro Pferd.
6. **Portal-Submodule auditieren und reduzieren** — was real, was
   Demo.
7. **Migrations-Naming-Konvention** etablieren.
8. **`src/features/`-Struktur** aktivieren statt 102 Pages.
9. **Hufi-Agent-Modell formalisieren** — Per-Pferd-Agent,
   Per-Akteur-Agent, System-Agent.
10. **Subscription-/Credit-System** verbindlich für KI-Funktionen.

### Die 10 Dinge, die NICHT jetzt gebaut werden dürfen

1. **Stimmerkennung pro Person** — Pascal hat das als Nicht-Ziel
   markiert.
2. **Autonome Mahnung-Versendung** — sensibel, gehört in Approval.
3. **Autonome Kunden-E-Mail-Versendung**.
4. **Massen-Replace der `hufmanager`-Strings** — erst klassifizieren.
5. **Branding-Migration** weg von HufManager — `ROADMAP.md` "Nicht
   jetzt".
6. **Zweite Hufi-Codebase** (z. B. eigene React-App).
7. **Per-Pferd-Agent als autonomer Bot** ohne Rollen-Filter.
8. **Cloud-AI-Training mit Pferdedaten** ohne Pseudonymisierungs-Layer.
9. **Großer Refactor während aktiver Recovery**.
10. **Öffentliche Kommunikation des 2030-Big-Picture**.

### Die 10 Dinge, die als Nächstes analysiert werden müssen

1. **`useAuth.tsx` Auto-Repair-Pattern** auf Privilege-Escalation
   prüfen.
2. **`hufi_memory` vs. `hufi_memories`** — bewusst beide oder Drift?
3. **Welche Portal-Submodule sind funktional**, welche Stub?
4. **`ecosystem_*`-Tabellen-Funktion** verifizieren.
5. **`botschafter_*`-System** — aktiv genutzt oder Altlast?
6. **`copecart-webhook`-Sicherheit** — HMAC-Validierung?
7. **`partner_treatment_plans`-Lifecycle** — wer darf finalisieren?
8. **`notifications.user_id` vs. potenzielle `horse_id`-Bindung**.
9. **`horse_chat_*` vs. `conversations`** — zwei Chat-Modelle?
10. **Cron-Setup für Edge Functions** — wo konfiguriert? [Supabase
    Dashboard, vermutlich nicht im Repo].

---

## 13. Nächster sinnvoller Schritt

**Genau ein Schritt:**

**Verifikations-Audit von 5 Hochrisiko-Punkten**, ausschließlich
read-only, kein Refactor, kein Commit:

1. **`useAuth.tsx`** Zeilen 50–72 vollständig lesen + Trigger
   `on_auth_user_created` in Migrationen prüfen → klären, ob das
   Auto-Repair-Pattern eine echte Privilege-Escalation-Lücke ist.
2. **`hufi_memory`-Tabelle vs. `hufi_memories`-Tabelle** — beide
   Migrationen lesen, prüfen ob sie bewusst koexistieren oder
   eine wegmigriert werden müsste.
3. **`horse_chat_*` vs. `conversations`** — beide Schemas anschauen,
   klären ob es zwei Chat-Modelle gibt.
4. **Portal-Submodule** (21 Stück) — pro Submodul prüfen, ob die
   Page nur Stub ist oder echte Logik hat.
5. **`copecart-webhook`** Edge Function vollständig lesen — prüfen
   ob HMAC-Signatur validiert wird.

**Warum:** Diese 5 Punkte sind die einzigen, bei denen ich heute
nicht ehrlich "ja/nein" sagen kann, und sie betreffen
Sicherheits-/Architektur-Kernfragen.

**Welche Dateien betroffen wären:**
- `/hufiapp/src/hooks/useAuth.tsx`
- `/hufiapp/supabase/migrations/*` (gefiltert nach `hufi_memor`,
  `conversations`, `horse_chat`)
- `/hufiapp/src/pages/portal/*` (21 Pages)
- `/hufiapp/supabase/functions/copecart-webhook/index.ts`

**Risiko:** **LOW** — reine Lese-Analyse, keine Code-Änderung,
kein Deploy. Output ist ein Update dieser Datei oder ein
separates `docs/HUFI_VERIFICATION_AUDIT.md` mit den fünf
Klärungs-Befunden.

---

## HufAI — Phase-Status (Nachtrag 2026-05-11)

**HufiApp** = Shell / Gerät / Workflow-Oberfläche.
**HufAI** = Kern-Produkt, die Intelligenzschicht.
Leitfrage: "Macht das HufAI intelligenter?"
Vision: "Jedes Pferd bekommt eine Stimme."

| Phase | Name | Status |
|---|---|---|
| A–C | Voice Greeting, Push-to-Talk, Nav | ✅ live |
| D | Wake-Layer "Hey Hufi" | ✅ live |
| E | Proaktives Briefing (regel-basiert) | ✅ live |
| F | Multimodales Pferde-Gedächtnis | geplant |
| G | Offline HufAI Runtime | später |

HufAI ersetzt keine Tierärzte und stellt keine medizinische Diagnose.

---

## Schlussbemerkung

Hufi/HufManager ist **architektonisch reifer als die interne Doku
suggeriert** und **strategisch fragmentierter als die operative
Realität verträgt**. Die KI-Schicht, das Audit-Modell, die Ontologie,
AutoFlow und der Notification-Scheduler sind echte Hufi-DNA-Assets.
Die Portal-Submodule, der single-owner-Pferd und der doppelte
Memory-Layer sind Hindernisse für die "ein Pferd, mehrere
Akteure, ein KI-Begleiter"-Vision.

Die wichtigste Einzelentscheidung bleibt:
**Pferd-zentriert refactorisieren, bevor Hufi-Vision öffentlich wird.**
Alle anderen Architektur-Entscheidungen folgen daraus.

Diese Datei ist Snapshot vom 2026-05-11. Sie wird stale, sobald sich
das Datenmodell, die Migrationen, die KI-Schicht oder die
Notification-Engine weiterentwickeln.
