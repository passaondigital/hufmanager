# WORKING_DIR_INVENTORY.md

Ursprünglich erstellt 18.07.2026 als reine Bestandsaufnahme (nach dem
Security-Deploy `7a25d2aa`). **Update 18.07.2026, Folgesession 1:** die
8 Gruppen A–H (bzw. deren committbarer Anteil) wurden geprüft (Phase 1,
keine echte Regression gefunden) und in 8 einzelnen, thematisch sauberen
Commits nachgezogen (Phase 2). Damals NICHT deployed — nur committet.

**Update 18.07.2026, Folgesession 2 — DEPLOYED.** Alle 8 Commits sind
jetzt live. Build aus isoliertem `git worktree` von Commit `74c54307`
(HEAD von `feature/multi-beruf-verkabelung`), `tsc --noEmit` 0 Fehler,
Bundle-Secret-Scan sauber, `rsync -a --delete` nach
`/var/www/hufiapps/v25/`. **Live-Commit-Stand: `74c54307`.**
`hufiapp.de` antwortet HTTP 200. Verifiziert per Bundle-Grep: die
Fake-Testimonials ("Heiko W.", "Echtes Zitat folgt") sind aus dem
Live-Bundle verschwunden, die ehrliche Ersatzmeldung ("Bald teilen hier
echte Nutzer ihre Erfahrungen") ist drin. "Hufi Early Bird" ersetzt
"HufManager Pro" live (0 Treffer für den alten Text). Voice-Credit-Badge
ist im MobileShell-Bundle vorhanden.

## Commit-Historie (neu, 8 Commits auf `feature/multi-beruf-verkabelung`)

| Reihenfolge | Hash | Commit | Gruppe |
|---|---|---|---|
| 1 | `fe415261` | fix(resend): Absender-Domain hufiapp.de → hufmanager.de | A |
| 2 | `5dff676f` | chore(rebrand): HufManager → Hufi, Routen, Pricing | E |
| 3 | `00802f63` | fix(cleanup): Attrappen-Ehrlichkeit, Feature-Flags, tote Links, PWA-Fix | H |
| 4 | `6bcbced6` | feat(learning): Task-Queue-Konsolidierung, Lern-Loop, Onboarding | F |
| 5 | `8fae465e` | feat(attribution): Signup-Attribution + Mission-Control | B |
| 6 | `ad14ded2` | feat(voice-credits): Sprach-/KI-Guthaben | C |
| 7 | `0328c8f7` | feat(multi-beruf): berufsabhängige Defaults | D |
| 8 | `74c54307` | refactor(mobile-shell): Header-Cleanup + Lern-Loop + Audio-Unlock | MobileShell (eigen) |

`tsc --noEmit` nach allen 8 Commits: **0 Fehler.**

## Phase-1-Ergebnis: Regressionscheck der ~28 unklaren Dateien

**Keine echte Regression gefunden.** Insbesondere:

- **MobileShell.tsx (328 Zeilen, der größte Einzeldiff):** Der
  uncommittete Stand ENTFERNT Grid-Menü-Icon, Lautsprecher-Replay-Button,
  Profi/Privat-Badge und Voice-Loop-Toggle aus dem Header — er bringt sie
  NICHT zurück. Der aktuell (vor diesem Commit) live deployte Stand hatte
  diese vier Elemente noch. Glocke (NotificationBell) und
  Safe-Area-Handling: im Diff unangetastet, per `grep` bestätigt. Das ist
  eine Verbesserung, die noch nicht deployed war — keine Rücknahme
  unserer Arbeit.
- **4 Subscription-Dateien (PricingModal, SubscriptionCard, UpgradeModal,
  ProGateDialog) + ClientAppUpgradeModal:** keine RPC-Aufrufe an
  `add_hufi_credits`/`use_hufi_credit`, keine `service_role`-Referenzen —
  keine Berührung mit den 3B-Guthaben-Security-Fixes. Inhaltlich eine
  Pricing-Konsolidierung (mehrere Tarife → ein "Hufi Early Bird"-Angebot).
- **Zwei bislang unentdeckte, tatsächlich noch LIVE laufende
  UWG-relevante Fake-Inhalte** (nicht Teil der ursprünglichen
  Fragestellung, aber beim Gegenlesen gefunden): `TestimonialsSection.tsx`
  zeigte im committeten HEAD weiterhin 6 erfundene Namen/Zitate/
  5-Sterne-Bewertungen (nur mit einem kaum sichtbaren
  "Echtes Zitat folgt"-Hinweis), und `PartnerPublicProfile.tsx`s
  Kontaktformular simulierte den Versand nur (`setTimeout` statt echtem
  Request). Beide waren laut einer älteren Memory als "in Schritt 2
  behoben" dokumentiert — das stimmte nur für den uncommitteten Stand,
  nicht für das, was live lief. Jetzt in Commit `00802f63` gefixt.

Alle anderen der ~28 Dateien wurden den Gruppen A/E/H/F/B/C/D zugeordnet
(vollständige Zuordnung: siehe Commit-Messages oben, jede listet ihre
Dateien im Beschreibungstext).

## Was bewusst uncommitted bleibt

- **`src/config/appMap.ts`** (2987 Zeilen) — wird von KEINER Datei im
  Repo importiert (verifiziert per `grep -r "config/appMap"`, 0 Treffer).
  Der geplante Konsument (Support-Layer für Navigation/FAQ/
  Reifegrad-Tracking) ist noch nicht gebaut. Bleibt bis dahin
  uncommitted, wie angewiesen — eigenes Thema, separat zu klären.
- **`supabase/.temp/cli-latest`** — reines Supabase-CLI-Tooling-Artefakt
  (Versions-Probe), keine Code-Änderung, gehört nie in einen Commit.
- **`WORKING_DIR_INVENTORY.md`** (diese Datei) — reine Session-Doku, nicht
  Teil der ursprünglichen 128 Dateien, nicht committet.

## appMap.ts vs. featureFlags.ts — Live-Abgleich (Gruppe G)

`featureFlags.ts` hatte **keinen** live deployten Vorgänger zum
Vergleichen — die Datei war komplett neu und wurde vom zuletzt deployten
Frontend-Stand (Build aus Commit `7a25d2aa`) noch gar nicht referenziert
(auch `App.tsx` importierte sie dort noch nicht). Kein Abweichungs-Risiko,
da nichts Live existierte, wogegen abzugleichen wäre — jetzt in Commit
`00802f63` committet und aktiv genutzt (App.tsx, ClientModeSettings.tsx,
ClientAppLayout.tsx).

---

## Ursprüngliche Bestandsaufnahme (18.07.2026, vor den obigen Commits)

Reine Bestandsaufnahme, erstellt 18.07.2026 (im Rahmen von Store-Fahrplan
Schritt 3C, nach dem Security-Deploy `7a25d2aa`). **Nichts davon wurde
committet, gestasht, verworfen, deployed oder editiert** — reiner
Lesevorgang. Diese Datei ist das einzige, was in dieser Session neu
angelegt wurde.

Branch: `feature/multi-beruf-verkabelung`. 114 Zeilen `git status --short`
(104 modifizierte, getrackte Dateien + 10 neue/untracked, davon 4
Migrationen).

## Zentraler Befund vorab (wichtig für jede Einzelentscheidung unten)

**Fast der komplette Backend-/DB-Anteil dieser 114 Dateien ist bereits LIVE
in Produktion** — nur nie committet. Beleg: Zeitstempel-Abgleich zwischen
lokalen Datei-mtimes, den vier neuen Migrationsdateien und den
`updated_at`-Werten der Supabase Edge Functions (per `list_edge_functions`
abgefragt) zeigen klar abgegrenzte Deploy-Cluster:

| Zeitpunkt (UTC) | Was wurde deployed |
|---|---|
| 12.07.2026 21:43–21:48 | ~17 Edge Functions: Resend-Domain-Fix + Signup-Attribution/Mission-Control (`notify-new-registration`, `notify-provider-client-blocked`, `invite-client-with-password` neu, alle `send-*`-Mailer) |
| 15.07.2026 19:51 | `hufi-agent` (Multi-Beruf-Profile) |
| 17.07.2026 16:23–16:28 | `hufi-tts`, `copecart-webhook`, `delete-my-account` (Voice-Credits) |
| 18.07.2026 17:08 | `check-overdue-invoices` — **das ist unser eigener 3B-Security-Fix von heute**, kein fremder Stand |

Live-DB-Check bestätigt zusätzlich: die Spalten `signup_app`/`utm_source`/
`utm_campaign`/`signup_referrer` auf `profiles` sowie die Tabellen
`hufi_credits`, `hufi_voice_credits`, `hufi_followup_suggestions` und die
Task-Queue-Konsolidierung existieren bereits live — die vier neuen
Migrationsdateien im Working Directory sind also **Nachdokumentation von
bereits angewendeten DB-Änderungen**, keine offenen Migrationen.

**Konsequenz:** Das Risiko liegt NICHT darin, dass dieser Stand beim
Deployen "kaputte" Backend-Logik live schalten würde — die Backend-Seite
läuft schon. Das Risiko liegt darin, dass die **Frontend**-Seite (React)
dazu nie gebaut/deployed wurde und die Arbeit nirgends in Git nachvollziehbar
ist. Ein Server-Neuaufsetzen oder ein `git reset` würde diese Erkenntnis
über den Live-Zustand der DB/Edge-Functions NICHT rückgängig machen (die
sind serverseitig persistent), aber die Frontend-Seite und die
Nachvollziehbarkeit gingen verloren.

---

## 1. Thematische Gruppen

### Gruppe A — Resend-Domain-Fix (`info@hufiapp.de` → `*@hufmanager.de`)
**19 Dateien**, alle Edge Functions:
`admin-create-user`, `admin-notifications`, `botschafter-welcome`,
`generate-completion-report`, `invite-client-with-password` (neu),
`notify-provider-client-blocked` (neu), `send-appointment-reminders`,
`send-client-invitation`, `send-password-changed-email`,
`send-provider-invitation`, `send-reschedule-notification`,
`send-system-update`, `funnel-lead-notify`, `onboard-provider`,
`send-admin-invoice`, `send-email`, `send-employee-invitation`,
`send-partner-invitation`, `check-overdue-invoices` (Sonderfall, s.u.).

**Zweck:** Der `hufiapp.de`-Absender ist bei Resend nicht verifiziert
(siehe Memory „Resend-Domain-Problem"), Mails scheiterten still. Fix:
Absenderadresse überall auf die verifizierte `hufmanager.de`-Domain
umgestellt. Rein mechanisch, 1 Zeile pro Datei.

**Reifegrad:** **Fertig.** Bereits live deployed (12.07., siehe oben).
Verifiziert per `get_edge_function` an `notify-new-registration`: der
Live-Code ist byte-identisch mit der lokalen Datei.

**Berührt unsere Fixes?** `check-overdue-invoices` ja — siehe eigener
Abschnitt unten unter „Kollisionscheck". Sonst nein.

**Empfehlung:** (a) Fertig, lohnt Commit — reines Housekeeping, in Git
nachziehen schließt die Lücke zwischen Repo und Live-Zustand.

---

### Gruppe B — Signup-Attribution + Mission-Control
**Migration** `20260712120000_signup_attribution.sql` (neu),
**`src/lib/attribution.ts`** (neu, 88 Zeilen), plus Verwendungsstellen mit
ATTRIBUTION-Signal: `src/components/admin/AdminRegistrations.tsx`,
`src/pages/ConnectForm.tsx`, `src/hooks/useAuth.tsx`, `src/main.tsx`,
`src/pages/PferdeakteBotschafter.tsx`, `src/pages/botschafter/BotschafterAuth.tsx`,
`src/components/subscription/{ClientAppUpgradeModal,PricingModal,ProGateDialog,UpgradeModal}.tsx`,
`src/components/website/PricingV2.tsx`, `src/integrations/supabase/types.ts`
(generierte Typen), `supabase/functions/notify-new-registration/index.ts`
(auch Teil von Gruppe A).

**Zweck:** Herkunft von Neuregistrierungen tracken (UTM/Referrer/App) und
im Mission-Control-Admin-Bereich sowie in der Registrierungs-Mail
anzeigen. Deckt sich mit der bereits bekannten Memory „Mission Control +
Signup-Attribution — … live 12.07.2026".

**Reifegrad:** Backend/DB **fertig und live** (Spalten existieren, Edge
Function live, per Live-Code-Vergleich verifiziert). Frontend-Seite nicht
einzeln verifiziert (Zeit reichte nicht für Volltext-Review aller
Pricing-/Subscription-Dateien), aber keine TODO/FIXME-Marker, keine
fehlenden Imports gefunden.

**Berührt unsere Fixes?** Nein direkt, aber `notify-new-registration`
überschneidet sich mit Gruppe A.

**Empfehlung:** (a) Wirkt fertig, Review zum Behalten lohnt sich —
Backend ist bereits scharf, das Frontend sollte zeitnah nachgezogen
werden, sonst bleibt die bereits gesammelte Attribution unsichtbar.

---

### Gruppe C — Voice-Credits / Guthaben
**Migration** `20260717120000_hufi_voice_credits.sql` (neu),
**`src/hooks/useHufiVoiceCredits.ts`** (neu, 92 Zeilen),
**`src/pages/management/ManagementGuthaben.tsx`** (neu, 136 Zeilen),
Route-Eintrag in `src/App.tsx`, `supabase/functions/hufi-tts/index.ts`,
`supabase/functions/copecart-webhook/index.ts` (Guthaben-Kauf-Anbindung),
Nav-/Anzeige-Stellen: `src/components/layout/{MobileShell,MobileShellParts,AppSidebar}.tsx`,
`src/components/management/ManagementOverview.tsx`, `src/pages/ManagementHub.tsx`,
`src/hooks/useHufiTTS.ts`, `src/pages/settings/AboSettings.tsx`.

**Zweck:** Käufliches Sprach-/KI-Guthaben (Voice-Credits), Anzeige im
Management-Bereich, Verbrauch über `hufi-tts`, Kauf über CopeCart-Webhook.

**Reifegrad:** Backend/DB **fertig und live** (17.07., per
`hufi_voice_credits`/`hufi_credits`-Tabellen-Check bestätigt). Diese
DB-Funktionen (`use_hufi_credit`, `add_hufi_credits` etc.) haben wir in
Schritt 3B/3C bereits security-gehärtet — die dort verwendete `auth.uid()`-
Bindung passt zu diesem Frontend-Code (`p_user_id` wird weiterhin
mitgegeben, aber serverseitig ignoriert — siehe unten „Kollisionscheck",
kein Bruch).

**Berührt unsere Fixes?** Ja, indirekt — nutzt exakt die DB-Funktionen,
die wir in 3B/3C abgesichert haben. Kein Widerspruch, siehe Kollisionscheck.

**Empfehlung:** (a) Wirkt fertig, Review zum Behalten — Backend live,
Frontend-Stück vorhanden und in Nav verkabelt (Signale in MobileShell/
AppSidebar), Feature wirkt kurz vor Launch-reif.

---

### Gruppe D — Multi-Beruf-Verkabelung
`supabase/functions/hufi-agent/index.ts` (362 Zeilen, `PROFESSION_PROFILES`-
Lookup vollständig definiert, keine offenen Enden gefunden),
`src/components/calendar/AppointmentFormModal.tsx`,
`src/components/dashboard-zones/NextAppointmentCard.tsx`,
`src/components/dashboard/PferdeakteInsights.tsx`,
`src/components/dashboard/widgets/widgetRegistry.ts`,
`src/components/horse-detail/TabDokumente.tsx`,
`src/hooks/useDashboardWidgets.ts`, `src/pages/Dashboard.tsx`,
`src/pages/partner/PartnerHome.tsx`, Anteile von
`src/components/website/PricingV2.tsx`, `src/integrations/supabase/types.ts`.

**Zweck:** Berufsabhängige Defaults (Terminlänge, Service-Bezeichnung,
Dashboard-Widgets) statt hartcodiert für Hufpfleger. Baut auf dem bereits
committeten `src/hooks/useProfessionConfig.ts` auf (unverändert, bereits
in HEAD) — kein Neubau, sondern Erweiterung einer bestehenden,
soliden Basis.

**Reifegrad:** Wirkt strukturell **fertig** — `PROFESSION_PROFILES` ist
vollständig definiert (keine Lücken, keine TODOs), `hufi-agent` bereits
live deployed (15.07.). Frontend-Seite nicht file-für-file verifiziert.

**Berührt unsere Fixes?** Nein direkt.

**Empfehlung:** (b) Wirkt fertig bis leicht halbfertig — lohnt gezielten
Review (großer Wirkungsbereich, viele Dateien), dann sehr wahrscheinlich
behaltbar.

---

### Gruppe E — Rebranding „HufManager" → „Hufi" + Routen-Korrekturen
Viele kleine (1–5 Zeilen) Änderungen, quer verteilt:
`src/components/auth/AuthLoadingScreen.tsx`, `src/lib/hufi-biometrics.ts`,
`src/components/hufrente/HufrenteShareSheet.tsx`,
`src/components/invite/ShareInviteLinkCard.tsx`, `src/pages/BhsBalanceCockpit.tsx`,
`src/components/onboarding/ClientOnboarding.tsx`, `src/lib/hufi-scenarios.ts`,
`src/lib/hufi-nav-actions.ts`, `src/components/dashboard/FirstStepsChecklist.tsx`,
`src/components/growth/FeatureDiscoveryHint.tsx`, `src/components/KiHinweisModal.tsx`
(eigenständig: `hufi_memory`-Kategorie-Rename `dsgvo/ki_consent_anthropic` →
`permission/ki_consent`).

**Zweck:** Produktname im Nutzertext von „HufManager" auf „Hufi"
vereinheitlicht, dazu mehrere veraltete Routen korrigiert (`/hufi/faq` →
`/support`, `/stall/rechnungen` → `/client-invoices`, `/hufanalyse` bzw.
`/huf-analyse` → `/work-mode`, `/angebote` → `/mein-angebot`).

**Reifegrad:** Wirkt **fertig** — reine Text-/Routen-Korrekturen, keine
neue Logik, kein Risiko.

**Berührt unsere Fixes?** Nein.

**Empfehlung:** (a) Fertig, unkritisch — kann eigentlich jederzeit
committet werden, unabhängig von den größeren Themen.

---

### Gruppe F — Discovery-Onboarding-Reste
`src/components/onboarding/HufiOnboardingChat.tsx` (153 Zeilen),
`src/lib/hufi-brain.ts` (85 Zeilen).

**Wichtig:** Der GROSSE Discovery-Onboarding-Teil (Commit-Botschaft „feat
(onboarding): Discovery-Dialog + Memory-Seeding + Cross-User-Aggregat
(M1-M3)") ist bereits **committet** (Vorgänger-Commit von `7a25d2aa`) und
lief bereits durch unseren heutigen Security-Build mit. Was hier liegt,
sind nur Nacharbeiten obendrauf — vermutlich Berufs-Bezug im
Discovery-Dialog (BERUF+DISCOVERY-Signal gemeinsam gefunden).

**Reifegrad:** Unklar ohne tieferen Review, da Basis bereits live ist und
nur der Zusatz hier liegt.

**Berührt unsere Fixes?** Nein.

**Empfehlung:** (b) Halbfertig wirkend, kleiner Umfang — schneller Review
möglich.

---

### Gruppe G — Infrastruktur: `appMap.ts` + `featureFlags.ts`
`src/config/appMap.ts` (neu, **2987 Zeilen**), `src/config/featureFlags.ts`
(neu, 55 Zeilen).

**Wichtiger Befund:** `appMap.ts` wird **von KEINER einzigen Datei im
gesamten Repo importiert** (`grep -r "config/appMap"` → 0 Treffer). Das
ist die Datei, die laut `HUFI_ROADMAP.md` („PFLEGE-REGEL, verbindlich ab
18.07.2026") die „Single Source of Truth für Navigation, FAQ und
Reifegrad-Tracking" sein soll — sie liegt komplett verwaist da. Entweder
ist der Konsument (z. B. ein Admin-Dashboard, das appMap.ts lesen soll)
noch nicht gebaut, oder die Pflege-Regel läuft ins Leere.

`featureFlags.ts` dagegen wird aktiv importiert von `src/App.tsx`,
`src/components/client/ClientModeSettings.tsx`,
`src/components/client/ClientAppLayout.tsx` — alle drei sind Teil
desselben uncommitteten Standes, in sich konsistent, kein Build-Risiko.

**Reifegrad:** `featureFlags.ts` fertig und in Benutzung. `appMap.ts`
technisch vollständig (2987 Zeilen strukturierte Daten), aber
funktionslos, solange niemand es importiert.

**Berührt unsere Fixes?** Nein.

**Empfehlung:** Für `featureFlags.ts`: (a) fertig, behalten. Für
`appMap.ts`: **Rückfrage an dich** — ist der Konsument noch geplant, oder
soll die Pflege-Regel im Roadmap zurückgenommen werden? Das ist keine
Code-Entscheidung, sondern eine Produkt-Entscheidung.

---

### Gruppe H — Kleinere Einzel-Cleanups (kein gemeinsames Thema)
`src/components/ErrorBoundary.tsx` (Styling: erzwungenes Light-Theme statt
Theme-Variablen — evtl. Absicht für Error-Screens, evtl. Regression, siehe
unten), `src/pages/ImportCenter.tsx` (ungenutzte `useAuth()`-Destructure
entfernt), `src/pages/Docs.tsx`, `src/components/website/Navbar.tsx`,
`src/components/website/FooterNew.tsx` (toter Link zu `/vertrauen`
„Trust & Security" und `/blog` entfernt — vermutlich Folgefix zur
Attrappen-Triage aus Schritt 2/15, diese Seiten existier(t)en offenbar
nicht mehr), `vite.config.ts` (55 Zeilen, nicht inhaltlich geprüft),
`supabase/.temp/cli-latest` (reines CLI-Tooling-Artefakt, keine
Code-Änderung, gehört nicht in einen Commit).

**Reifegrad:** Einzeln fertig wirkend, aber kein inhaltlicher
Zusammenhang zwischen den Dateien.

**Empfehlung:** (a) für die meisten — unkritische Aufräumarbeit. Bei
`ErrorBoundary.tsx`: kurz prüfen, ob das erzwungene Light-Theme Absicht
ist (Error-Screens oft bewusst themeneutral) oder ein Rest eines
Redesigns.

---

### Gruppe „Unklar" — nicht abschließend zugeordnet
Aus Zeitgründen nicht einzeln bis zum Grund geprüft (kein eindeutiges
Signal, kleine bis mittlere Diffs): `src/components/auth/MultiStepSignup.tsx`,
`src/components/buchhaltung/SteuerberaterAccess.tsx`,
`src/components/calendar/CalendarSyncModal.tsx`,
`src/components/consent/HufiFirstRunConsent.tsx`,
`src/components/day-cockpit/DayCockpit.tsx`,
`src/components/help/HelpCenterModal.tsx`,
`src/components/layout/AppHeader.tsx`, `src/components/layout/AppSidebar.tsx`,
`src/components/layout/{MobileShell,MobileShellParts}.tsx` (328 bzw. 32
Zeilen — größter Einzel-Diff der ganzen Liste, Signale deuten auf
Discovery+Credits-Nav-Integration, aber nicht vollständig gelesen),
`src/components/search/GlobalSearch.tsx`,
`src/components/subscription/{SubscriptionCard,PricingModal,UpgradeModal,ProGateDialog}.tsx`
(große Diffs, 39–93 Zeilen, vermutlich Pricing-Überarbeitung, ATTRIBUTION-
Signal aber Umfang spricht für mehr als nur Tracking),
`src/components/voice/{HeyHufi,HufiVoiceSelector,ProactiveBriefing}.tsx`,
`src/components/website/TestimonialsSection.tsx`,
`src/hooks/useVoiceCapture.ts` (Timeout 10s→45s — isolierte Einzeländerung),
`src/lib/{hufi-agent-tasks,hufi-learning-engine,hufi-task-engine,hufi-voice-config}.ts`,
`src/pages/{Auth,Hilfe,Kalender,Support,client/ClientNetwork,partner/PartnerConnect,
partner/PartnerManagementBusinessHub,partner/PartnerManagementHub,partner/PartnerPferde,
partner/PartnerPublicProfile,website/WebsiteHome}.tsx`, `src/main.tsx`.

**Empfehlung:** Vor jeder Entscheidung gezielt gegenlesen — insbesondere
`MobileShell.tsx` (328 Zeilen, zentrale Navigationskomponente) und die
vier Subscription-Dateien (Pricing-Logik ist geschäftskritisch).

---

## 2. Kollisionscheck (das Wichtigste)

**Ergebnis: Keine Regression gefunden, die unsere Arbeit der letzten Tage
rückgängig machen würde.** Im Detail geprüft:

1. **`check-overdue-invoices`** — enthält lokal bereits GENAU unseren
   heutigen 3B-Security-Fix (`token !== serviceKey` statt totem
   Auth-Check) PLUS den Domain-Fix. Das ist keine ältere, unsichere
   Version — es ist entweder identisch mit oder neuer als das, was wir
   deployed haben. Kein Konflikt.
2. **Voice-Credit-Funktionen** (`use_hufi_credit`, `add_hufi_credits` etc.)
   — der Frontend-Code in Gruppe C ruft diese mit `p_user_id`-Parameter
   auf; unser 3B/3C-Fix bindet die eigentliche Verbuchung serverseitig an
   `auth.uid()` und ignoriert den Parameter dafür. Kein Bruch — die
   Frontend-Aufrufe funktionieren unverändert weiter (die Nutzer buchen
   ohnehin nur gegen ihre eigene ID).
3. **`appMap.ts`/`featureFlags.ts`** — keine Überschneidung mit
   Security-/Rechts-Dateien (Impressum, TrustBadges, RLS-Policies). Reine
   Frontend-Konfiguration.
4. **`App.tsx`, `MobileShell.tsx`, `main.tsx`** — diese haben wir in den
   Security-/Aufräum-Schritten NICHT verändert (nur `Impressum.tsx` und
   `WebsiteTrustBadges.tsx` waren unsere Frontend-Anfassungen). Kein
   direkter Dateikonflikt.
5. **Kein Zugriff auf RLS-Policies oder Migrationsinhalte, die wir 3B/3C
   geändert haben** — die vier neuen Migrationsdateien hier (Attribution,
   Followup, Task-Queue, Voice-Credits) sind randscharf zu unseren
   Security-Migrationen; keine Tabellen-/Funktions-Überschneidung
   gefunden.

**Einzige offene Frage, kein Konflikt aber erwähnenswert:** Sollte
`ErrorBoundary.tsx` (Gruppe H) irgendwann committet werden, während unser
Impressum/TrustBadges-Stand schon live ist — kein technischer Konflikt,
da unterschiedliche Dateien, nur optisch zu prüfen (erzwungenes
Light-Theme).

---

## 3. TypeScript/Build-Zustand

`npx tsc --noEmit` **im tatsächlichen, unveränderten Working Directory**
(alle 114 uncommitteten Änderungen inklusive): **0 Fehler, Exit-Code 0.**

Kein einziger TODO/FIXME/XXX-Marker in irgendeinem der Diffs gefunden.
Keine fehlenden lokalen Imports in den neuen Dateien (`appMap.ts`,
`featureFlags.ts`, `useHufiVoiceCredits.ts`, `attribution.ts`,
`ManagementGuthaben.tsx`, `delete-my-account/index.ts`) gefunden.

**Einschätzung:** Das spricht klar für „kurz vor fertig", nicht für
„mittendrin kaputt abgebrochen". Kein Fix, keine Änderung vorgenommen —
nur geprüft, wie angewiesen.

---

## 4. Zusammenfassende Empfehlung pro Gruppe

| Gruppe | Dateien | Reifegrad | Empfehlung |
|---|---|---|---|
| A: Resend-Domain-Fix | 19 | fertig, live | (a) behalten |
| B: Signup-Attribution/Mission-Control | ~14 | Backend fertig+live, Frontend ungeprüft | (a) Review lohnt |
| C: Voice-Credits | ~11 | fertig, live, in Nav verkabelt | (a) Review lohnt |
| D: Multi-Beruf-Verkabelung | ~11 | strukturell fertig | (b) gezielter Review |
| E: Rebranding/Routen | 11 | fertig | (a) unkritisch |
| F: Discovery-Onboarding-Reste | 2 | unklar (Basis bereits live) | (b) kurzer Review |
| G: appMap.ts/featureFlags.ts | 2 | featureFlags fertig, appMap verwaist | Rückfrage nötig |
| H: Kleinere Cleanups | 7 | fertig | (a) unkritisch |
| Unklar | ~28 | nicht geprüft | vor Entscheidung gegenlesen |

**Entschieden wird das von dir — diese Tabelle ist nur die Grundlage.**
