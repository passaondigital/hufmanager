# HufManager Forensic Feature Inventory

Stand: 2026-08-06. Reines Lese-Analyse-Dokument, read-only erstellt gegen
`/root/hufmanager_v25/production` (HufManager, Alt-System/Prod) und
`/home/pascaladmin/hufiapp-dev` (HufiApp, Branch
`feature/hufi-assistant-experience-preview`). Nichts wurde verändert, kein
Branch gewechselt, kein Commit erzeugt, keine Datenbank angefasst, keine
Kundendaten übernommen (nur Strukturen/Feldnamen, keine Werte).

---

## 0. Zentraler methodischer Befund — bitte zuerst lesen

**HufManager und HufiApp sind kein Vergleich zwischen zwei getrennten
Systemen. Es ist derselbe Git-Ursprung.**

Nachweis:
- Beide Arbeitsverzeichnisse haben denselben Git-Remote:
  `git@github.com:passaondigital/hufmanager.git` (verifiziert per
  `git remote -v` in beiden Verzeichnissen).
- HufiApp steht auf Branch `feature/hufi-assistant-experience-preview`,
  HufManager-Produktion auf `feature/multi-beruf-verkabelung`
  (`git branch --show-current`), beide mit gemeinsamer Historie
  (`git merge-base HEAD origin/main` liefert einen gemeinsamen Vorfahren).
- **Vollständiger Datei-Diff von `src/`** (1369 gemeinsame Dateipfade,
  `diff <(find .../production/src -type f) <(find hufiapp-dev/src -type f)`):
  **0 Dateien existieren in HufManager, die in HufiApp fehlen. 21 Dateien
  existieren zusätzlich in HufiApp** — ausnahmslos die neue
  „Hufi Assistant Experience"-Schicht:
  `src/components/workspace/HufiSwipeWorkspace.tsx`,
  `src/design-system/hufi/{primitives.tsx,HufiDesignSystemPreview.tsx}`,
  `src/styles/hufi/{tokens.css,primitives.module.css}`,
  `src/hooks/workspace/useWorkspaceSwipe.ts(+.test.ts)`,
  `src/hooks/offline/{useConnectionState,useTextDraft}.ts`,
  `src/lib/offline/{audioDraftFormat,audioDraftStore,connectionState,textDrafts}.ts(+.test.ts je)`,
  `src/components/offline/HufiOfflineAudioDrafts.tsx`,
  `src/lib/hufi-agent-client-error.ts`,
  `src/lib/hufi-agent-error-messages.ts(+.test.ts)`.
- Von den 1369 gemeinsamen Dateipfaden unterscheiden sich **nur 11 im
  Inhalt** (`diff -q` je Datei): `HufiAssistantState.tsx`,
  `HufiAssistantExperience.tsx`, `hufi-experience.ts`, `HufiMenu.tsx`,
  `MobileShell.tsx`, `HufiOnboardingChat.tsx`, `ui/sheet.tsx`,
  `HufiVoiceSelector.tsx`, `useHufiTTS.ts`, `hufi-agent-client.ts`,
  `hufi-voice-config.ts` — durchweg genau die Dateien, die laut
  `git log` in den jüngsten HufiApp-Commits geändert wurden (Menü/
  Safe-Area, Offline-Foundation, Fehlerklassifizierung Agent/Billing,
  Voice-Chain-Härtung).
- **`supabase/migrations/`**: exakt 420 Dateien in beiden Verzeichnissen,
  identische Dateinamen bis einschließlich `20260727120000_close_anon_secdef_leaks.sql`.
- **`src/App.tsx`**: exakt 202 `path="..."`-Vorkommen in beiden Repos.
- **`supabase/functions/`**: identische 76 Edge Functions in HufManager;
  HufiApp wurde stichprobenartig gegen dieselbe Liste geprüft (`hufi-agent`,
  `copecart-webhook`, `send-invoice-email`, `check-overdue-invoices` etc.
  vorhanden).
- Beide `CLAUDE.md`-Dateien nennen denselben Supabase-Produktionsprojekt-Ref
  `vnschgjxkzzwzefqlrji` (EU/Frankfurt) als „echte Kundendaten"-Ziel — **es
  gibt aktuell kein zweites, getrenntes HufiApp-Datenbankprojekt.**
  Zusätzlich bestätigt: `AUDIT_REPORT.md`, `HUFI_ROADMAP.md`, `HUFI_TODO.md`
  liegen inhaltsgleich in beiden Repo-Wurzeln (Dateigröße/-inhalt identisch,
  nur Checkout-Zeitstempel unterschiedlich).
- HufManager-Produktion deployt laut `deploy.sh` (Zeile 2, 16, 136)
  ausschließlich nach `https://hufiapp.de/` — **die Marke „HufManager" ist
  im laufenden Produktivsystem bereits vollständig durch „Hufi" ersetzt**
  (siehe auch `WORKING_DIR_INVENTORY.md`: „Hufi Early Bird" ersetzt
  „HufManager Pro" live, verifiziert per Bundle-Grep). `hufmanager.de`
  existiert nur noch als E-Mail-Versanddomain (Resend-Absender), nicht als
  eigene UI.

**Konsequenz für diesen und die folgenden drei Berichte:** Die Frage ist
NICHT „fehlt eine HufManager-Funktion in HufiApp" — auf Code-Ebene fehlt
buchstäblich nichts, jede Datei ist vorhanden. Die tatsächlich relevanten
Fragen sind:
1. **Erreichbarkeit/Kuratierung**: Welche der vorhandenen Funktionen sind
   über die NEUE, im Aufbau befindliche Hufi-Assistenten-Oberfläche
   (Sprachassistent + Swipe-Workspace, `HufiSwipeWorkspace.tsx`) sichtbar
   bzw. bewusst dorthin übersetzt — im Unterschied zur alten,
   formularlastigen Rollen-Navigation (Sidebar/Bottom-Nav/Hamburger je
   Rolle)?
2. **Bereits vor HufiApp tote/verdeckte Funktionen**: Was war schon in
   HufManager selbst hinter Feature-Flags, unverdrahtet oder nie
   fertiggestellt — dieser Zustand wandert unverändert mit, da derselbe
   Code.
3. **Geteilte Datenbank**: Da beide Systeme dieselbe Prod-Instanz nutzen,
   ist „Parken" kein Datenmigrationsproblem, sondern eine Entscheidung über
   Produkt/Marke/Navigation bei laufender, gemeinsamer Datenbasis (siehe
   Dokument 4).

Alle folgenden Abschnitte respektieren trotzdem den Auftrag, HufManager
fachlich vollständig zu inventarisieren — die Domänenlogik ist ja genau
das, was in die neue Architektur übersetzt werden soll, unabhängig davon,
dass der Code technisch schon "da" ist.

---

## 1. Technische Systemkarte

| | HufManager (Prod) | HufiApp (dev) |
|---|---|---|
| Pfad | `/root/hufmanager_v25/production` | `/home/pascaladmin/hufiapp-dev` |
| Git-Remote | `passaondigital/hufmanager.git` | identisch |
| Branch | `feature/multi-beruf-verkabelung` | `feature/hufi-assistant-experience-preview` |
| Stack | React 18 + TS + Vite, shadcn/Radix, Tailwind, Supabase (DB/Auth/Storage/Edge Functions), react-big-calendar, Leaflet (Tour), jsPDF | identisch |
| Deploy | `./deploy.sh` → `/var/www/hufiapps/v25/` → `hufiapp.de` (Nginx, VPS) | noch kein eigenständiges Deploy-Ziel — Preview-Branch |
| DB-Projekt | Supabase `vnschgjxkzzwzefqlrji` (EU/Frankfurt) | dasselbe Projekt (siehe Abschnitt 0) |
| Migrationen | 420 SQL-Dateien, `supabase/migrations/` | identisch, 420 |
| Edge Functions | 76, `supabase/functions/` | dieselbe Liste (stichprobenverifiziert) |
| Seiten (`src/pages/**/*.tsx`) | 248 | 248 (gleiche Dateien) |
| Routen in `App.tsx` | 202 | 202 |
| Rollen | `provider`, `client`, `admin`, `employee`, `partner` (`ProtectedRoute allowedRoles`) | identisch |
| Reifegrad-Tracking | `src/config/appMap.ts` existiert (2987 Zeilen, 247 Einträge), war laut `WORKING_DIR_INVENTORY.md` zum Stand 18.07. „von keiner Datei importiert" (reine Registry) | dieselbe Datei, weiterhin Registry (kein Laufzeit-Konsument gefunden), aber jetzt Basis zweier Analyse-Dokumente (`docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`, `HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md`) |
| Neue UX-Schicht | — | `HufiSwipeWorkspace.tsx`, Design-System-Primitives, Offline-Foundation (Text-/Audio-Drafts), Agent-Fehlerklassifizierung |
| Sicherheitsstatus | RLS auf 286/286 Tabellen aktiv; Audit `AUDIT_REPORT.md`/`HUFI_TODO.md` dokumentiert 8 🔴 gefixt (18.–27.07.), 13 🟡 größtenteils gefixt, Rest bewusst geparkt (`anon`-EXECUTE auf 154 Funktionen, `hufcam-images`-Bucket öffentlich) | identischer Stand, gleiche Dateien |

**appMap.ts-Reifegrad (247 Einträge, in beiden Repos identisch, per
`grep -c 'reife: "..."'` verifiziert):** 134 `live`, 36 `teilweise`, 77
`attrappe`, 0 `unklar`. Laut
`HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md` Abschnitt 1 haben
75 der 77 `attrappe`-Einträge **gar keine Route** (`route: null`) — toter,
aber vollständig vorhandener Code, kein UI-Fragment, das ins Leere führt.

---

## 2. Domänen-Inventur (Auftragsvorgabe 1–10)

Format je Domäne: Was existiert, wo, Reifegrad/Status, Kurzbewertung.
Reifegrad in Klammern ist der `appMap.ts`-Wert, sofern ein Eintrag
existiert (`live`/`teilweise`/`attrappe`); ohne Klammer = kein appMap-
Eintrag, direkt aus Code/Migration abgeleitet.

### 2.1 Kundenverwaltung

| Funktion | Fundstelle | Status |
|---|---|---|
| Kunde anlegen/bearbeiten, Einladen, Filtern, Export | `src/pages/Kunden.tsx`, appMap `id: "kunden"` (live) | aktiv |
| Mehrere Kontaktpersonen/Kontaktdaten | Tabelle `contacts` (`supabase/migrations`) | aktiv (Datenmodell vorhanden) |
| Stalladressen / Standorte | Tabelle `client_locations`, `src/pages/ClientLocations.tsx` | aktiv |
| Preisgruppen (Standard/VIP/Großstall/Individuell) | `price_group`-Spalte auf `profiles`, `service_price_overrides`, dokumentiert in `PRICE_GROUPS_GUIDE.md`, UI: `src/pages/PriceGroupManagement.tsx` | appMap: **geparkt** (kein aktiver Einstiegspunkt seit Attrappen-Triage 18.07., `HUFI_ROADMAP.md` Schritt 15) — Datenmodell + Logik voll vorhanden, UI verwaist |
| Betreuungsverhältnis (start/pause/beenden statt harter Löschung) | `CustomerDetailModal.tsx`, `access_grants` (`granted_at`/`revoked_at`/`status`/`valid_until`) | laut `HUFI_TODO.md` (27.07.) gebaut, **nicht deployed zum Zeitpunkt der Doku** — Status im aktuellen Checkout nicht separat nachverifiziert, als **G (weitere Prüfung)** markiert |
| Einwilligungen/Datenschutz | `consent_log`-Tabelle, `src/components/consent/HufiFirstRunConsent.tsx` | aktiv |
| Kommunikationshistorie | `src/components/communication/DraftMessageCard.tsx`, `conversations`/`messages`-Tabellen (siehe AUDIT_REPORT Mandantentrennung „JA") | aktiv, schmal (ein Component) |
| Wiedervorlagen / Follow-ups | Tabelle `hufi_followup_suggestions`, `src/lib/hufi-agent-tasks.ts` | aktiv, an Hufi-Agent gekoppelt |
| Import/Export | `src/pages/ImportCenter.tsx`, Edge Function `ai-import-agent` | appMap: teilweise — ImportCenter war laut `HUFI_ROADMAP.md` Schritt 11 durch einen `useAuth()`-Bug crashend, gefixt 17.07. |
| Kunden-Archivierung | `Kunden.tsx:191-196` laut `HUFI_TODO.md` — beendete Verknüpfungen fallen aus der Liste (Bug notiert, nicht gefixt) | **B** — vorhanden, aber lückenhaft |

### 2.2 Pferde / Pferdeakte

| Funktion | Fundstelle | Status |
|---|---|---|
| Pferdeanlage, Stammdaten, Besitzerzuordnung | `src/pages/Pferde.tsx`, `ProviderHorseDetail.tsx`, Tabelle `horses` | live |
| Pferdeakte (Tab-Struktur) | `src/components/pferdeakte/{PferdeakteStart,PferdeakteHuf,PferdeakteBewegung,PferdeakteFutter,PferdeakteMedikamente,PferdeakteTherapie,PferdeakteTimeline,PferdeakteVet,PferdeakteTresor,PferdeakteBerichte}.tsx` | live, sehr breit ausgebaut |
| Besitzerwechsel | Tabelle `horse_transfers`, `HorseTransferWizard` (referenziert in `HUFI_TODO.md`) | aktiv |
| Mehrere Dienstleister/Partner-Zugriff pro Pferd | `horse_partner_access` (mit `owner_approved`), `horse_care_team`, `HorsePartnerPanel.tsx` | aktiv, differenziert (Grunddaten vs. Medizin-Freigabe) |
| Gesundheit/Medikamente/Impfungen/Entwurmung | `horse_medications`, `horse_vaccinations`, `horse_deworming`, `horse_medication_reminders`, `horse_lab_results`, Tabs `TabGesundheit.tsx`, `TabImpfungEntwurmung.tsx` | live |
| Fütterung/Diary | `horse_feed_plans`, `horse_diary_entries`, `horse_exercise_log`, `PferdeakteFutter.tsx` | live |
| Foto/Video/Dokumente, Medien-Timeline | `horse_media`, `HorseMediaGalleryTab.tsx`, `HorseMediaTimeline.tsx`, `TabMediaVault.tsx` | live |
| Notfall-QR/Notfalltoken | `horse_emergency_tokens`, `EmergencyQRCode.tsx`, `NotfallZugang.tsx`, `create_emergency_otp` (RPC, siehe Sicherheitsaudit) | live, mit dokumentierten Autorisierungslücken (gefixt 18.07., siehe Abschnitt 4) |
| Statusberichte durch Dritte (Stallpersonal etc.) | `horse_status_reports` | aktiv, aber AUDIT_REPORT U-4: Policy zeigt Statusberichte dem Besitzer nur, wenn er sie selbst erfasst hat — **vermutlich Funktionsbug**, ungeklärt |
| Chat je Pferd | `horse_chat_channels`, `horse_chat_messages` | aktiv |
| Audit-Log je Pferd | `horse_audit_log` | aktiv |
| Vollständigkeits-Score der Akte | `HorseProfileCompleteness.tsx` | aktiv, kleines aber wertvolles UX-Feature |
| Neuere Zonen-Variante (Dashboard-Stil) | `src/components/horse-profile/*` (Hero/HoofGrid/HealthMonitor/Stammdaten als „Zonen") UND separat `src/components/horse-page/*` (fast identische Zonen-Namen, andere Implementierung) | **Duplikat**: zwei parallele Redesign-Ansätze für dieselbe Pferdeseite existieren nebeneinander (`horse-profile/` und `horse-page/`), zusätzlich zur produktiven `horse-detail/`-Tab-Struktur. Nicht abschließend geklärt, welche Variante aktuell verdrahtet ist → **G** |

### 2.3 Hufspezifische Fachfunktionen — das fachliche Herzstück

Dies ist der Bereich mit der größten belegten fachlichen Tiefe.

| Funktion | Fundstelle | Status |
|---|---|---|
| **LTZ-Hufanalyse-Standard** (Leipziger Technikum) — vollständiger, mehrstufiger Analyse-Assistent | `src/components/hoof-analysis/{LTZAnalysisWizard,LTZStepGait,LTZStepHoofForm,LTZStepSummary,LTZHoofDetailForm,ltz-constants}.tsx` | live, appMap `id` nicht separat gefunden — Fachtiefe siehe unten |
| — Exterieur/Gang: Stellung vorne/hinten (regulär/zeheneng/zehenweit/bodeneng/bodenweit), Kruppenbewegung, Bauchschwingen, Fußung (bügelt/schnürt/plan) | `ltz-constants.ts` `STANCE_OPTIONS`, `CROUP_MOVEMENT_OPTIONS`, `BELLY_SWING_OPTIONS`, `FOOTFALL_OPTIONS` | strukturierte Enum-Daten, kein Freitext |
| — Pro Huf (VL/VR/HL/HR) einzeln: Fesselstand (1/3-2/3-Regel), Kronrandtheorie, Sohle-Strahl-Ebene, Fußungstheorie (Zehe/Trachte/plan/unphysiologisch), Hornqualität (normal/schlecht/rissig), Zehenachse (gerade/gebrochen vor/gebrochen zurück), Foto pro Huf, Notizen pro Huf | `LTZHoofData`-Interface, `ltz-constants.ts` | vollständiges, benanntes Fachvokabular, nicht generisch |
| — Automatische Empfehlungsgenerierung aus Analyse | `generateRecommendations()` in `ltz-constants.ts` — z.B. „Trachtenunterstützung / Steiler stellen" bei gebrochener Zehenachse, „Diagonale Korrektur erforderlich" bei Kronrand-innen + Sohle-außen | **einzigartige Entscheidungsunterstützungs-Logik**, nicht nur Dateneingabe |
| — Verlauf/Terminvergleich | `LTZAnalysisHistory.tsx`, `LTZComparisonView.tsx` | live |
| — Foto-Vorher/Nachher-Vergleich | `HoofPhotoComparison.tsx` (pferdeakte), `HoofPhotoTimeline.tsx` (horse-detail) | live, zwei Implementierungen (siehe Duplikat-Hinweis 2.2) |
| — PDF-Export des Befunds | `LTZPdfExport.tsx`, `LTZPdfSaveButton.tsx` | live |
| Huf-Historie separat vom LTZ-Assistenten (Kurzeinträge) | `hoof_entries`, `hoof_history`, `hoof_photos`, `hoof_analyses` (4 separate Tabellen!), `TabHufHistorie.tsx`, `HoofHistoryEntryModal.tsx`, `HoofStatusGrid.tsx` | live, aber **zwei parallele Datenmodelle** (LTZ-Wizard-Daten vs. `hoof_entries`/`hoof_history`) — Verhältnis zueinander nicht aus dem Code-Überblick abschließend klärbar → **G** |
| Beschlag/Material (Werkzeug, Hufschuhe, Material) | `HorseMaterialHistory.tsx`, `MaterialAssignment.tsx` (Team), `RecipesTab.tsx`/`PurchasingTab.tsx`/`SuppliersTab.tsx` (Lager) | aktiv, aber kein dediziertes „Beschlagtyp"-Feld gefunden (Klebe-/Nagelbeschlag) — **nicht belegt, ob differenziert erfasst wird** → als offene Frage in Dok. 2 |
| Bearbeitungsintervall pro Pferd | `shoeing_interval`-Feld (referenziert in `HUFI_ROADMAP.md`: „overdueHorses nutzt festen 8-Wochen-Wert statt individuellem `shoeing_interval`" — **Bug, individuelles Intervall existiert im Datenmodell, wurde aber laut Roadmap zum Zeitpunkt 15.07. noch nicht überall ausgewertet**, Status danach nicht separat verifiziert) | **G** |
| Nachkontrolle/Wiedervorlage | `hufi_followup_suggestions`, `needsServiceCheck()` (`HUFI_ROADMAP.md` Schritt 4) | aktiv, an den Hufi-Agent gekoppelt (proaktive Vorschläge) |
| KI-gestützte Bildanalyse eines Hufs | Edge Function `analyze-hoof-image` | **existiert serverseitig**, kein UI-Aufrufer im Domänen-Grep gefunden — **C (technisch vorhanden, Erreichbarkeit ungeklärt)** |
| Sprachbefund-Aufnahme am Pferd | `HufiAIVoiceRecorder.tsx` (pferdeakte), Edge Function `hufi-ai-voice-finding` | live |
| Tierärztliche Doku / Vet-Zusammenarbeit | `PferdeakteVet.tsx`, `src/pages/vet/{VetSOAPForm,VetGOTRechner,VetImpfungen,VetCSVImport,VetPMSConnect}.tsx`, `partner_treatment_notes`, `partner_treatment_plans` | größtenteils live; `VetPMSConnect` laut `HUFI_TODO.md` bereits ehrlich als „kommt in Kürze" gelabelt (kein Fake) |
| Unterschriften | `src/components/signature/` (Verzeichnis vorhanden, Inhalt nicht einzeln gelistet) | **G** — Existenz bestätigt, Tiefe nicht geprüft |
| Röntgenbilder | `XrayUpload.tsx` | live |

**Fachliche Einordnung:** Der LTZ-Hufanalyse-Assistent ist die klarste
belegte fachliche Alleinstellung im gesamten System — ein benanntes,
in der Berufspraxis anerkanntes Analyseschema (Leipziger Technikum),
vollständig strukturiert (keine Freitextfelder für die Kernbefunde),
mit automatisch generierten Handlungsempfehlungen. Das ist genau die Art
„wiederverwendbarer Huf-Fachlogik", nach der der Auftrag explizit fragt.

### 2.4 Termine / mobile Abläufe

| Funktion | Fundstelle | Status |
|---|---|---|
| Kalender (Tages-/Wochenansicht) | `src/pages/Kalender.tsx`, `DesktopBigCalendarView.tsx` (react-big-calendar), `MobileDayList` | appMap live; laut `HUFI_TODO.md` UI-Sanierung „wirkt technisch" (Nutzerfeedback), kein Redesign |
| Einzel-/Seriencharakter, Terminformular | `AppointmentFormModal.tsx` | live, berufsabhängige Default-Dauer (`profession-config.ts` `appointmentDuration`, laut Roadmap Schritt 3 „verdrahtet" 15.07.) |
| Automatische Folgetermin-Vorschläge | `needsServiceCheck()` + `hufi_followup_suggestions`, proaktive Briefings (`ProactiveBriefing.tsx`, `morning-briefing`-Edge-Function) | live |
| Erinnerungen/Eskalation | `send-appointment-reminders`, `escalate-unconfirmed`, `appointment_reminders`-Tabelle | live |
| Terminstatus | `appointments.status` — **freier Text ohne CHECK-Constraint** (explizit in beiden `CLAUDE.md`-Dateien als „bekannte Falle" dokumentiert: „scheduled"/„planned"/„confirmed" alle möglich) | aktiv, aber Datenqualitätsrisiko |
| Tour-/Routenplanung | `src/components/tour-manager/{TourManager,TourCard,TourControls,TourStatsPanel,NearbyCustomersLayer,StableGroupPanel,BreadcrumbsReplay,OnMyWayButton}.tsx`, Tabellen `daily_tours`, `tour_breadcrumbs`, `tour_emergency_status`, Edge Function `get-route` (OpenRouteService) | live, funktional breit |
| Fahrtenbuch-Export | `FahrtenbuchExport.tsx` | live |
| Tour-PDF-Export | `TourPdfExport.tsx` | live |
| Stallgruppen-Termine | `StableGroupPanel.tsx`, `StableGroupManager.tsx` (Duplikat: zwei Komponenten mit ähnlichem Namen in `tour-manager/` und `tour/`) | live, aber Doppelimplementierung → **G** |
| Kraftstoffpreise (Fahrtkosten-Kalkulation) | Edge Function `fuel-prices` | live |
| Notfallmodus unterwegs | `EmergencyModeButton.tsx`, `EmergencyDashboard.tsx`, `NotfallZugang.tsx` | live |
| Offline-Fähigkeit für Termine/Tour | Kein dediziertes Offline-Datenmodell für Termine gefunden (nur `src/components/offline/{OfflineBanner,SyncStatusBadge,ConnectionStatus,OfflineIndicator}.tsx` als reine Status-Anzeige) | appMap-unabhängig — **C**: Anzeige vorhanden, echte Offline-Datenhaltung für Termine nicht belegt (die NEUE Offline-Foundation in HufiApp deckt bisher nur Text-/Audio-Drafts für den Assistenten ab, siehe Abschnitt 0) |
| WhatsApp/E-Mail-Terminbestätigung | `WhatsAppActionButton.tsx`, `PostCompletionWhatsAppActions.tsx`, `send-reschedule-notification` | live |
| Kalender-Export (iCal) | Edge Function `serve-ical-feed` | live |
| Kalender-Sync (extern) | `CalendarSyncModal.tsx` | appMap-Status nicht einzeln verifiziert → **G** |

### 2.5 Dienstleistungen / Preise

| Funktion | Fundstelle | Status |
|---|---|---|
| Leistungsarten, Preisliste | Tabelle `services`, `src/pages/Services.tsx` | appMap: **geparkt/verwaist** (Attrappen-Triage 18.07. listet `Services` unter den 17 bereits vorher ohne aktiven Einstiegspunkt) — Datenmodell aktiv genutzt (`services` hat 29 Zeilen laut AUDIT_REPORT), aber eigene Verwaltungsseite nicht mehr im Navigationsfluss |
| Preisgruppen/Rabattstaffeln | siehe 2.1 — `service_price_overrides`, `PRICE_GROUPS_GUIDE.md` | Backend/DB voll ausgebaut, UI verwaist |
| Gruppen-/Stallpreise | `GroupPricingSection.tsx` (services) | live-Komponente, Einbettung nicht einzeln geprüft → **G** |
| Pakete/Abos (wiederkehrende Leistungen) | `bhs_horse_subscriptions` (BHS-Balance-System, siehe 2.10), `AutoFlowSetupWizard.tsx` mit `autoflow-auto-invoice` | live |
| Partner-eigene Preishistorie | `partner_service_price_history` | aktiv |
| Angebote (Kalkulation vor Auftrag) | `src/pages/Angebote.tsx`, `MeinAngebot.tsx`, Tabelle `offers` | appMap: `Angebote` als toter Link entfernt/korrigiert (Roadmap Schritt 15) zugunsten `MeinAngebot` — zwei Seiten für ähnliches Konzept, Verhältnis ungeklärt → **G** |
| Kalkulator (z.B. Preisrechner) | `src/pages/Kalkulator.tsx`, `src/components/kalkulator/` | appMap: unter den 17 verwaisten Marketing-/Utility-Seiten (Schritt 15) |

### 2.6 Rechnungen / Zahlungen / Steuer

| Funktion | Fundstelle | Status |
|---|---|---|
| Rechnung erstellen, Positionen | `CreateInvoiceModal.tsx`, `InvoiceLineItemsEditor.tsx`, Tabelle `invoices`/`invoice_items` | live |
| Fahrtkosten in Rechnung | `TravelCostEditor.tsx` | live |
| PDF-Vorschau/-Export | `PdfPreviewDialog.tsx` | live |
| Rechnungsversand (E-Mail/WhatsApp) | `ClientInvoicesSection.tsx`, `send-invoice-email` | laut `HUFI_TODO.md` (27.07.) **war zuvor komplett kaputt** — Provider hatte gar keinen Versandweg, camelCase/snake_case-Bug seit jeher, „hat nie eine Mail verschickt"; Fix gebaut, Deploy-Status zum Zeitpunkt der Doku offen → **G**, hoher Praxiswert falls jetzt live |
| Mahnwesen | Edge Function `check-overdue-invoices` | Code vorhanden und security-gefixt (18./27.07.), **aber laut Audit kein Cron-Job registriert, der sie aufruft** — „läuft seit unbekannter Zeit nie automatisch" → **C** (technisch vorhanden, nicht aktiv) |
| Automatische Rechnungsstellung | Edge Function `auto-generate-invoices`, `autoflow-auto-invoice` | live (AutoFlow-Kontext) |
| Admin-eigene Rechnungen/Ausgaben | `admin_invoices`, `admin_expenses`, `admin_provider_payments`, `src/pages/Ausgaben.tsx` | live |
| Manuelle Zahlungen | `manual_payments` | aktiv |
| Buchhaltung/EÜR/USt-Voranmeldung | `src/components/buchhaltung/{EuerOverview,UStVoranmeldung,ExportCenter,BelegArchiv,DataImportSection}.tsx` | live-Komponenten; **keine steuerliche Korrektheit behauptet** — reine Existenzfeststellung |
| Steuerberater-Zugang | `SteuerberaterAccess.tsx` | laut `HUFI_ROADMAP.md` Schritt 15: Fake-Token-Zugangslink und vorgetäuschter Mailversand **entfernt**, Button jetzt `disabled` — Funktion aktuell **nicht funktionsfähig, ehrlich als deaktiviert markiert** |
| Kleinunternehmerregelung | `kleinunternehmer: true` fest in `admin_invoices`, Impressum korrigiert auf „Steuernummer" statt „Umsatzsteuer-ID" (`HUFI_TODO.md` #21) | aktiv, mit offener Rückfrage an Steuerberater (AUDIT_REPORT „Offen" #2) — **keine Rechtsauskunft in diesem Bericht** |
| CopeCart-Zahlungsintegration (Abo/Guthaben) | `copecart-webhook`, `PRODUCT_PLAN_MAP` | live, **mit gravierenden, mittlerweile größtenteils gefixten Bugs** (falsche Auth, falsche Event-Namen, falsches Betragsfeld — siehe `HUFI_TODO.md` „Der CopeCart-Webhook passte nicht zur echten IPN-Spec") |
| Gutschriften/Stornos | Nicht als dedizierte Funktion gefunden (nur `payment.refunded`/`payment.charged_back`-Events im Webhook) | **D/G** — kein eigenständiger Storno-/Gutschrift-Workflow im UI belegt |
| DATEV/CSV-Export | `ExportCenter.tsx` (Buchhaltung) | Existenz bestätigt, Format nicht verifiziert → **G** |
| Preisgruppen-Rabatte in Rechnung | siehe 2.1/2.5 | Backend vorhanden |
| Trial-Ablauf-Automatik | Migration `20260610091000_trial_expiry_cron.sql` | **nicht als angewendet registriert** (`AUDIT_REPORT.md` F-19), 12 von 13 Trials bleiben `trialing` — **faktisch inaktiv trotz vorhandenem Code** |

### 2.7 Dokumente / Export / Archiv

| Funktion | Fundstelle | Status |
|---|---|---|
| PDF-Berichte (Huf, Pferd, Partner, Impfung) | Edge Functions `generate-completion-report`, `generate-full-horse-report`, `generate-partner-report`, `generate-vaccination-report`, `generate-farrier-email` | live |
| Datenexport Art. 15 DSGVO | Edge Function `data-export` | laut `HUFI_TODO.md` „ist echt — validiert JWT, exportiert Daten des authentifizierten Users. Kein Fake." | live |
| Kontolöschung Art. 17 DSGVO | Edge Function `delete-my-account` | live, explizite Löschung (kein reiner Cascade) |
| Tresor/Vault (Dokumentenspeicher am Pferd) | `PferdeakteTresor.tsx`, `TabMediaVault.tsx`, `VaultTab.tsx`, `vault_documents`, `vault_access_log`, `useVaultAccess.tsx`, eigenes Pricing (`TresorPricing.tsx`) | live, **eigenständig monetarisiertes Premium-Feature** (`vault_premium_gate`-Migration) |
| Storage-Nutzung/Quota | `StorageQuotaCard.tsx`, `HufiStorageUsage.tsx`, `get_storage_usage` (RPC) | live |
| Verarbeitungsverzeichnis Art. 30 DSGVO | `src/pages/admin/Verarbeitungsverzeichnis.tsx` | **nur `localStorage`, keine Supabase-Persistenz** (bestätigt in `HUFI_TODO.md` #20) — Risiko: Verlust bei Cache-Löschung, kein Backup |
| Datensicherung/Backup-Validierung | Edge Function `validate-backup` | live |
| Druckansichten/Vorlagen/Branding | PDF-Generatoren nutzen vermutlich Branding-Felder aus `business_settings` — nicht einzeln verifiziert → **G** |

### 2.8 Kommunikation / Automation

| Funktion | Fundstelle | Status |
|---|---|---|
| E-Mail-Versand (Templates) | `send-email` (nach Fix 27.07. nur noch Templates, kein Freitext mehr — siehe Sicherheitsteil), `send-client-invitation`, `send-provider-invitation`, `send-employee-invitation`, `send-partner-invitation`, `send-system-update`, `send-admin-invoice`, `send-password-changed-email` | live, breite Template-Suite |
| WhatsApp-Aktionen | `whatsapp/*` (siehe 2.4) | live, aber laut `HUFI_TODO.md` „nur Ankündigungstext, keine Rechnung im Anhang" (vor dem 27.07.-Fix) |
| Push-Benachrichtigungen | `send-push-notification`, `NotificationBell` (Layout) | live |
| Broadcast/System-Updates | `src/components/broadcast/`, `send-system-update` | live |
| AutoFlow (Lead → Termin → Rechnung → Follow-up, automatisiert) | `src/pages/AutoFlow.tsx`, `AutoFlowSetupWizard.tsx`, Edge Functions `autoflow-process-lead`, `autoflow-customer-notify`, `autoflow-monthly-checkin`, `autoflow-auto-invoice` | appMap: `AutoFlow` war unter den per Attrappen-Triage entfernten toten Links (`/autoflow` ohne Route) — **C**: vollständige Automations-Kette serverseitig vorhanden, UI-Einstieg entfernt |
| Kommunikationsmodus (WhatsApp vs. In-App) | `CommunicationModeSelector`, `/management/kommunikation`, Feld `communication_mode` | **bestätigt nicht verkabelt**: „wird gespeichert, aber von keiner Backend-Logik gelesen" (`HUFI_TODO.md` Punkt 1) — Nutzer trifft eine Einstellung ohne Wirkung |
| Proaktive Briefings (morgens) | `morning-briefing`-Function, `ProactiveBriefing.tsx`, `hufi-briefing.ts` **und** `hufai-proactive.ts` — laut beiden `CLAUDE.md`-Dateien „Duplikate mit gleichem Typnamen, vor Änderungen prüfen welche aktiv ist" | aktiv, aber dokumentierte Code-Doppelung |
| Task-Queue/Automations-Engine | `hufi_task_queue`, konsolidiert laut Migration `20260716120000_consolidate_task_queue.sql`, `hufi-routines-runner`-Function | live |
| Anomalie-Erkennung | Edge Function `anomaly-detection` | **C** — Existenz bestätigt, kein UI-Konsument im Grep gefunden |
| Retention/Löschfristen-Erinnerung | Edge Function `check-retention-deadlines` | live |
| Gesetzesänderungs-Erinnerung | Edge Function `legal-change-reminders` | live |

### 2.9 Benutzer / Rollen / Mandanten

| Funktion | Fundstelle | Status |
|---|---|---|
| 5 harte Rollen (provider/client/admin/employee/partner) | `ProtectedRoute.tsx`, eigene App-Shells je Rolle in `App.tsx` | live, gut dokumentiert in `HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md` Abschnitt 2.1 |
| Mitarbeiterverwaltung | `src/components/team/*`, `employee_profiles`, `employee_contracts`, `employee_time_records`, `employee_absence_requests` | live, sehr breit |
| Mitarbeiter-Einladung | `send-employee-invitation`, Route `/employee-invite` | war 404 bis 18.07. (Route fehlte in `App.tsx`), seither gefixt |
| Partner-Zugriff auf Pferde/Kunden (gestuft) | `access_grants`, `horse_partner_access` (`can_view_basic`/`can_view_medical`) | live, differenzierte Freigabelogik |
| Admin-Rollen/Rechte | `src/pages/admin/{AdminRoles,AdminOrganizations,MissionControl,ModuleAccessLogs,FeatureUsageOverview,HufiBrainAdmin}.tsx` | live |
| Audit-Logs | `horse_audit_log`, `employee_audit_log`, `admin_activity_log` | live |
| Mandantentrennung (Provider A sieht nicht Provider B) | Laut `AUDIT_REPORT.md`: bei Kern-Tabellen (`appointments`,`invoices`,`contacts`,`horses` regulärer Zugriff) **JA**, aber mehrere `SECURITY DEFINER`-Funktionen umgingen das ohne Login (F-1 bis F-3) — **inzwischen gefixt (18.07.), siehe Abschnitt 4** | teils historisch kritisch, aktuell adressiert |
| Löschkonzepte | `delete_client_cascade`, `delete_horse_safe`, `delete_provider_cascade`, `delete_employee_account`, `delete-my-account` | live, mit einer bekannten Lücke: `delete_client_cascade` prüfte laut `HUFI_TODO.md` (27.07.) nicht, ob der Client ein „echter" Nutzer ist — Frontend-Sperre existiert, DB-seitiger Schutz fehlt noch |
| Botschafter-Rolle (Affiliate/Multiplikator) | `src/pages/botschafter/*` (14 Seiten), `hufrente_referrals`, `botschafter_clicks` | **appMap: komplettes, fertig gebautes Dashboard hinter Feature-Flag `botschafterDashboard` (false)**, nur `/botschafter/login`, `/botschafter/warten`, `/ref/:code` live |
| Stallbetreiber-Rolle | `src/pages/stallbetreiber/*` (9 Seiten) + zugehörige `client/ClientStall*`-Seiten | **appMap: komplette Rolle hinter Feature-Flag `stallbetreiberRolle` (false)**, inkl. Lager/Kalender/Angebote/Anfragen für Stallbetriebe |
| Portal-Whitelabel (Versicherung/Tierarzt/Hersteller/Ausbildung/Verband/Lieferant) | `src/pages/portal/**` (~35 Dateien inkl. Demos) | **appMap: hinter Feature-Flag `portalWhiteLabel` (false)**, ~20 Module mit `DEMO_*`-Arrays statt echten Daten |

### 2.10 Business/Website/Shop

| Funktion | Fundstelle | Status |
|---|---|---|
| Öffentliche Landingpage/Website | `src/components/website/*` (~40 Sektionen), `src/pages/website/*` | live |
| Provider-eigene Profilseite | `ProviderLanding.tsx`, `ProviderPublicProfile` (Partner-Pendant: `PartnerPublicProfile.tsx`) | live |
| Website-Editor (No-Code) | `src/pages/OfficeEditor.tsx`, `MeineWebsite.tsx`, `LandingEditor.tsx`, `src/components/website-editor/`, `src/components/landing-editor/` | appMap: `MeineWebsite`/`LandingEditor` unter den 17 verwaisten Seiten (Schritt 15) — Editor-Code vorhanden, kein aktiver Navigationseinstieg |
| Marketplace (Pferde-/Leistungsbörse) | `Marketplace.tsx`, `client/Client{Marketplace,MarketplaceCreate,MyListings}.tsx` | appMap: `/client-marketplace` (Browse) hinter `clientMarketplaceBrowse`-Flag; `/create` und `/mine` bleiben live |
| BHS-Balance-System (Pferde-Abo/Bonusprogramm) | `BhsBalanceCockpit.tsx`, `BhsLandingPage.tsx`, `bhs_horse_subscriptions`, `ClientBhsAbo.tsx` | live, eigenständiges Zusatzprodukt/Feature |
| Hufrente (Vermittlungs-/Provisionsmodell, 49€/Monat Abo laut Code) | `src/pages/Hufrente.tsx`, `hufrente_referrals`, `HufrenteOnboarding.tsx`, `HufrenteQRCode.tsx`, `HufrenteShareSheet.tsx` | appMap: unter den 17 verwaisten Marketing-Seiten (Schritt 15) — **eigenständiges, monetarisiertes Bonus-/Provisionskonzept ohne aktiven Einstiegspunkt** |
| Academy/Kurse | `src/pages/Academy.tsx`, `src/components/academy/` | appMap: verwaist (Schritt 15) |
| Ecosystem (Partner-Integrationen) | `Ecosystem.tsx`, `ecosystem_apps`-Tabelle (laut AUDIT_REPORT: 0 Zeilen, leer), `check-ecosystem`/`ecosystem-webhook` | appMap: verwaist; Tabelle real aber leer |
| Lead-Erfassung/Formulare | `website_leads`, `funnel_leads`, `leads` (alle mit Rate-Limit-Triggern, siehe AUDIT_REPORT F-7), `src/features/email-marketing/` | live |
| Community-Meilensteine | `pferdeakte_community_milestones` (9 Zeilen) | live, kleines Feature |
| Warteliste (Pferdeakte) | `pferdeakte_waitlist` | live |
| Statistiken/Reporting | `src/pages/Statistiken.tsx`, `GuV.tsx`, `Statistiken`-Widgets | appMap: `Statistiken` unter den verwaisten Seiten |

---

## 3. Automationen, Integrationen, Cronjobs — Querschnitt

- **Integrationen (aus Datenschutzerklärung + Code bestätigt):** Supabase,
  Anthropic/Claude (Hufi-Agent), Google Fonts, CopeCart (Zahlungen),
  Whisper/Piper/Ollama (self-hosted Voice), ElevenLabs (Premium-TTS),
  wttr.in (Wetter), OpenStreetMap/Nominatim (Geocoding), Tankerkönig
  (Kraftstoffpreise), Resend (Mail), OpenRouteService (Routing — fehlte
  laut `HUFI_TODO.md` #19 noch in der Datenschutzerklärung).
- **Cronjobs:** `pg_cron` aktiviert (`20260610090500_enable_pg_cron.sql`),
  aber laut `AUDIT_REPORT.md`/`HUFI_TODO.md` läuft **`check-overdue-invoices`
  nie automatisch** (kein `cron.job`-Eintrag) und der **Trial-Ablauf-Job
  ist nicht registriert** — zwei dokumentierte Fälle von „Automation im
  Code vorhanden, aber nie ausgelöst".
- **Hufi-Agent (Kern-KI-Layer):** `supabase/functions/hufi-agent/index.ts`,
  Tools u.a. `create_invoice`, `create_note`, `create_horse`,
  `create_contact`, `add_expense`, `search_memory`, `search_entity`,
  berufsabhängige `PROFESSION_PROFILES`. In HufiApp zusätzlich um
  Fehlerklassifizierung (`hufi-agent-client-error.ts`,
  `hufi-agent-error-messages.ts`) und einen 503/Billing-Unterscheidungs-
  Fix erweitert (siehe aktives Memory
  `project_hufi_agent_anthropic_credit_blocker.md` — laut Nutzer-Memory
  ist der Text-Pfad seit ca. 2026-08-05 durch einen Anthropic-Guthaben-
  Blocker eingeschränkt, kein Code-Bug).

---

## 4. Historische/gelöschte Funde (Git-Archäologie, read-only)

Aus `git log`, `HUFI_ROADMAP.md`, `HUFI_TODO.md`, `WORKING_DIR_INVENTORY.md`
— alle Aussagen stammen aus vorhandener, bereits geschriebener
Projektdokumentation, gegengelesen, nicht neu spekuliert:

- **Zwei verwaiste, nie verwendete Onboarding-Komponenten**:
  `OnboardingWizard.tsx`, `HufiNewUserOnboarding.tsx` — laut Roadmap
  Schritt 11 „bewusst NICHT verwendet — toter Code, nirgends importiert",
  zugunsten von `HufiOnboardingChat.tsx`.
- **Toter Code, bewusst nicht angefasst** (`HUFI_TODO.md`, UI-Sanierung):
  `SpeedDialFAB`, `HelpCenterFAB`, `OnboardingAssistant`,
  `client/WhatsAppFAB`, `horse-detail/FeedbackFAB`,
  `feedback/FeedbackWidget` — werden nirgends gerendert.
- **Rebranding-Spuren**: `git log` zeigt durchgängig „HufManager" →
  „Hufi"-Umbenennungscommits (`5dff676f chore(rebrand)`), Routen-
  Korrekturen (`/hufi/faq`→`/support`, `/stall/rechnungen`→
  `/client-invoices`, `/hufanalyse`→`/work-mode`, `/angebote`→
  `/mein-angebot`).
- **Gelöschte/entfernte tote Links** (Attrappen-Triage 18.07.):
  `/angebote`, `/autoflow`, `/blog`, `/status`, `/vertrauen`,
  `/hufanalyse`, `/faq`, `/hilfe` (später `/hilfe` selbst wieder
  eingeführt, siehe unten) aus Sidebar/Header/Docs/Footer/Navbar.
- **Wiederbelebtes totes Ende**: `/hilfe` war laut `HUFI_TODO.md`
  (Etappe 1B, 30.07.) „nie erreichbar", wurde dann geroutet (34 echte
  FAQ-Antworten) — ein Beispiel für eine Funktion, die zwischenzeitlich
  tot war und reaktiviert wurde.
- **Gelöschte Fake-Inhalte**: `TestimonialsSection.tsx` zeigte bis zum
  Deploy von Commit `74c54307` weiterhin 6 erfundene Namen/Zitate trotz
  gegenteiliger früherer Dokumentation — Lehre: dokumentierter Status und
  tatsächlicher Live-Zustand liefen zeitweise auseinander (siehe
  `WORKING_DIR_INVENTORY.md`).
- **Wake-Word („Hey Hufi")**: seit 18.07. hinter `wakeWordEnabled: false`
  pausiert wegen Mikrofon-Kollision zwischen `webkitSpeechRecognition` und
  `MediaRecorder`; `useMicArbiter` als struktureller Fix am 22.07. gebaut,
  Reaktivierung wartet laut `HUFI_TODO.md` weiterhin auf einen echten
  Android/ChromeOS-Gerätetest — **Stand dieses Checkouts: weiterhin aus.**
- **CommunicationModeSelector**: aktive UI-Funktion ohne Backend-Wirkung
  seit mindestens 17.07. dokumentiert, im aktuellen Checkout nicht erneut
  geprüft (siehe 2.8).
- **`hufi_permissions`-Tabelle**: laut `HUFI_ROADMAP.md`
  „deaktiviert (Tabelle existiert nicht in Prod)" — ein Berechtigungslayer,
  der im Code referenziert, aber nie in der DB angelegt wurde.
- **appMap.ts selbst**: laut `WORKING_DIR_INVENTORY.md` ursprünglich als
  „Single Source of Truth" für einen noch zu bauenden Hufi-Support-Layer
  gedacht (`HUFI_TODO.md` Punkt 5, „Hufi-Support-Layer auf appMap.ts noch
  nicht angeschlossen") — die Datei existiert, wird gepflegt, hat aber
  bis heute (Stand dieses Checkouts) **keinen Laufzeit-Konsumenten im
  Produktcode**, nur die beiden neuen Analyse-Dokumente in
  `docs/architecture/` lesen sie.

---

## 5. Möglicherweise übersehene oder vergessene HufManager-Werte

Strikt getrennt nach Belegstatus.

### Nachgewiesen (im Code/Doku direkt belegt, nicht erreichbar oder nicht verkabelt)

1. **Preisgruppen-System (VIP/Großstall/Individuell)** — vollständiges
   Datenmodell + eigener Guide (`PRICE_GROUPS_GUIDE.md`), aber Verwaltungs-
   UI (`PriceGroupManagement.tsx`) ohne aktiven Navigationseinstieg seit
   der Attrappen-Triage. Nachweis: `src/pages/PriceGroupManagement.tsx`,
   `PRICE_GROUPS_GUIDE.md`.
2. **Hufrente** (Vermittlungsprovisions-/Bonusmodell, 49€/Monat laut Code
   `src/pages/Hufrente.tsx`) — eigenständiges, in der Vergangenheit aktiv
   entwickeltes Monetarisierungskonzept (QR-Code, Share-Sheet, Onboarding-
   Flow vorhanden), aktuell ohne Einstiegspunkt.
3. **BHS-Balance-System** — eigenes Abo-/Bonusprogramm für Pferde
   (`bhs_horse_subscriptions`, `BhsBalanceCockpit.tsx`, `BhsLandingPage.tsx`,
   `ClientBhsAbo.tsx`) — **live erreichbar** (Route `/bhs-balance`
   existiert), aber als separates Produktkonzept neben der Kern-App nicht
   in dieser Inventur weiter fachlich bewertbar, ohne Pascal zur
   ursprünglichen Geschäftsabsicht zu befragen.
4. **Vollständige Botschafter-Dashboard-Rolle** (14 Dateien: Umsätze,
   Ranglisten, Conversions, Insights, Werbemittel-Editor) — fertig gebaut,
   bewusst hinter Feature-Flag geparkt, nicht gelöscht.
5. **Vollständige Stallbetreiber-Rolle** (9+ Seiten inkl. Lager, Kalender,
   Angebote/Anfragen für Stallbetriebe) — fertig gebaut, geparkt.
6. **Portal-Whitelabel-Produkt** für sechs Fremdzielgruppen (Versicherung,
   Tierarzt, Hersteller, Ausbildung, Verband, Lieferant) — ~35 Dateien,
   funktionierende Demo-Varianten, geparkt.
7. **Mahnwesen ohne Cron-Trigger**: `check-overdue-invoices` ist
   sicherheitsgehärtet und einsatzbereit, wird aber laut Audit **nie
   automatisch aufgerufen** — ein bezahlter Funktionsbaustein
   (Zahlungserinnerung/Mahnung), der praktisch brachliegt.
8. **KI-Hufbild-Analyse** (`analyze-hoof-image`-Function) — serverseitig
   vorhanden, kein UI-Aufrufer im Domänen-Grep gefunden.
9. **AutoFlow-Automationskette** (Lead→Termin→Rechnung→Follow-up,
   4 Edge Functions) — Backend vollständig, UI-Einstieg `/autoflow`
   als toter Link entfernt.
10. **Verarbeitungsverzeichnis Art. 30 DSGVO nur in `localStorage`** — ein
    Compliance-relevantes Dokument ohne Backup/Geräteübergreifbarkeit.

### Wahrscheinlich (starke Indizien, nicht abschließend im Code verifiziert)

11. **Rechnungsversand war laut eigener Doku „seit jeher" kaputt**
    (camelCase/snake_case-Mismatch) — wahrscheinlich sind reale Kunden
    nie per Mail erreicht worden, solange diese Funktion beworben aber
    fehlerhaft lief. Deploy-Status des Fixes im aktuellen Checkout nicht
    nachgeprüft.
12. **Preisüberschreitungen bei fehlkonfiguriertem CopeCart-Custom-Feld**
    (F-16) könnten in der Vergangenheit zu falsch als „bezahlt" markierten
    Rechnungen geführt haben — kein Beleg für einen konkreten Fall, nur für
    die strukturelle Möglichkeit.
13. **Trial-Nutzer, die nie zu einem Kaufmoment kamen**: 12 von 13
    abgelaufenen Trials stehen laut Audit weiter auf `trialing` — ein
    plausibler Mitgrund für die in `HUFI_TODO.md` dokumentierte
    Beobachtung „0 zahlende Kunden, 13 von 22 Providern nur am
    Registrierungstag aktiv".

### Vermutung (nicht belegbar aus dem vorliegenden Code/Doku-Bestand)

14. Ob die **LTZ-Hufanalyse tatsächlich von zahlenden Nutzern regelmäßig
    genutzt wurde** oder überwiegend ungenutzt blieb, ist aus dem Code
    nicht ablesbar (keine Nutzungsstatistik im untersuchten Bestand
    gefunden, `FeatureUsageOverview.tsx` existiert als Admin-Seite, deren
    Dateninhalt wurde hier nicht ausgewertet).
15. Ob **Preisgruppen** von echten Kunden aktiv genutzt wurden oder ein
    nie fertig vermarktetes Feature blieben, ist nicht belegbar.

### Nicht belegbar / außerhalb des Lesezugriffs

16. Ob im **CopeCart-Dashboard** IPN-URLs für alle vier Produkte korrekt
    hinterlegt sind — laut Audit „nicht prüfbar ohne CopeCart-Login".
17. Ob der **Trial-Cron** (`cron.job`) auf der Live-DB tatsächlich fehlt
    oder nur nicht registriert dokumentiert ist — verlangt einen echten
    DB-Read (`SELECT * FROM cron.job`), der außerhalb dieses rein
    dateibasierten Lesezugriffs liegt und hier bewusst nicht ausgeführt
    wurde (kein Live-DB-Connect gemäß Auftrag).

---

## 6. Blockaden dieser Analyse (explizit dokumentiert)

- **Keine Live-DB-Abfrage durchgeführt** (Auftrag erlaubt das nur über
  bereits vorhandene lokale SQL-/Migrationsdateien) — alle Aussagen zu
  „wird genutzt/wie viele Zeilen" stammen ausschließlich aus bereits
  vorher von anderen Sessions geschriebenen Berichten (`AUDIT_REPORT.md`,
  `HUFI_TODO.md`), nicht aus einer eigenen Abfrage dieser Session.
- **Kein Blick in `.env`-Werte, Secrets oder Supabase-Dashboard-Config**
  (CopeCart-IPN-Einstellungen, Cron-Registrierung) — als offene
  Prüfpunkte weitergereicht, nicht umgangen.
- **`FeatureUsageOverview.tsx`/`ModuleAccessLogs.tsx`** (Admin-Seiten für
  echte Nutzungsdaten) wurden nur als Existenznachweis erfasst, ihr
  Dateninhalt nicht ausgelesen — für eine belastbare Aussage „was wird
  wirklich benutzt" wäre ein weiterer, gezielter Lesevorgang nötig.
- **Signatur-/Unterschriften-Komponenten** (`src/components/signature/`)
  nur als Verzeichnis bestätigt, nicht im Detail gelesen — Tiefe unklar.
- **Verhältnis LTZ-Hufanalyse-Daten zu `hoof_entries`/`hoof_history`/
  `hoof_analyses`** (vier separate Tabellen/Datenmodelle für augenscheinlich
  verwandte Inhalte) konnte im verfügbaren Zeitrahmen nicht bis auf
  Feldebene geklärt werden — als G in Dokument 2 markiert.
