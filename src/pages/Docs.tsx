import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Search, BookOpen, Shield, Code, FileText, ExternalLink, Printer, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

interface DocSection {
  id: string;
  title: string;
  content: string;
  subsections?: { id: string; title: string; content: string }[];
}

const userDocs: { category: string; sections: DocSection[] }[] = [
  {
    category: "Erste Schritte",
    sections: [
      {
        id: "registrierung",
        title: "Registrierung & Login",
        content: "Nach der Registrierung wirst du durch einen kurzen Setup-Assistenten geführt. In 3 Minuten hast du dein Profil eingerichtet, deinen ersten Kunden angelegt und bist startklar.",
        subsections: [
          { id: "reg-email", title: "Mit E-Mail registrieren", content: "Gib deinen Namen und deine E-Mail ein. Du erhältst einen Bestätigungslink. Klick drauf, fertig — du bist drin.\n\n[SCREENSHOT: Registrierungsformular mit ausgefüllten Feldern]" },
          { id: "reg-profil", title: "Profil vervollständigen", content: "Der Setup-Wizard fragt dich nach Betriebsname, Adresse und Logo. Alles kannst du auch später ändern unter Einstellungen." },
        ],
      },
      {
        id: "setup-wizard",
        title: "Setup-Wizard",
        content: "Der Wizard führt dich in 5 Schritten zum produktiven Start:\n\n1. **Betriebsprofil** — Name, Adresse, Logo\n2. **Erster Kunde** — Name und Telefonnummer reichen\n3. **Erstes Pferd** — Name und Rasse zuordnen\n4. **Erster Termin** — Datum wählen und Pferd zuweisen\n5. **Erste Rechnung** (optional) — wird automatisch als PDF erstellt\n\n[SCREENSHOT: Setup-Wizard Fortschrittsbalken]",
      },
      {
        id: "navigation",
        title: "Navigation & Aufbau",
        content: "Links findest du die Hauptnavigation mit allen Modulen. Oben rechts erreichst du Benachrichtigungen, Einstellungen und Hilfe. Auf dem Handy wird die Navigation über das Menü-Symbol erreichbar.\n\n[SCREENSHOT: Dashboard mit markierter Navigation]",
      },
    ],
  },
  {
    category: "Tägliche Arbeit",
    sections: [
      {
        id: "kunden",
        title: "Kunden verwalten",
        content: "Unter **Kunden** siehst du alle Pferdebesitzer auf einen Blick. Du kannst Kunden manuell anlegen oder per Einladungslink einladen — dann füllen sie ihre Daten selbst aus.",
        subsections: [
          { id: "kunden-anlegen", title: "Kunden anlegen", content: "Klick auf \"Neuer Kunde\". Name und Telefonnummer reichen für den Anfang. E-Mail ist optional, wird aber für Rechnungsversand benötigt.\n\n[SCREENSHOT: Neuer Kunde Dialog]" },
          { id: "kunden-einladen", title: "Kunden per Link einladen", content: "Unter Einstellungen findest du deinen persönlichen Einladungslink. Teile ihn per WhatsApp oder E-Mail — der Kunde registriert sich und wird automatisch mit dir verbunden." },
        ],
      },
      {
        id: "pferde",
        title: "Pferdeakten",
        content: "Jedes Pferd bekommt eine digitale Akte mit Stammdaten, Huftyp, medizinischer Historie und Fotos. Die Akte wächst mit jedem Termin automatisch.\n\n[SCREENSHOT: Pferdeakte mit Huffotos]",
      },
      {
        id: "termine",
        title: "Termine & Kalender",
        content: "Im **Kalender** planst du deine Termine. Du siehst Tages-, Wochen- und Monatsansicht. Termine können mit Kunden, Pferden und Services verknüpft werden.\n\nDeine Kunden werden automatisch per Benachrichtigung an den Termin erinnert.",
        subsections: [
          { id: "termin-erstellen", title: "Termin erstellen", content: "Klick auf einen Tag im Kalender oder den \"+\" Button. Wähle Kunde, Pferd und Service — fertig. Der Preis wird automatisch aus deiner Preisliste übernommen." },
          { id: "termin-tour", title: "Touren planen", content: "Wenn du mehrere Kunden am selben Tag besuchst, gruppiert HufManager die Termine nach Standort. So sparst du Fahrzeit.\n\n[SCREENSHOT: Tourenplanung mit Kartenansicht]" },
        ],
      },
      {
        id: "hufcam",
        title: "HufCam & Hufanalyse",
        content: "Mit HufCam machst du Fotos direkt aus der App und speicherst sie in der Pferdeakte. So dokumentierst du den Verlauf und hast Vorher-Nachher-Vergleiche immer zur Hand.",
      },
      {
        id: "arbeitsmodus",
        title: "Arbeitsmodus",
        content: "Im **Arbeitsmodus** siehst du nur den aktuellen Termin — ohne Ablenkung. Perfekt wenn du am Pferd stehst und schnell Notizen, Fotos oder die Unterschrift erfassen willst.\n\n[SCREENSHOT: Arbeitsmodus mit Termindetails]",
      },
    ],
  },
  {
    category: "Finanzen",
    sections: [
      {
        id: "rechnungen",
        title: "Rechnungen",
        content: "HufManager erstellt professionelle PDF-Rechnungen mit einem Klick. Die Rechnung wird automatisch mit den richtigen Beträgen, Kundendaten und deiner Steuernummer gefüllt.\n\nDu kannst sie direkt per E-Mail versenden — kein Ausdrucken nötig.",
        subsections: [
          { id: "rechnung-erstellen", title: "Rechnung erstellen", content: "Gehe zu **Rechnungen** → \"Neue Rechnung\". Wähle den Kunden und die erbrachten Leistungen. HufManager berechnet den Betrag automatisch aus deiner Preisliste.\n\n[SCREENSHOT: Rechnungserstellung]" },
          { id: "rechnung-versand", title: "Rechnung versenden", content: "Klick auf \"Per E-Mail senden\" — der Kunde erhält die Rechnung als PDF. Du siehst den Status: Entwurf → Versendet → Bezahlt." },
        ],
      },
      {
        id: "ausgaben",
        title: "Ausgaben",
        content: "Erfasse deine Betriebsausgaben mit Kategorie, Betrag und Beleg. Am Jahresende hast du alles bereit für die Steuererklärung.",
      },
      {
        id: "buchhaltung",
        title: "Buchhaltung & EÜR",
        content: "Die Einnahmen-Überschuss-Rechnung wird automatisch aus deinen Rechnungen und Ausgaben erstellt. Exportiere sie als DATEV-Datei für deinen Steuerberater.\n\n[SCREENSHOT: EÜR-Übersicht]",
      },
    ],
  },
  {
    category: "Team",
    sections: [
      {
        id: "team-modul",
        title: "Team-Verwaltung",
        content: "Hast du Mitarbeiter? Im **Team-Modul** lädst du sie ein und weist ihnen Termine zu. Du siehst wer was wann gemacht hat und kannst Arbeitszeiten und Material verfolgen.",
        subsections: [
          { id: "team-einladen", title: "Mitarbeiter einladen", content: "Klick auf \"Mitarbeiter einladen\" und gib Name und E-Mail ein. Der Mitarbeiter erhält einen Link und kann sich mit seiner eigenen App anmelden." },
          { id: "team-rechte", title: "Rechte & Rollen", content: "Du bestimmst was jeder Mitarbeiter sehen und tun darf: Nur eigene Termine? Kundendaten einsehen? Material bestellen? Alles einstellbar." },
        ],
      },
    ],
  },
  {
    category: "Einstellungen",
    sections: [
      {
        id: "betriebsprofil",
        title: "Betriebsprofil",
        content: "Unter **Einstellungen** verwaltest du: Betriebsname, Logo, Adresse, Steuernummer, Bankverbindung. Diese Daten erscheinen auf deinen Rechnungen und deiner öffentlichen Seite.",
      },
      {
        id: "preisliste",
        title: "Preisliste & Services",
        content: "Lege deine Leistungen mit Preisen an. Du kannst verschiedene Preisgruppen erstellen (z.B. Standard, VIP, Großstall) und individuelle Preise pro Kunde vergeben.\n\n[SCREENSHOT: Mein Angebot Preismatrix]",
      },
      {
        id: "webseite",
        title: "Eigene Webseite",
        content: "HufManager erstellt automatisch eine professionelle Webseite für dich. Kunden finden dich online, sehen deine Leistungen und können Termine anfragen.\n\nDeine Seite: hufmanager.app/p/dein-name",
      },
      {
        id: "kalender-sync",
        title: "Kalender-Synchronisation",
        content: "Synchronisiere deine HufManager-Termine mit deinem iPhone-, Android- oder Outlook-Kalender. So hast du alle Termine immer dabei — auch offline.",
      },
    ],
  },
];

const legalDocs: DocSection[] = [
  {
    id: "architektur-uebersicht",
    title: "Technische Architektur (Übersicht)",
    content: "HufManager ist eine webbasierte Software-as-a-Service (SaaS) Plattform für Hufbearbeiter und Hufschmiede. Die Anwendung läuft vollständig in der Cloud auf europäischen Servern.\n\n**Frontend:** Moderne Single-Page-Application (SPA), gehostet auf einem CDN mit Standorten in der EU.\n\n**Backend:** Supabase (PostgreSQL-Datenbank, Authentifizierung, Echtzeit-Funktionen). Rechenzentrum: **Frankfurt am Main, Deutschland** (AWS eu-central-1).\n\n**Serverlose Funktionen:** Edge Functions für geschäftslogische Prozesse wie Rechnungsgenerierung und Erinnerungen.\n\n**Keine eigenen Server:** HufManager betreibt keine eigenen physischen oder virtuellen Server. Alle Infrastruktur wird über zertifizierte Cloud-Anbieter bereitgestellt.",
  },
  {
    id: "datenspeicherung",
    title: "Datenspeicherung",
    content: "**Speicherort:** Alle Daten werden in einer PostgreSQL-Datenbank bei Supabase gespeichert. Rechenzentrum: Frankfurt am Main (AWS eu-central-1).\n\n**Verschlüsselung:**\n- Daten in Ruhe: AES-256 Verschlüsselung auf Festplattenebene\n- Daten in Transit: TLS 1.3 für alle Verbindungen\n- Backups: Tägliche automatische Backups, verschlüsselt\n\n**Aufbewahrungsfristen:**\n\n| Datenkategorie | Frist | Rechtsgrundlage |\n|---|---|---|\n| Rechnungen | 10 Jahre | § 14b UStG, § 147 AO |\n| Geschäftskorrespondenz | 6 Jahre | § 147 AO |\n| Chat-Nachrichten | 180 Tage | Berechtigtes Interesse |\n| Audit-Logs | 365 Tage | Berechtigtes Interesse |\n| Gelöschte Datensätze (Soft-Delete) | 90 Tage | Datensparsamkeit |\n| Profilfotos & Hufbilder | Bis zur Löschung durch Nutzer | Einwilligung |\n\n**Löschkonzept:** Daten werden zunächst als \"gelöscht\" markiert (Soft-Delete) und nach 90 Tagen unwiderruflich entfernt. Rechnungsdaten unterliegen der gesetzlichen Aufbewahrungsfrist.",
  },
  {
    id: "sicherheitsmassnahmen",
    title: "Sicherheitsmaßnahmen",
    content: "**Zugriffskontrolle (Row-Level Security / RLS):**\nJede Datenbankzeile ist durch Zugriffsregeln geschützt. Ein Hufbearbeiter sieht nur seine eigenen Daten. Kunden sehen nur ihre eigenen Pferde und Termine. Diese Regeln werden serverseitig erzwungen — sie können nicht vom Browser umgangen werden.\n\n**Authentifizierung:**\n- Passwörter: bcrypt-Hashing (Supabase Auth)\n- Leaked-Password-Schutz aktiviert\n- Passwort-Wiederherstellung per E-Mail\n- Optionale Zwei-Faktor-Authentifizierung\n\n**Audit-Logs:**\nAlle sicherheitsrelevanten Aktionen werden protokolliert: Login, Datenänderungen, Löschungen, Zugriffsvergaben. Logs werden 365 Tage aufbewahrt.\n\n**Soft-Delete:**\nDaten werden nie sofort gelöscht. Gelöschte Datensätze bleiben 90 Tage wiederherstellbar, werden dann automatisch bereinigt.\n\n**Weitere Maßnahmen:**\n- HTTPS/TLS 1.3 für alle Verbindungen\n- Security Headers (CSP, HSTS, X-Frame-Options)\n- Rate-Limiting für Formulare und API-Endpunkte\n- Regelmäßige Sicherheits-Scans",
  },
  {
    id: "subprozessoren",
    title: "Subprozessoren",
    content: "| Anbieter | Zweck | Standort | Zertifizierungen |\n|---|---|---|---|\n| **Supabase Inc.** | Datenbank, Authentifizierung, Dateispeicher, Edge Functions | Frankfurt/Main, DE (AWS eu-central-1) | SOC 2 Type II, ISO 27001, HIPAA-fähig |\n| **Google (Gemini API)** | KI-gestützte Textgenerierung (z.B. AutoFlow-Vorschläge) | EU-Endpunkt | ISO 27001, SOC 2/3. **Keine Speicherung** von Nutzerdaten durch Google. |\n| **Stripe Inc.** | Zahlungsabwicklung (nur für Abo-Zahlungen an HufManager) | EU | PCI DSS Level 1, SOC 2 Type II |\n| **CopeCart GmbH** | Abo-Verwaltung & Checkout | Deutschland | DSGVO-konform, deutsches Unternehmen |\n| **Vercel Inc.** | CDN / Frontend-Hosting | Frankfurt/Main, DE | SOC 2 Type II |\n\n**Hinweis:** Es werden keine Kundendaten (Pferdebesitzer-Daten) an Subprozessoren weitergegeben, die nicht für den technischen Betrieb zwingend erforderlich sind. Die KI-Funktion (Gemini) verarbeitet nur anonymisierte Textfragmente und speichert keine Daten.",
  },
  {
    id: "dsgvo",
    title: "DSGVO-Maßnahmen",
    content: "**Rechtsgrundlagen nach Art. 6 DSGVO:**\n- Vertragserfüllung (Art. 6 Abs. 1 lit. b): Nutzerkonto, Terminverwaltung, Rechnungen\n- Berechtigtes Interesse (Art. 6 Abs. 1 lit. f): Sicherheitslogs, Fehleranalyse\n- Einwilligung (Art. 6 Abs. 1 lit. a): Cookies auf Landingpage, optionale KI-Features\n- Gesetzliche Pflicht (Art. 6 Abs. 1 lit. c): Rechnungsaufbewahrung\n\n**Betroffenenrechte (Art. 15-22):**\n- **Auskunft (Art. 15):** Nutzer können alle gespeicherten Daten einsehen und exportieren\n- **Berichtigung (Art. 16):** Alle Daten können vom Nutzer selbst geändert werden\n- **Löschung (Art. 17):** Self-Service-Kontolöschung mit vollständigem Datenlöschprozess\n- **Datenübertragbarkeit (Art. 20):** JSON- und CSV-Export aller Daten\n- **Widerspruch (Art. 21):** KI-Funktionen können jederzeit deaktiviert werden\n\n**Technisch-organisatorische Maßnahmen (TOMs):**\n1. Verschlüsselung aller Daten (at rest & in transit)\n2. Pseudonymisierung in Logs (SHA-256 Hashing von PII)\n3. Zugriffskontrolle durch Row-Level Security\n4. Regelmäßige Datensicherungen\n5. Mandantentrennung durch datenbankgestützte Isolation\n6. Protokollierung aller Zugriffe (Audit-Trail)\n7. Cookie-Consent auf öffentlichen Seiten\n8. Auftragsverarbeitungsvertrag (AVV) für Berufsanwender\n9. Verarbeitungsverzeichnis nach Art. 30 DSGVO\n10. Datenschutz-Folgenabschätzung nicht erforderlich (kein Hochrisiko-Processing)",
  },
  {
    id: "ai-act",
    title: "EU AI Act (KI-Verordnung)",
    content: "**Risikoklassifizierung:** Minimales Risiko\n\nHufManager setzt KI ausschließlich für Textvorschläge und Assistenzfunktionen ein (z.B. automatische Erinnerungstexte, Terminvorschläge). Es findet keine biometrische Identifikation, kein Social Scoring und keine automatisierte Entscheidungsfindung statt.\n\n**Transparenzmaßnahmen:**\n- Alle KI-generierten Inhalte werden mit dem Hinweis \"KI-generierter Inhalt\" gekennzeichnet\n- Nutzer können KI-Funktionen jederzeit deaktivieren (Einstellungen → KI-Features)\n- Die Datenschutzerklärung enthält einen eigenen Abschnitt zum KI-Einsatz\n\n**Eingesetztes KI-Modell:** Google Gemini (API-basiert)\n- Keine Speicherung von Eingabedaten durch Google\n- EU-Endpunkt für Datenverarbeitung\n- Keine Trainingsnutzung von Nutzerdaten",
  },
  {
    id: "behoerden-kontakt",
    title: "Kontakt für Behördenanfragen",
    content: "Anfragen von Datenschutzbehörden, Aufsichtsbehörden oder Strafverfolgungsbehörden richten Sie bitte an:\n\n**E-Mail:** datenschutz@hufmanager.de\n\n**Postadresse:**\nHufManager\nz.Hd. Datenschutzbeauftragter\n[Adresse auf Anfrage]\n\n**Reaktionszeit:** Wir antworten auf Behördenanfragen innerhalb von 72 Stunden.\n\n**Zuständige Aufsichtsbehörde:**\nLandesbeauftragte(r) für Datenschutz und Informationsfreiheit des jeweiligen Bundeslandes.",
  },
];

const devDocs: DocSection[] = [
  {
    id: "systemarchitektur",
    title: "Systemarchitektur",
    content: "```\n┌─────────────────────────────────────────────────┐\n│                   Frontend                       │\n│   React 18 + TypeScript + Vite + Tailwind CSS    │\n│   PWA-fähig, Offline-First (IndexedDB)           │\n└──────────────────────┬──────────────────────────┘\n                       │ HTTPS/TLS 1.3\n┌──────────────────────▼──────────────────────────┐\n│              Supabase Backend                    │\n│  ┌─────────────┐ ┌──────────┐ ┌──────────────┐  │\n│  │ PostgreSQL  │ │ Auth     │ │ Storage      │  │\n│  │ + RLS       │ │ (GoTrue) │ │ (S3-compat.) │  │\n│  └─────────────┘ └──────────┘ └──────────────┘  │\n│  ┌─────────────┐ ┌──────────┐                    │\n│  │ Edge Fns    │ │ Realtime │                    │\n│  │ (Deno)      │ │ (WS)     │                    │\n│  └─────────────┘ └──────────┘                    │\n│  Standort: Frankfurt/Main (eu-central-1)         │\n└──────────────────────┬──────────────────────────┘\n                       │\n┌──────────────────────▼──────────────────────────┐\n│         Externe Services                         │\n│  Google Gemini API (KI) │ Stripe │ CopeCart      │\n└─────────────────────────────────────────────────┘\n```\n\n**Tech Stack:**\n- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion\n- **State Management:** TanStack Query (mit IndexedDB Persistenz)\n- **Backend:** Supabase (PostgreSQL 15, GoTrue Auth, Deno Edge Functions)\n- **KI:** Google Gemini API\n- **Payments:** Stripe + CopeCart Webhooks",
  },
  {
    id: "datenbankschema",
    title: "Datenbankschema",
    content: "**Kernkonzept — Das Huf-Dreieck:**\n\nAlle Datenflüsse basieren auf drei zentralen Entitäten:\n- **#PID** (Provider/Hufbearbeiter) → `profiles` Tabelle\n- **#KID** (Kunde/Pferdebesitzer) → `profiles` Tabelle\n- **#EQID** (Pferd/Equid) → `horses` Tabelle\n\nZugriffsrechte werden über `access_grants` gesteuert. Fachpartner (#PRID) erhalten Zugriff über `horse_partner_access`.\n\n**Wichtige Tabellen:**\n\n| Tabelle | Beschreibung | RLS |\n|---|---|---|\n| `profiles` | Nutzerprofile (Provider, Client, Partner) | ✅ Per User-ID |\n| `horses` | Pferdeakten mit Stamm- und Gesundheitsdaten | ✅ Per Owner/Grant |\n| `appointments` | Termine mit Service, Preis, Status | ✅ Per Provider/Client |\n| `invoices` | Rechnungen mit Positionen | ✅ Per Provider |\n| `contacts` | CRM-Kontakte (Kunden, Partner, Leads) | ✅ Per Provider |\n| `services` | Leistungskatalog mit Preisen | ✅ Per Provider |\n| `access_grants` | Zugriffsrechte Provider↔Client | ✅ Per Beteiligte |\n| `notifications` | In-App Benachrichtigungen | ✅ Per User |\n| `conversations` / `messages` | Chat-System | ✅ Per Teilnehmer |\n| `employee_profiles` | Mitarbeiter-Verwaltung | ✅ Per Provider |\n| `daily_tours` | Tourenplanung | ✅ Per Provider |\n| `expenses` | Betriebsausgaben | ✅ Per User |\n\n**Soft-Delete:** Alle wichtigen Tabellen verwenden `deleted_at` statt physischem Löschen.\n\n**Audit-Trail:** `employee_audit_log`, `admin_activity_log`, `autoflow_log` protokollieren alle Änderungen.",
  },
  {
    id: "authentifizierung",
    title: "Authentifizierung & Rollen",
    content: "**Auth-System:** Supabase Auth (GoTrue)\n\n**Rollen (app_role Enum):**\n- `provider` — Hufbearbeiter (Hauptnutzer)\n- `client` — Pferdebesitzer\n- `partner` — Fachpartner (Tierarzt, Sattler, etc.)\n- `admin` — Plattform-Administrator\n\n**Rollen-Architektur:**\nRollen werden in einer separaten `user_roles` Tabelle gespeichert (nicht im Profil!) um Privilege-Escalation zu verhindern. Prüfung über `public.has_role(user_id, role)` SECURITY DEFINER Funktion.\n\n**Auth-Flows:**\n1. **Registrierung:** E-Mail + Passwort → Bestätigungslink → Profil-Erstellung (Trigger) → Rolle zuweisen\n2. **Provider erstellt Client:** Ghost-Profil wird angelegt → Client erhält Einladungslink → Bei Login wird Profil vervollständigt\n3. **Magic Links:** Individuelle Slugs für Kunden-Einladungen (`/connect/:slug`)\n4. **Passwort-Reset:** Standard-Flow über Supabase Auth",
  },
  {
    id: "edge-functions",
    title: "Edge Functions",
    content: "Alle Edge Functions laufen auf Deno (Supabase Edge Runtime) und werden automatisch deployed.\n\n| Function | Beschreibung | Auth |\n|---|---|---|\n| `ai-chat` | Hufi AI-Assistent (Gemini) | JWT |\n| `morning-briefing` | Tägliche Zusammenfassung per E-Mail | Service-Role only |\n| `autoflow` | Automatische Termin/Rechnungs-Logik | Service-Role only |\n| `check_retention_deadlines` | Prüfung der Aufbewahrungsfristen | Service-Role only |\n| `ecosystem-webhook` | HM Connect Sync (HMAC-signiert) | HMAC / JWT |\n| `send-appointment-reminder` | Terminerinnerungen | Service-Role only |\n| `process-receipt` | KI-Belegerfassung (Gemini Vision) | JWT |\n\n**Sicherheit:** Sensitive Functions akzeptieren nur den `service_role` Key und lehnen den öffentlichen `anon` Key ab. Cron-Jobs verwenden ebenfalls `service_role`.",
  },
  {
    id: "webhooks",
    title: "Webhooks & Integrationen",
    content: "**CopeCart Webhook:**\nAbonnement-Events (Kauf, Kündigung, Upgrade) werden per Webhook empfangen und aktualisieren Feature-Flags in der Datenbank.\n\n**HM Connect (Ecosystem Webhook):**\nSynchronisation zwischen HufManager-Instanzen und Partnersystemen. Dual-Auth: Interne Calls verwenden JWT, externe verwenden HMAC-Signatur (`x-ecosystem-signature`) validiert gegen `ECOSYSTEM_WEBHOOK_SECRET`.\n\n**Supabase Realtime:**\nÄnderungen an Terminen, Nachrichten und Benachrichtigungen werden in Echtzeit an verbundene Clients gepusht (WebSocket).",
  },
  {
    id: "offline-architektur",
    title: "Offline-First Architektur",
    content: "HufManager ist für den Einsatz in ländlichen Gebieten mit schlechter Internetverbindung optimiert.\n\n**Strategie:**\n- TanStack Query mit IndexedDB Persistenz (idb-keyval)\n- Offline-Schreibvorgänge werden in einer Sync-Queue gespeichert\n- Bei Wiederverbindung: automatische Synchronisation\n- Optimistic UI: Änderungen erscheinen sofort, Sync im Hintergrund\n- PWA mit Service Worker für App-Shell Caching",
  },
  {
    id: "versionierung",
    title: "Versionierung & Deployment",
    content: "**Branching:** Feature-Branches → Main Branch → Auto-Deploy\n\n**Datenbank-Migrationen:** Sequenzielle SQL-Migrationen über Supabase CLI. Jede Migration ist idempotent und rückrollbar.\n\n**Aktuelle Version:** Siehe [Changelog](/docs/changelog)\n\n**Monitoring:**\n- Edge Function Logs (Supabase Dashboard)\n- Client-seitige Fehlererfassung (ErrorBoundary)\n- Systemstatus-Seite: [/status](/status)",
  },
];

const changelogEntries = [
  { date: "2026-03-01", entries: [
    "Vollständige Dokumentationsseite unter /docs hinzugefügt",
    "In-App Hilfe-System mit FAQ, Suche und Video-Platzhaltern",
    "Systemstatus-Seite unter /status",
    "Meilenstein-Feiern für erste Rechnung, 10 Kunden etc.",
    "\"Wusstest du?\"-Feature-Entdeckung nach 7 Tagen Nutzung",
  ]},
  { date: "2026-02-28", entries: [
    "Onboarding-Wizard für neue Benutzer mit 5 Schritten",
    "Interaktive Spotlight-Tour durch alle Hauptfunktionen",
    "Setup-Checkliste im Dashboard",
    "Konfetti-Animation nach Abschluss des Setups",
  ]},
  { date: "2026-02-25", entries: [
    "Buchhaltungsmodul mit EÜR, GuV und DATEV-Export",
    "Intelligente Belegerfassung per KI (Foto → Daten)",
    "Fuhrpark-Verwaltung mit Fahrzeugakten",
  ]},
  { date: "2026-02-20", entries: [
    "Team-Modul: Mitarbeiter einladen und Termine zuweisen",
    "Mitarbeiter-App mit eigener Navigation",
    "Check-In/Check-Out mit GPS-Erfassung",
  ]},
  { date: "2026-02-15", entries: [
    "AutoFlow: Automatische Terminerinnerungen und Rechnungen",
    "Rechnung kann jetzt als QR-Code geteilt werden",
    "Preisgruppen und individuelle Kundenpreise",
  ]},
  { date: "2026-02-10", entries: [
    "HM Connect: Verbindungen zu Tierärzten und Partnern",
    "Partner können Pferdeakten einsehen (mit Freigabe)",
    "Vertrauen & Sicherheit Seite unter /vertrauen",
  ]},
  { date: "2026-02-01", entries: [
    "Lager-Verwaltung für Material und Werkzeug",
    "Kalender-Synchronisation mit iPhone, Android und Outlook",
    "Eigene Webseite für jeden Hufbearbeiter",
  ]},
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    // Table rows
    if (line.startsWith("|")) {
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) return null;
      const isHeader = i > 0 && text.split("\n")[i + 1]?.includes("---");
      const Tag = isHeader ? "th" : "td";
      return (
        <tr key={i}>
          {cells.map((c, j) => (
            <Tag key={j} className={`px-3 py-2 text-left text-sm border-b border-border ${isHeader ? "font-semibold text-foreground bg-muted/50" : "text-muted-foreground"}`}>
              {renderInline(c)}
            </Tag>
          ))}
        </tr>
      );
    }
    // Code block
    if (line.startsWith("```")) return null;
    // Headers
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-semibold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
    }
    // Screenshot placeholder
    if (line.includes("[SCREENSHOT:")) {
      const desc = line.match(/\[SCREENSHOT:\s*(.+?)\]/)?.[1] || "Screenshot";
      return (
        <div key={i} className="my-4 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-xs text-muted-foreground">📸 {desc}</p>
        </div>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{renderInline(line)}</p>;
    }
    // Bullet
    if (line.startsWith("- ")) {
      return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">• {renderInline(line.slice(2))}</p>;
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-muted-foreground my-0.5">{renderInline(line)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\`[^`]+\`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    const linkMatch = p.match(/\[(.+?)\]\((.+?)\)/);
    if (linkMatch) return <Link key={i} to={linkMatch[2]} className="text-primary hover:underline">{linkMatch[1]}</Link>;
    return <span key={i}>{p}</span>;
  });
}

function isCodeBlock(text: string) {
  return text.includes("```");
}

function renderCodeBlock(text: string) {
  const lines = text.split("\n");
  const codeLines: string[] = [];
  let inCode = false;
  const before: string[] = [];
  const after: string[] = [];
  for (const l of lines) {
    if (l.startsWith("```")) { inCode = !inCode; continue; }
    if (inCode) codeLines.push(l);
    else if (codeLines.length === 0) before.push(l);
    else after.push(l);
  }
  return (
    <>
      {before.length > 0 && renderMarkdown(before.join("\n"))}
      {codeLines.length > 0 && (
        <pre className="my-4 overflow-x-auto rounded-lg bg-sidebar p-4 text-xs text-sidebar-foreground font-mono leading-relaxed">
          {codeLines.join("\n")}
        </pre>
      )}
      {after.length > 0 && renderMarkdown(after.join("\n"))}
    </>
  );
}

function hasTable(text: string) {
  return text.includes("| ") && text.includes(" |");
}

function renderWithTable(text: string) {
  const lines = text.split("\n");
  const groups: { type: "text" | "table"; lines: string[] }[] = [];
  let current: { type: "text" | "table"; lines: string[] } = { type: "text", lines: [] };
  for (const l of lines) {
    const isTableLine = l.trimStart().startsWith("|");
    if (isTableLine && current.type !== "table") {
      if (current.lines.length) groups.push(current);
      current = { type: "table", lines: [l] };
    } else if (!isTableLine && current.type === "table") {
      if (current.lines.length) groups.push(current);
      current = { type: "text", lines: [l] };
    } else {
      current.lines.push(l);
    }
  }
  if (current.lines.length) groups.push(current);

  return groups.map((g, i) => {
    if (g.type === "table") {
      return (
        <div key={i} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>{renderMarkdown(g.lines.join("\n"))}</tbody>
          </table>
        </div>
      );
    }
    return <div key={i}>{renderMarkdown(g.lines.join("\n"))}</div>;
  });
}

function renderContent(text: string) {
  if (isCodeBlock(text)) return renderCodeBlock(text);
  if (hasTable(text)) return renderWithTable(text);
  return renderMarkdown(text);
}

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                         */
/* ------------------------------------------------------------------ */

function SectionBlock({ section }: { section: DocSection }) {
  return (
    <div id={section.id} className="scroll-mt-24">
      <h3 className="text-lg font-bold text-foreground mb-3">{section.title}</h3>
      <div className="prose-sm">{renderContent(section.content)}</div>
      {section.subsections?.map((sub) => (
        <div key={sub.id} id={sub.id} className="mt-6 ml-4 pl-4 border-l-2 border-border scroll-mt-24">
          <h4 className="text-sm font-semibold text-foreground mb-2">{sub.title}</h4>
          <div className="prose-sm">{renderContent(sub.content)}</div>
        </div>
      ))}
    </div>
  );
}

function TableOfContents({ sections, activeId }: { sections: { id: string; title: string; subsections?: { id: string; title: string }[] }[]; activeId: string }) {
  return (
    <nav className="space-y-1 text-sm">
      {sections.map((s) => (
        <div key={s.id}>
          <a
            href={`#${s.id}`}
            className={`block py-1 px-2 rounded transition-colors ${activeId === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s.title}
          </a>
          {s.subsections?.map((sub) => (
            <a
              key={sub.id}
              href={`#${sub.id}`}
              className={`block py-0.5 px-2 pl-6 text-xs transition-colors ${activeId === sub.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {sub.title}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function Docs() {
  const location = useLocation();
  const navigate = useNavigate();
  const isChangelog = location.pathname === "/docs/changelog";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("nutzer");
  const [activeId, setActiveId] = useState("");

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    document.querySelectorAll("[id].scroll-mt-24").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab, isChangelog]);

  // Search filtering
  const filterSections = (sections: DocSection[]): DocSection[] => {
    if (!search) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.subsections?.some((sub) => sub.title.toLowerCase().includes(q) || sub.content.toLowerCase().includes(q))
    );
  };

  const filteredUserDocs = useMemo(() => {
    if (!search) return userDocs;
    return userDocs
      .map((cat) => ({ ...cat, sections: filterSections(cat.sections) }))
      .filter((cat) => cat.sections.length > 0);
  }, [search]);

  const filteredLegalDocs = useMemo(() => filterSections(legalDocs), [search]);
  const filteredDevDocs = useMemo(() => filterSections(devDocs), [search]);

  const allTocSections = activeTab === "nutzer"
    ? filteredUserDocs.flatMap((c) => c.sections)
    : activeTab === "behoerden"
    ? filteredLegalDocs
    : filteredDevDocs;

  if (isChangelog) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/docs")}>
            <ArrowLeft className="h-4 w-4" /> Zurück zur Dokumentation
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Changelog</h1>
          <p className="text-muted-foreground mb-8">Was sich bei HufManager tut — in verständlicher Sprache.</p>
          <div className="space-y-8">
            {changelogEntries.map((entry) => (
              <div key={entry.date}>
                <h2 className="text-sm font-bold text-foreground mb-3">
                  {new Date(entry.date).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
                </h2>
                <ul className="space-y-2">
                  {entry.entries.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:static print:border-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link to="/" className="shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">HufManager Dokumentation</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Alles was du wissen musst — für Nutzer, Behörden und Entwickler</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Dokumentation durchsuchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 print:hidden" onClick={() => navigate("/docs/changelog")}>
              <FileText className="h-4 w-4" /> Changelog
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 print:hidden" onClick={() => window.print()} title="Drucken / Als PDF speichern">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs + Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block">
          <TabsList className="mb-6 print:hidden">
            <TabsTrigger value="nutzer" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Für Nutzer
            </TabsTrigger>
            <TabsTrigger value="behoerden" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Behörden & Datenschutz
            </TabsTrigger>
            <TabsTrigger value="entwickler" className="gap-1.5">
              <Code className="h-3.5 w-3.5" /> Entwickler
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-8">
            {/* Sidebar TOC — desktop only */}
            <aside className="hidden lg:block w-56 shrink-0 print:hidden">
              <div className="sticky top-24">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inhalt</p>
                <TableOfContents sections={allTocSections} activeId={activeId} />
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 max-w-3xl">
              <TabsContent value="nutzer" className="mt-0 space-y-10">
                {filteredUserDocs.map((cat) => (
                  <div key={cat.category}>
                    <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">{cat.category}</h2>
                    <div className="space-y-8">
                      {cat.sections.map((s) => (
                        <SectionBlock key={s.id} section={s} />
                      ))}
                    </div>
                    <Separator className="mt-8" />
                  </div>
                ))}
                {filteredUserDocs.length === 0 && (
                  <p className="text-muted-foreground text-sm py-12 text-center">Keine Ergebnisse für „{search}"</p>
                )}
              </TabsContent>

              <TabsContent value="behoerden" className="mt-0 space-y-8">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6 print:border print:border-gray-300">
                  <p className="text-sm text-foreground font-medium">📋 Diese Dokumentation kann als PDF exportiert werden.</p>
                  <p className="text-xs text-muted-foreground mt-1">Nutzen Sie die Druckfunktion Ihres Browsers (Strg+P / ⌘P) und wählen Sie „Als PDF speichern".</p>
                </div>
                {filteredLegalDocs.map((s) => (
                  <SectionBlock key={s.id} section={s} />
                ))}
                {filteredLegalDocs.length === 0 && (
                  <p className="text-muted-foreground text-sm py-12 text-center">Keine Ergebnisse für „{search}"</p>
                )}
              </TabsContent>

              <TabsContent value="entwickler" className="mt-0 space-y-8">
                {filteredDevDocs.map((s) => (
                  <SectionBlock key={s.id} section={s} />
                ))}
                {filteredDevDocs.length === 0 && (
                  <p className="text-muted-foreground text-sm py-12 text-center">Keine Ergebnisse für „{search}"</p>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HufManager. Alle Rechte vorbehalten.</p>
          <div className="flex items-center gap-4">
            <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link to="/vertrauen" className="hover:text-foreground">Vertrauen & Sicherheit</Link>
            <Link to="/status" className="hover:text-foreground">Systemstatus</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
