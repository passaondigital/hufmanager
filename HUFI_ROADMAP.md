# HufiApp Brain-Optimierung — Arbeitsplan

Stand: 15. Juli 2026
Erstellt aus dem Brain-Audit vom selben Tag.
Regel: Jeder Schritt wird EINZELN beauftragt ("mach Schritt X"), 
getestet, und erst dann der nächste. Keine Schritte überspringen.

## STATUS-LEGENDE
- ✅ = erledigt + deployt
- 🔧 = in Arbeit
- ⬜ = offen

## ERLEDIGTE FIXES (13.–15. Juli 2026)
- ✅ Whisper-Timeout 10s → 45s (useVoiceCapture.ts:165)
- ✅ Service-Worker Supabase-Cache entfernt (vite.config.ts)
- ✅ profiles: user_type → role (hufi-brain.ts)
- ✅ hufi_permissions deaktiviert (Tabelle existiert nicht in Prod)
- ✅ ProactiveBriefing: useHufiTTS mit userId (Premium-Stimme)
- ✅ Audio-Unlock für Auto-Play ohne Klick (MobileShell.tsx)
- ✅ HeyHufi Retry-Limit + Backoff (kein Endlos-Mic-Loop mehr)
- ✅ Briefing situativ (nur zeigen wenn relevant)
- ✅ Onboarding-Einstellungen in DB persistieren
- ✅ Whisper threaded=True (local_whisper_server.py)
- ✅ learnFromSession() verkabelt (Hebel 1)

## PHASE 1: BRAIN SCHLAUER MACHEN (diese Woche)

### ✅ Schritt 1: Kontext-Pipelines zusammenführen (Hebel 2) — erledigt 15.07.2026
Aufwand: ~1 Tag
Was: loadLightContext() (Edge Function, Server) und fetchHufiContext() 
(hufi-brain.ts, Client) zu EINER gemeinsamen Quelle zusammenführen.
Warum: Der Agent sieht aktuell nur den "dünnen" Kontext — keine offenen 
Leads, keine überfälligen Pferde, keine letzten Befunde. Das macht ihn dumm.
Zusätzlich: overdueHorses nutzt festen 8-Wochen-Wert statt individuellem 
shoeing_interval pro Pferd → fixen.
Ergebnis: Agent bekommt den VOLLEN Kontext und antwortet deutlich relevanter.

### ✅ Schritt 2: Schreib-Tools im Agent erweitern (Hebel 3) — erledigt 15.07.2026
Aufwand: 1–2 Tage
Was: Folgende Tools zu HUFI_TOOLS in hufi-agent/index.ts hinzufügen:
- create_invoice (Rechnung erstellen)
- create_note (Notiz/Befund anlegen)
- create_horse (Pferd anlegen)
- create_contact (Kunde anlegen)
- add_expense (Ausgabe erfassen)
Die Fachlogik existiert bereits in hufi-actions.ts — nur als Tool exponieren.
Ergebnis: Hufi kann HANDELN, nicht nur nachschauen.

### ✅ Schritt 3: Profession-Config verdrahten — erledigt 15.07.2026
Aufwand: 4–6 Std.
Was: Die 5 ungenutzten Felder in profession-config.ts (dashboardWidgets, 
serviceLabel, appointmentDuration, documentTypes + serverseitig workflows) 
tatsächlich im Code konsumieren:
- appointmentDuration → Terminlogik (statt feste 60 Min)
- serviceLabel → Agent-Prompts + UI-Labels
- documentTypes → Befund-Dokumentation
- dashboardWidgets → Dashboard-Anzeige pro Beruf
Ergebnis: Hufi verhält sich wie ein Hufbearbeiter-Spezialist, nicht generisch.

## PHASE 2: PROAKTIVITÄT (nächste Woche)

### ✅ Schritt 4: Folgetermin-Vorschläge nach individuellem Intervall (Hebel 4) — erledigt 15.07.2026
Was: needsServiceCheck() (korrekt, pro Pferd) mit data_write-Routinen 
verbinden. Automatische Folgetermin-Vorschläge per Push/Briefing.
Ergebnis: "Erinnert dich bevor du's vergisst" — das Kernversprechen.

### ✅ Schritt 5: Task-Queue konsolidieren (Hebel 5) — erledigt 16.07.2026
Was: agent_tasks und hufi_task_queue zu EINEM System zusammenführen.
Ergebnis: Sauberes Fundament für alle weiteren Automatisierungen.

### ✅ Schritt 6: Skill-Feedback-UI — erledigt 16.07.2026
Was: confirmSkill/processSkillFeedback in der UI anzeigen — wenn Hufi 
einen Skill vorschlägt, kann der Nutzer bestätigen/ablehnen.
Ergebnis: Der Lern-Loop ist geschlossen (beobachten → vorschlagen → bestätigen).

## PHASE 3: POLISH & LAUNCH-VORBEREITUNG (Woche 3-4)

### ✅ Schritt 7: Landingpage hufiapp.de bereinigen — erledigt 16.07.2026
- Fake-Testimonials + "Echtes Zitat folgt" ENTFERNEN → ehrlicher Platzhalter
- Messaging auf Pferdebehandler ausrichten → Hufbearbeiter/-schmiede zuerst,
  Tierärzte/Osteopathen/Physiotherapeuten "auch für dich", Rest sichtbar weiter unten
- Pricing (9,95€ Early Bird + Guthaben) einbauen → altes 3-Tier-Modell ersetzt,
  inkl. klappbarer Guthaben-Bedingungen

### ✅ Schritt 8: CopeCart-Checkout fixen — erledigt 16.07.2026
- Alle Checkout-URLs im gesamten src/ + supabase/functions/ auf die neuen
  CopeCart-Produkt-IDs umgestellt: Abo 0a0921ba, Voice-Guthaben 5€ d0cdf68a,
  10€ 023890f8, 25€ 2556cac0
- AboSettings.tsx + PricingModal.tsx + UpgradeModal.tsx: altes 3-4-Tier-Modell
  (Starter/Pro/Duo/Team) auf den einen Early-Bird-Tarif (9,95€) reduziert
- copecart-webhook: PRODUCT_PLAN_MAP/PRODUCT_PLAN_OVERRIDE_MAP um 0a0921ba
  ergänzt (→ Plan "pro", voller Zugang), Legacy-IDs für Bestandskunden erhalten
- Build + Deploy live auf hufiapp.de, Edge Function auf Prod (vnschg) deployed

### Schritt 9: Instagram-Launch-Post
- @derhufmanager Bio aktualisiert (✅ vorbereitet)
- Handle-Wechsel + Ankündigungs-Post
- "Ihr kennt HufManager. Jetzt zeig ich euch, was daraus wurde."

### ✅ Schritt 10: UI-Aufräumen & Professionalisierung — erledigt 17.07.2026
Was: Splash-Text verbreitert (nicht mehr nur Hufpflege), Home-Screen-Header
auf eine schmale Zeile reduziert, Stimmen-Auswahl auf die 4 echten Hufi-Stimmen
+ lokalen/Browser-Fallback gekürzt (10 ElevenLabs-Bibliotheksstimmen ausgeblendet),
verbliebene "HufManager"/Tarif-Altlasten (Pro/Starter/Duo/Team) im sichtbaren
UI-Text auf Hufi/Early-Bird korrigiert, Quick-Action-Buttons auf 44px Touch-Target
angehoben, Morgen-Briefing-Notification (Edge Function) sendet nur noch bei
relevantem Inhalt statt täglich für jeden Provider.
Ergebnis: Weniger visuelles Rauschen, konsistentes Branding, keine Leer-Notifications mehr.

### ✅ Schritt 11: UI-Cleanup Phase 2 — Professionalität & Crash-Fixes — erledigt 17.07.2026
Was:
- Header (MobileShell.tsx): Grid-Menü-Icon (Duplikat zu Bottom-Nav "Einst."),
  PROFI/Privat-Toggle, LOOP-Button (Voice-Loop) und Lautsprecher/Replay-Icon
  entfernt. Übrig: Logo/Presence, Wetter, Hey-Hufi (unsichtbarer Listener),
  Voice-Guthaben-Badge, Benachrichtigungs-Glocke.
- Crash-Fix + Root-Cause gefunden: ImportCenter.tsx rief `useAuth()` auf,
  ohne den Hook zu importieren → ReferenceError → ErrorBoundary-Crash bei
  jedem Aufruf von Verwaltung → Import-Center ("Seite nicht verfügbar").
  Fix: toten `useAuth()`-Aufruf entfernt (Rückgabewert `user` wurde eh
  nirgends verwendet). Route/Wizard/Tabs sind sonst intakt und blieben.
- ErrorBoundary.tsx: Fallback-Screen hartkodiert auf hellen Hintergrund
  (bg-white, slate/red-Textfarben) statt theme-abhängiger CSS-Variablen,
  die im `.dark`-Kontext (Mission-Control-Palette, #0a0700) einen fast
  schwarzen Screen erzeugten. console.error-Logging war schon vorhanden.
- Kalender: Mobile-Default war bereits Tagesansicht (MobileDayList) —
  nur der Desktop/Tablet-State `currentView` wurde von "week" auf "day"
  umgestellt. Terminkarten: rounded-xl→rounded-2xl, shadow-sm→shadow-md.
  Wochentage-Leiste: gap-1→gap-2 für mehr Abstand.
- Abo-Verwaltung (SubscriptionCard.tsx + ManagementHub.tsx): manuelles
  "Copecart Kundenportal URL"-Eingabefeld + zugehöriger DB-Read/Write
  (provider_portal_credentials) entfernt. "Abo verwalten & Rechnungen"
  und "Abo kündigen" öffnen jetzt fest https://copecart.com/login.
- Kommunikations-Auswahl (WhatsApp/Hufi-Chat, CommunicationModeSelector)
  geprüft: aktive Funktion (Route /management/kommunikation, speichert
  communication_mode) → NICHT angefasst. Aber: `communication_mode` wird
  aktuell von keiner Backend-Logik ausgewertet, um Nachrichten tatsächlich
  per WhatsApp vs. In-App zu routen — siehe HUFI_TODO.md.
NICHT angefasst: DesktopBigCalendarView (react-big-calendar Wochenraster)
selbst — Redesign wäre kein Quick-Win mehr, siehe HUFI_TODO.md.
Build + TS-Check sauber, Deploy live auf hufiapp.de (HTTP 200 bestätigt).

### ✅ Schritt 11: Onboarding-Wizard für Erstnutzer — erledigt 17.07.2026
Was: HufiOnboardingChat.tsx (live, Discovery-Dialog) um zwei Schritte erweitert
statt durch einen separaten Formular-Wizard ersetzt — der bestehende
Chat-Flow (Name → Beruf → Use-Case → Herausforderungen → Pitch) bleibt
unverändert, da er erst kürzlich gebaut und das Doppel-Onboarding-Problem
damit behoben wurde. Ergänzt:
- Schritt 0: Willkommens-Screen ("Willkommen bei HufiApp") vor dem ersten
  Chat-Prompt, eigener Einstiegsbildschirm statt Chatnachricht.
- Schritt 5: Stimmwahl (Hufi Männlich/Weiblich Basis, Play-Button zum
  Probehören über die bestehende previewVoice()-Logik aus
  HufiVoiceSelector.tsx, jetzt exportiert) — Auswahl wird sofort per
  setSelectedVoice() persistiert.
- Schritt 6: Abschluss-Screen "Bereit!" mit drei Hinweisen + Button
  "HufiApp starten 🚀", der handleFinish() auslöst.
- handleFinish() schreibt jetzt zusätzlich full_name in profiles (vorher
  nur in onboarding_data JSON).
Zwei unverdrahtete Altlasten-Komponenten (OnboardingWizard.tsx,
HufiNewUserOnboarding.tsx) existieren weiterhin im Repo, wurden aber
bewusst NICHT verwendet — toter Code, nirgends importiert.
Ergebnis: Ein zusammenhängender 7-Schritte-Flow (0–6) beim allerersten
Login, kein zweites konkurrierendes Onboarding-System.

### ✅ Schritt 12: Onboarding-Bugfixes verifiziert, Account-Verwaltung (DSGVO) + Voice-Guthaben-System — erledigt 17.07.2026

**Teil A (Onboarding-Bugfixes):** Beide aus Schritt 11 vorausgesetzten Bugs
(Browser-Fallback-Stimme statt ElevenLabs, "Jetzt starten"-Button reagiert
nicht) waren bereits in der Vorsession in MultiStepSignup.tsx + Auth.tsx
gefixt (nicht in HufiOnboardingChat.tsx, wie ursprünglich vermutet — dort
existiert weder ein useHufiTTS-Call noch ein "Jetzt starten"-Button).
Verifiziert, keine erneute Änderung nötig.

**Teil B (Account-Verwaltung, DSGVO Art. 17):**
- ManagementHub.tsx: "Abo kündigen" (Bestätigungsdialog → CopeCart-Kundenportal
  aus provider_portal_credentials, sonst Fallback https://copecart.com/login)
  und "Account und alle Daten löschen" (Bestätigungsdialog + Eintippen von
  "LÖSCHEN") unterhalb von "Abmelden" ergänzt.
- Neue Edge Function supabase/functions/delete-my-account: löscht explizit
  (nicht nur per FK-Cascade, da appointments.provider_id nur ON DELETE SET
  NULL ist und hufi_memory/contacts gar keine FK-Constraint haben)
  invoice_items, invoices, appointments, contacts, horses, hufi_memory,
  hufi_context_log, notifications, user_roles, hufi_voice_credit(_transactions),
  profiles — dann auth.admin.deleteUser(). Deployed.

**Teil C (Voice-Guthaben-System):** Geprüft, ob hufi_credits bereits
existiert — ja, aber für ein ANDERES System (KI-Text-Antworten, Integer-
Zähler, use_hufi_credit()/ai-routing.ts). Um das laufende KI-Billing nicht
zu gefährden: neue, separate Tabellen angelegt (siehe
supabase/migrations/20260717120000_hufi_voice_credits.sql, auf Prod
angewendet via `supabase db query -f ... --linked`):
- hufi_voice_credits (user_id, monthly_base_cents, monthly_balance_cents,
  monthly_reset_at, purchased_balance_cents, purchased_expires_at)
- hufi_voice_credit_transactions (Verbrauchshistorie)
- RPCs: ensure_hufi_voice_credits_current, get_hufi_voice_credits,
  consume_hufi_voice_credit, add_purchased_voice_credits
- Einheit: 1 Cent = 1 Sekunde Premium-Voice (interner Verrechnungssatz,
  konfigurierbar in consume_hufi_voice_credit — bei Bedarf an echte
  ElevenLabs-Kosten anpassen). Monatliches Basis-Kontingent: 10 Min
  (600 Cent) für Nutzer mit aktivem/trial/lifetime Abo.
- hufi-tts Edge Function: prüft Guthaben vor dem ElevenLabs-Call (spart
  API-Kosten bei 0 Guthaben, gibt HTTP 402 mit code "credits_exhausted"
  zurück), verbucht nach erfolgreichem Call die geschätzte Dauer
  (Zeichen/14 als Sekunden-Schätzung, kein MP3-Parsing im Edge-Runtime).
  useHufiTTS.ts fällt bei 402 automatisch auf Piper zurück (bestehende
  Fallback-Kette, NIE Browser-Stimme) und zeigt einen gedrosselten Toast
  ("Dein Voice-Guthaben ist aufgebraucht...").
- copecart-webhook: neuer Branch für die drei Guthaben-Produkte
  (d0cdf68a=5€/023890f8=10€/2556cac0=25€) — schreibt per
  add_purchased_voice_credits() gut, 12 Monate Gültigkeit, rührt
  subscription_plan/plan_override nicht an.
- UI: HufiVoiceCreditBadge im MobileShell-Header (🎙 mm:ss, verlinkt auf
  Guthaben-Seite; ersetzt die bisher toten creditBalance-Query-Reste),
  neue Seite /management/guthaben (ManagementGuthaben.tsx: Basis- vs.
  Zusatz-Guthaben getrennt, Ablaufdatum, <20%-Warnung, Verlauf, drei
  Kauf-Kacheln + klappbare Bedingungen), Tile in ManagementHub.tsx.
Alle drei Teile: TypeScript-Check sauber, Build + Deploy (VITE_APP_FLAVOR=
hufiapp), Edge Functions (hufi-tts, delete-my-account, copecart-webhook)
auf Prod deployed, types.ts neu generiert.

### ✅ Schritt 13: App-Struktur-Map (src/config/appMap.ts) — erledigt 18.07.2026
Was: Maschinenlesbare Registry der gesamten App gebaut (247 Einträge), abgeleitet aus dem
tatsächlichen Code (App.tsx-Routen, Nav-Configs, alle src/pages-Dateien), nicht aus
Anzeigenamen/Labels. Drei Abnehmer: Hufi (FAQ-/Support-Layer, Deeplinks), Pascal
(Lückenliste), Claude Code (Kontext für künftige Sprints).
Reifegrad je Route/Funktion aus dem Code bestimmt (live/teilweise/attrappe/unklar):
131 live, 38 teilweise, 78 attrappe — Details siehe Session-Zusammenfassung bzw.
`src/config/appMap.ts` selbst (reifeNotiz je Eintrag).
Größte Einzelfunde: komplette Botschafter-Dashboard-Rolle und komplette
Stallbetreiber-Rolle sind fertig gebaute, aber nirgends geroutete Codebasen (toter
Code); der Mitarbeiter-Einladungslink (`/employee-invite`) führt serverseitig fertig
implementiert ins Leere, weil die Route in App.tsx fehlt (Ein-Zeilen-Fix); mehrere
Sidebar-/Docs-/Footer-Links zeigen auf Pfade ohne zugehörige Route
(`/angebote`, `/autoflow`, `/blog`, `/status`, `/vertrauen`, `/hufi/faq`, `/hufanalyse`).
NICHT in diesem Schritt gemacht: der Hufi-Support-Layer, der `appMap.ts` per Keyword-
Suche abfragt und Text+Deeplink-Antworten liefert (TTS-Pfad muss dabei hart umgangen
werden, siehe HUFI_TODO.md) — als nächster Schritt vermerkt.

### ✅ Schritt 14: Store-Fahrplan Schritt 1 — Employee-404-Blocker gefixt (18.07.2026)
Fix 1: Route `/employee-invite` fehlte in `src/App.tsx` (Import + `<Route>`
ergänzt). Query-Param `token` gegen `send-employee-invitation` verifiziert
(übereinstimmend). Der seit 29.06.2026 bekannte Employee-404-Blocker ist damit
behoben, `appMap.ts`-Eintrag `employee-invite` auf `reife: "live"` gesetzt.
Fix 2 (CopeCart-Checkout-IDs): geprüft, aber KEIN Codeeingriff nötig — Produkt-
IDs (Abo `0a0921ba`, Guthaben `d0cdf68a`/`023890f8`/`2556cac0`) vom User als
korrekt bestätigt, automatisierter Check zeigte gültige Checkout-Seiten statt
404. War ein falscher Alarm, kein neuer Blocker.
TypeScript-Check sauber, Build + Deploy (VITE_APP_FLAVOR=hufiapp) nach
`/var/www/hufiapps/v25/` durchgeführt.

### ✅ Schritt 15: Store-Fahrplan Schritt 2 — Attrappen-Triage (18.07.2026)
Ziel: kein Nutzer sieht mehr einen Button/Link/Menüpunkt, der ins Leere führt,
crasht oder nur Mock-Daten zeigt (Apple Guideline 4.2.3). Reparatur war
ausdrücklich NICHT das Ziel — nur Sichtbarkeit.

**1. Zentrales Feature-Flag-System**: `src/config/featureFlags.ts` neu angelegt
(`portalWhiteLabel`, `botschafterDashboard`, `stallbetreiberRolle`,
`partnerManagementExtras`, `clientMarketplaceBrowse`, alle `enabled: false`).
Nav/Router lesen ausschließlich daraus.

**2. Triage der 77 attrappe-Einträge**:
- 51 hinter Feature-Flag versteckt (a, Zukunft): komplettes Portal-Whitelabel-
  Produkt (10 Einträge, App.tsx-Guard vor dem Portal-Routenbaum), komplette
  Botschafter-Dashboard-Rolle (17), komplette Stallbetreiber-Rolle inkl.
  Client-Business/Stall-Seiten (19), Partner-Management-Untermenüs (4),
  Pferdemarkt-Browse-Ansicht `/client-marketplace` (1, `/create` und `/mine`
  bleiben live erreichbar).
- 9 tote Links entfernt (b, nie): `/angebote`, `/autoflow`, `/blog`, `/status`,
  `/vertrauen`, `/hufanalyse`, `/faq`, `/hilfe` aus Sidebar, Header, Docs,
  Footer, Navbar, WebsiteHome, GlobalSearch, HelpCenterModal, hufi-nav-actions,
  hufi-scenarios, MobileShellParts, FeatureDiscoveryHint, Support.tsx,
  ManagementOverview.tsx entfernt bzw. auf existierende Ziele (`/support`,
  `/work-mode`, `/mein-angebot`) korrigiert. Seiten bleiben als geparkter Code
  erhalten (kein Löschen von Dateien).
- 17 bereits verwaiste Marketing-/Utility-Seiten (c, geparkt): waren schon vor
  diesem Schritt ohne aktiven Einstiegspunkt (AboMatrix, Academy, Changelog,
  Dashboard, Docs, Ecosystem, GeldVerdienen, Glossar, HufiFAQ, Hufrente,
  Kalkulator, LandingEditor, MeineWebsite, Netzwerk, PriceGroupManagement,
  Services, Statistiken) — nur in `appMap.ts` als geparkt dokumentiert.

**3. teilweise-Mock-Daten (38 Einträge)**:
- 19 Portal-Module (portal-slug-*) automatisch mitversteckt (gleicher Flag wie
  oben).
- 9 wirkungslose Buttons/Formulare auf echten, erreichbaren Seiten behoben:
  ClientNetwork und PartnerConnect (Einladen/HM Connect/Verbinden/Chat-Icons)
  auf `disabled` gesetzt statt klickbar-aber-wirkungslos; Analyse.tsx Export-
  Button disabled; PartnerPublicProfile.tsx Kontaktformular täuschte bisher
  Versand vor (setTimeout ohne echten Mailversand) — durch echten `mailto:`-
  Link mit vorausgefüllter Nachricht ersetzt; SteuerberaterAccess.tsx
  (Buchhaltung) Fake-Token-Zugangslink und vorgetäuschter E-Mail-Versand
  entfernt, Buttons disabled; PartnerManagementHub/BusinessHub-Kacheln auf
  nicht registrierte Routen entfernt.
- 2 Routen-Tippfehler auf bereits existierende, funktionierende Ziele
  korrigiert und auf `reife: "live"` hochgestuft: `partner-home` (Quick-
  Actions zeigten auf `/partner-horses` statt `/partner-pferde`; `Import
  Center`-Button ohne Ziel entfernt), `partner-pferde` (Kartenklick zeigte auf
  `/partner-horse/:id` statt `/partner-pferd/:id`). Zusätzlich `hufi-nav-
  actions.ts`: `open_invoices` zeigte für Klienten auf totes `/stall/
  rechnungen` statt `/client-invoices` — korrigiert (unabhängiger Fund, nicht
  Teil der 38 teilweise-Liste).
- 8 unverändert gelassen (kein wirkungsloser Button, kein Mock-als-echt-Fall):
  `admin-verarbeitungsverzeichnis`/`management-kommunikation` (Backend-Lücke,
  keine toten Buttons), `employee-tour`/`employee-notizbuch` (funktionieren,
  nur unvollständig/ohne Sync), `vet-pms-connect` (bereits ehrlich "kommt in
  Kürze" gelabelt), `datenschutz` (Textaktualität, kein Funktions-Thema),
  `partner-management-abo` (Seite funktioniert, Titel verspricht mehr als
  Inhalt liefert — Label-Nuance, keine Aktion), `gerendert-2` (Marketplace.tsx
  als Basis-Komponente von MarketplacePublic.tsx — Erreichbarkeit nicht separat
  geprüft).

**4. Footer-Nav**: unverändert, keine der Änderungen betraf die Bottom-Nav.

TypeScript-Check sauber (alle verbleibenden Fehler vorbestehend, keiner in
geänderten Dateien/Zeilen). Build + Deploy (VITE_APP_FLAVOR=hufiapp) nach
`/var/www/hufiapps/v25/` durchgeführt. `appMap.ts` durchgängig mit
reifeNotiz-Ergänzungen aktualisiert (107 Einträge), `partner-home`/
`partner-pferde` auf `live` hochgestuft.

### ✅ Schritt 16: Store-Fahrplan Schritt 3B — Autorisierungs-Härtung (18.07.2026)
Die 8 🔴-Funde aus dem Audit (Schritt 3A, HUFI_TODO.md) wurden nach dem
Muster Angriff-vorher → Fix → Angriff-nachher → Legit-Check bearbeitet.
Jeder Angriff wurde real gegen die Datenbank ausgeführt (auth.uid() via
`request.jwt.claims` simuliert, destruktive Tests in `BEGIN`/`ROLLBACK`
gekapselt — keine echten Nutzerdaten verändert). Zwei zusätzliche,
unabhängige Bugs wurden beim Pentesten entdeckt und mitgefixt, weil sie
sonst legitime Nutzer weiter blockiert hätten: ein Typ-Cast-Fehler in
`admin_repair_user_role` (target_id uuid vs. ::text) und ein fehlendes
`extensions`-Schema im `search_path` von `create_emergency_otp`
(pgcrypto/gen_salt) — beide machten die jeweilige Funktion vorher auch für
echte Admins/Provider unbenutzbar.

1. **get_partner_shared_data**: Angriff (anon, nur E-Mail bekannt) bestätigt
   erfolgreich → Fix: `p_partner_email = auth_user_email()` erzwungen →
   Angriff scheitert (`Unauthorized`) → Legit (echter Partner, eigene
   E-Mail) funktioniert.
2. **get_provider_clients**: Angriff (anon, beliebige provider_id) bestätigt
   erfolgreich (Demo-Kundin-E-Mail geleakt) → Fix: nur Provider selbst,
   Admin, oder Partner während aktiver Notfall-Situation (deckt
   EmergencyDashboard-Partner-Flow ab, sonst wäre das Feature kaputt
   gegangen — Rückfrage an Pascal, Antwort: "nur bei aktivem Notfall") →
   Angriff scheitert (0 Zeilen) → Legit: Provider sieht eigene Kunden,
   Partner sieht nur während aktivem Notfall (beides getestet).
3. **admin_repair_user_role**: Angriff (Nicht-Admin nennt fremde Admin-UUID
   als p_admin_id) bestätigt erfolgreich (Auth-Gate prüfte den Parameter,
   nicht den Aufrufer) → Fix: ausschließlich `auth.uid()`, p_admin_id nur
   noch Kompatibilitäts-Parameter, plus target_id-Cast-Bug behoben →
   Angriff scheitert (`Not an admin`) → Legit: echter Admin repariert Rolle
   erfolgreich (vorher wegen Cast-Bug generell kaputt, jetzt auch das
   behoben).
4. **add_hufi_credits / add_purchased_voice_credits**: Angriff
   (Selbstgutschrift 100.000 Credits) bestätigt erfolgreich → Fix: EXECUTE
   von PUBLIC/anon/authenticated entzogen (zwei Anläufe nötig — Supabase
   grantet bei CREATE FUNCTION zusätzlich direkt an anon/authenticated,
   nicht nur an PUBLIC), nur noch `service_role` → Angriff scheitert
   (`permission denied for function`) → Legit: copecart-webhook (läuft mit
   service_role) funktioniert weiter.
5. **use_hufi_credit / consume_hufi_voice_credit**: Angriff (fremdes
   Guthaben verbrauchen) mit temporär wiederhergestellter Alt-Version
   bestätigt erfolgreich, dann zurückgerollt → Fix: `auth.uid()` statt
   `p_user_id` für die eigentliche Verbuchung → Angriff auf echte Version
   scheitert (verbraucht nur eigenes, meist leeres Guthaben, Opfer-Guthaben
   unverändert) → Legit: eigenes Guthaben-Verbrauchen funktioniert
   (Kredit-/Sekunden-Abzug bestätigt).
6. **create_emergency_otp**: Angriff (beliebiges Provider/Klient-Paar)
   bestätigt erfolgreich → Fix: gleiche Autorisierung wie bei
   get_provider_clients (Provider/Admin/Partner-im-Notfall) → Angriff
   scheitert (`Keine Berechtigung`) → Legit: Provider erstellt OTP für
   eigenen Klienten, Partner während aktivem Notfall ebenfalls (beides
   getestet). Hinweis: es gibt aktuell keinen Einlöse-/Verifizierungspfad
   für dieses OTP im Code (nur Erzeugung + Vorlesen per Telefon/SMS) —
   praktische Ausnutzbarkeit war dadurch schon vorher begrenzt.
7. **check-overdue-invoices**: toter Auth-Check ersetzt durch echten
   Vergleich `token !== serviceKey` (Muster wie `check-domain-waitlist`).
   Live per HTTP getestet: ohne/mit falschem Token → 401, mit echtem
   Service-Role-Key → 200 (`"No overdue invoices"`, keine reale Rechnung
   betroffen — aktuell 0 überfällige Rechnungen im System, daher risikolos
   live testbar). **Separater Fund beim Klären des Aufrufpfads**: es gibt
   AKTUELL KEINEN Cron-Job, der diese Funktion aufruft (`cron.job` geprüft,
   kein Eintrag) — das Mahnwesen läuft seit unbekannter Zeit nie
   automatisch. Kein Sicherheits-, sondern ein Produkt-Thema, absichtlich
   nicht selbst entschieden — siehe HUFI_TODO.md.
8. **Impressum**: OS-Streitschlichtungs-Link (Art. 14 ODR-VO) ergänzt.

TypeScript-Check sauber (162 vorbestehende Fehler, keiner in geänderten
Dateien), `types.ts` neu generiert, Build + Deploy (VITE_APP_FLAVOR=hufiapp)
nach `/var/www/hufiapps/v25/`, per HTTP verifiziert. 4 Supabase-Migrationen
angelegt und angewendet (`20260718090000_fix_idor_partner_provider_admin`,
`20260718091500_fix_credit_functions_authz`,
`20260718091600_fix_credit_functions_revoke_explicit`,
`20260718093000_fix_emergency_otp`), Edge Function `check-overdue-invoices`
deployed.

Bewusst NICHT in diesem Schritt angefasst (🟡 aus dem Audit, siehe HUFI_TODO.md
für Details): die ~10 kleineren IDOR-Funktionen (`get_owner_horse_ids` etc.),
`search_profiles_universal`/`search_horse_by_readable_id`/
`search_profile_by_readable_id` (fehlender is_discoverable-Filter in
ID-/E-Mail-Zweig), `log_emergency_action` (Audit-Log-Fälschung möglich),
die pauschale anon-Ausführbarkeit der übrigen ~150 SECURITY-DEFINER-
Funktionen, `hufcam-images`-Storage-Bucket, `.env` in Git, WebsiteTrustBadges,
ORS-Datenschutz-Eintrag, Verarbeitungsverzeichnis-Persistenz, Impressum-
Überschrift "Umsatzsteuer-ID".

### ✅ Schritt 17: Store-Fahrplan Schritt 3C — 🟡-Härtung abgeschlossen (18.07.2026)

Alle 13 🟡-Funde aus dem Audit (Schritt 3A) abgearbeitet: gefixt+verifiziert,
vorgelegt oder bewusst geparkt (Details siehe HUFI_TODO.md).

**Gefixt, per Angriff-vorher/-nachher + Legit-Check gegen Prod verifiziert:**
1. **9 kleinere IDOR-Funktionen** (`get_owner_horse_ids`, `get_user_organization`,
   `get_active_emergency_for_provider`, `get_hufi_voice_credits`,
   `get_storage_usage`, `sync_affiliate_stats`, `log_emergency_action`,
   `search_profiles_universal`, `search_profile_by_readable_id`): auf
   `auth.uid()`-Bezug umgestellt. Angriff (fremder Nutzer fragt fremde
   Pferde-IDs ab) → 0 Zeilen; Legit (eigene Pferde-IDs) → korrekte Anzahl.
   `search_profiles_universal` hatte zusätzlich einen unabhängigen,
   vorbestehenden Bug (`p.plz` statt `p.zip_code` — Funktion schlug für
   ALLE Aufrufer fehl), mitgefixt.
2. **Storage-RLS-Leck, größer als im Audit dokumentiert**: die Policy
   „Authenticated select global" auf `storage.objects` hatte KEINEN
   `bucket_id`-Filter (`USING (true)`) und hebelte damit die Policies
   **aller** privaten Buckets aus — nicht nur `hufcam-images` wie im Audit
   vermerkt. Live bewiesen: Nicht-Admin-Testnutzer konnte beide Objekte im
   `admin-invoices`-Bucket lesen. Policy entfernt, `hufcam-images` bekam
   eine eigentümer-gescopte Ersatz-Policy. Danach verifiziert: Angriff → 0
   Treffer, Admin → weiterhin 2 Treffer.
3. **`function_search_path_mutable`** bei `add_hufi_credits`,
   `set_agent_tasks_updated_at`, `update_ai_befunde_updated_at` behoben
   (`use_hufi_credit` war bereits gefixt). Security-Advisor danach: 0
   verbleibende Treffer.
4. **Impressum**: Überschrift „Umsatzsteuer-ID" korrigiert zu „Steuernummer"
   (Inhalt war nie eine echte USt-IdNr, § 19 UStG greift).
5. **WebsiteTrustBadges**: unbelegte „Verifiziert"/„DSGVO Konform"-Siegel
   entfernt (UWG-Risiko), durch einen belegbaren Satz ersetzt: „DSGVO-konform
   gehostet in der EU (Frankfurt)" (gedeckt durch Supabase-EU-Hosting).
6. **`.env`**: aus Git-Tracking entfernt, `.gitignore` ergänzt. Komplette
   Historie geprüft (beide Revisionen, 03.12. und 22.12.2025) sowie nach
   service_role/Resend/CopeCart/OpenAI-Mustern durchsucht — enthielt zu
   keinem Zeitpunkt echte Secrets, nur `VITE_`-Variablen (ohnehin im
   Frontend-Bundle sichtbar). Keine Key-Rotation nötig.

**Bereits vorher erledigt (Audit-Fund war zum Zeitpunkt von 3C bereits stale):**
- ORS (OpenRouteService) war in `Datenschutz.tsx` bereits korrekt als
  Auftragsverarbeiter gelistet (Anbieter, Adress-/Koordinatendaten, Zweck
  Routenoptimierung) — keine Änderung nötig.

**Vorgelegt, nicht selbst entschieden:**
- `hufcam-images`-Bucket bleibt `public` (Direktzugriff per bekanntem Pfad
  ohne Login) — Bucket ist aktuell leer, kein Schreibpfad im Code gefunden.
  Pascal-Entscheidung: nicht jetzt anfassen, parken bis HufCam echt genutzt
  wird.
- Verarbeitungsverzeichnis (Art. 30) nur in localStorage → Supabase-Migration
  als eigener Schritt geparkt, zu groß für Quick-Win.

**Bewusst geparkt (Hygiene, kein akutes Risiko):** 154 Funktionen pauschal
`anon`-ausführbar (kein Big-Bang), `pg_net` im `public`-Schema (kosmetisch),
`auth_leaked_password_protection` deaktiviert (reiner Dashboard-Schalter,
Pascal muss das manuell in Supabase Auth → Policies aktivieren).

Migrationen: `20260718174039_fix_search_profiles_universal_column_bug`,
`20260718210220_fix_storage_global_select_policy`,
`20260718210309_fix_search_path_mutable_functions`,
`20260719080000_fix_minor_idor_functions`.

Damit ist die Sicherheits-/Rechts-Härtung aus dem Store-Fahrplan (Schritt
3A-3C) vollständig — bis auf die drei bewusst geparkten/vorgelegten Punkte
oben.

### ✅ Schritt 18: 8 liegengebliebene Feature-Commits inventarisiert, geprüft, committet & deployed (18.07.2026)

Im Working Directory lagen ~128 uncommittete Dateien aus abgebrochenen
Vorsessions (Signup-Attribution, Voice-Credits, Multi-Beruf-Verkabelung,
Resend-Domain-Fix, Rebranding, Lern-Loop/Task-Queue-Konsolidierung,
diverse Cleanups). Vollständige Inventur (Details:
`WORKING_DIR_INVENTORY.md`) ergab: Backend/DB-Anteil größtenteils bereits
seit 12.–17.07. live deployed, nur nie committet; `tsc --noEmit` 0 Fehler,
keine Regression gegen unsere Security-/UI-Arbeit. In 8 thematisch
sauberen Commits nachgezogen (`fe415261` … `74c54307`) und anschließend
über einen isolierten `git worktree`-Build deployed — Live-Stand jetzt
Commit `74c54307`.

**Korrektur-Notiz zu Schritt 15 (Attrappen-Triage) / Schritt 2:** Die
damalige Prüfung hatte zwei Fake-Inhalte als "entfernt" dokumentiert —
das stimmte nur für einen uncommitteten Arbeitsstand, nicht für das, was
tatsächlich live lief. Bis zu diesem Deploy zeigte die Landingpage
weiterhin `TestimonialsSection.tsx` mit 6 komplett erfundenen Namen/
Zitaten/5-Sterne-Bewertungen (nur mit einem kaum sichtbaren "Echtes Zitat
folgt"-Hinweis), und `PartnerPublicProfile.tsx`s Kontaktformular
simulierte den Versand nur (`setTimeout` statt echtem Request), ohne dass
je eine Mail rausging. Beides ist jetzt — mit diesem Deploy — tatsächlich
live behoben, nicht nur im Code.

Verifiziert nach Deploy: `hufiapp.de` HTTP 200, Fake-Testimonial-Strings
im Live-Bundle nicht mehr auffindbar, ehrliche Ersatzmeldung vorhanden,
"HufManager Pro" durch "Hufi Early Bird" ersetzt, Voice-Credit-Badge im
MobileShell-Bundle vorhanden. Bundle-Secret-Scan sauber (kein
service_role-Key, kein Drittanbieter-Secret).

Weiterhin bewusst uncommitted: `src/config/appMap.ts` (0 Importe im
gesamten Repo, wartet auf den noch nicht gebauten Support-Layer, der es
konsumieren soll — eigenes Thema).

### ✅ Schritt 19: Hey Hufi — Consent-Bug gefixt, Wake-Word temporär geflaggt (18.07.2026)

Diagnose ergab zwei getrennte Probleme (Details siehe Session-Log): (1)
`webkitSpeechRecognition` (Wake-Word) und `MediaRecorder`
(Sprachaufnahme) konkurrieren ohne zentrale Koordination um dasselbe
Mikrofon — kein `useMicArbiter`, nur ein aus fünf Booleans abgeleiteter
`enabled`-Prop. (2) Der Consent-Schalter aus den Einstellungen
(`heyHufiEnabled`) wurde zwar eingelesen, aber nie tatsächlich in die
`enabled`-Bedingung von `<HeyHufi>` verdrahtet — Hey Hufi lauschte im
Hintergrund für JEDEN Chrome-Nutzer, unabhängig von Zustimmung.

**Gefixt:**
- Consent korrekt verdrahtet (`heyHufiEnabled` jetzt Teil der
  `enabled`-Bedingung).
- Neues Flag `wakeWordEnabled` in `featureFlags.ts` (default `false`) —
  `<HeyHufi>` wird nicht mehr gemountet, solange das Flag aus ist. Damit
  ist die kollidierende `webkitSpeechRecognition`-API komplett aus dem
  Bild. Tippen und der manuelle Mikrofon-Button (`useVoiceCapture`,
  unabhängiger Pfad) sind unverändert voll funktionsfähig.
- Toggle in `KiSettingsCard.tsx` bleibt sichtbar, zeigt bei
  deaktiviertem Flag ein "Bald verfügbar"-Badge und ist eingefroren
  (nicht klickbar) — der gespeicherte Consent-Wert in localStorage wird
  dabei NICHT verändert, damit bereits erteilte Zustimmungen bei
  Reaktivierung sofort wieder greifen.
- Lokale `ErrorBoundary` (leerer Fallback) NUR um `<HeyHufi>` ergänzt —
  ein künftiger Absturz dort reißt nicht mehr den ganzen Screen runter.

**Bewusst nicht jetzt:** der eigentliche Fix (zentraler
`useMicArbiter`-Hook, der Mikrofon-Zugriffe seriell mit echter
Bestätigung statt Timing-Puffer vergibt) — als eigener Task mit
Kern-Learning in `HUFI_TODO.md` dokumentiert. Reaktivierung dann: Flag
auf `true`, keine weiteren Schritte nötig.

## AUSFALL 19.07.2026: WEISSER SCREEN + FIX (deploy.sh)
**Was passierte:** hufiapp.de zeigte weißen Screen, Konsole:
`Uncaught Error: supabaseUrl is required`.

**Ursache:** Am 18.07.2026 wurde `.env` korrekt aus dem Git-Tracking
entfernt (gehört in `.gitignore`, war schon richtig so). Der Deploy
danach baute aus einem sauberen `git worktree` — dort existiert die
jetzt un-getrackte `.env` nicht, also fehlten beim Build alle
`VITE_`-Variablen. Das Bundle enthielt keine Supabase-URL. Niemand
prüfte NACH dem Build, ob die URL überhaupt im Bundle steckte — nur
HTTP 200 wurde gecheckt, und der war auch beim kaputten Stand grün.

**Sofort-Fix:** Build im Worktree wiederholt, `.env` vorher manuell
hineinkopiert, verifiziert (Playwright-Live-Check: `root`-DOM gefüllt,
keine `pageerror`, kein `supabaseUrl is required` mehr), neu deployt.

**Dauerhafter Fix:** `deploy.sh` im Repo-Root angelegt. Kapselt den
kompletten Ablauf: Worktree anlegen → `.env` aus dem Haupt-Directory
hineinkopieren (wird NICHT committet) → `npm ci` → `npm run build` →
**PFLICHT-GATE**: Supabase-Host muss im `dist/assets/*.js` vorkommen,
sonst bricht das Skript ab und deployed NICHTS → Bundle-Secret-Scan
(kein `service_role`/Private-Key im Client-Bundle) → `rsync` nach
`/var/www/hufiapps/v25/` → Worktree-Cleanup (auch bei Abbruch via
`trap`). Getestet: sowohl der Erfolgspfad als auch der Abbruch bei
fehlender `.env` funktionieren wie vorgesehen.

**Ab jetzt gilt:** hufiapp.de wird NUR noch über `./deploy.sh` deployt,
nicht mehr per Hand-Kommandos. Wer manuell baut/rsynct, riskiert genau
diesen Ausfall erneut.

### Nachgezogene Robustheits-Härtung (19.07.2026, Folgesession)
Vollständige Analyse in `ROBUSTHEIT_ANALYSE.md` (3 Verteidigungslinien:
verhindern / früh fangen / sanft auffangen). Alle 5 empfohlenen
Härtungen umgesetzt:
1. **Statisches HTML-Fallback** in `index.html` — ein `#hufi-boot-fallback`-
   Div liegt initial IN `#root`, wird von React beim erfolgreichen Mount
   automatisch entfernt; ein Timeout-Handler zeigt nach kurzer Wartezeit
   eine freundliche Meldung + Reload-Button, falls React nie mountet
   (deckt exakt die Fehlerklasse "Crash vor React-Mount" ab, die am
   19.07.2026 zum weißen Screen führte).
2. **Env-Gate erweitert:** `deploy.sh` prüft jetzt sowohl
   `VITE_SUPABASE_URL` als auch `VITE_SUPABASE_PUBLISHABLE_KEY` (Key-
   Fingerprint) im gebauten Bundle, nicht mehr nur die URL.
3. **Backup + Rollback:** `deploy.sh` sichert vor jedem `rsync --delete`
   den aktuellen Live-Stand nach `v25-backup-<timestamp>` (letzte 5
   werden behalten), `./deploy.sh --rollback` spielt den letzten Stand
   manuell zurück.
4. **Smoke-Test fest verankert:** `smoke-test.mjs` (Playwright, global
   installiert) läuft jetzt automatisch NACH dem `rsync` in `deploy.sh`
   gegen `https://hufiapp.de/` — prüft `#root`-Füllung (>500 Zeichen)
   und dass keine Uncaught-/Console-Errors auftreten. Bei Fehlschlag
   rollt `deploy.sh` automatisch auf das eben erstellte Backup zurück
   und bricht mit Exit-Code 1 ab, statt still "✅ Deployment
   abgeschlossen" zu melden. Erfolgs- und Fehlschlag-Pfad isoliert
   getestet (u. a. simulierter Rollback mit Marker-Dateien) und beim
   finalen End-to-End-Deploy live verifiziert.
5. **GitHub-Actions-Pfad entschärft:** `.github/workflows/deploy.yml`
   umbenannt zu "CI Build-Check (kein Live-Deploy)" + Kommentar, dass er
   ohne `VITE_`-Secrets läuft und nie deployt. `DEPLOYMENT_GUIDE.md`
   korrigiert (verwies fälschlich auf automatisches Vercel/Netlify-
   CI/CD-Deployment via `git push`, das für dieses Setup nie existierte).

**Abschluss-Deploy (19.07.2026, 14:14 Uhr):** ein sauberer Lauf über das
erweiterte `deploy.sh` — Gate ✓, Backup ✓, rsync ✓, Smoke-Test ✓
(root-Länge 84.694 Zeichen, 0 Fehler), live auf Commit `4182c056`
verifiziert. Fallback-Markup live im ausgelieferten HTML bestätigt
(`curl` zeigt `hufi-boot-fallback`).

## PFLEGE-REGEL (verbindlich ab 18.07.2026)
Jede neue Route oder Funktion aktualisiert `src/config/appMap.ts` im selben Sprint.
Die Map ist die Single Source of Truth für Navigation, FAQ und Reifegrad-Tracking.
Eine veraltete Map ist schlimmer als keine — beim Anlegen/Ändern/Entfernen einer Route
IMMER auch den passenden `appMap.ts`-Eintrag anlegen/anpassen/entfernen.

## PARKING LOT (Vision, nicht jetzt)
- Große Pferdewelt-Wissensdatenbank (aus Nutzerdaten, organisch)
- Internet-Recherche mit verifizierten Quellen
- Berufsübergreifendes Lernen über alle 44 Berufe
- context_log auswerten (Analytics/Lernschleife)
- Zweites Berufsprofil (Physio) aktivieren + testen
- Bugfix Mid-Chat ask_first-Skill-Pfad (MobileShell.tsx ~Z.1195): detectAndCreateTask(skill.name, …)
  matcht skill.name (z.B. "Tagesabrechnung") gegen keine Task-Trigger-Regex → Pfad wirkungslos,
  fällt still auf generische Trigger-Phrasen-Erkennung zurück. Gefunden bei Schritt 6, bewusst geparkt.
