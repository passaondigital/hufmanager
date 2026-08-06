# Hufi Workspace — Informationsarchitektur-Analyse

> Stand: 2026-08-06. Reines Analyse-Dokument für die Entscheidung, wie der
> geplante manuelle "Workspace" (Swipe-Prototyp, siehe
> `src/components/workspace/HufiSwipeWorkspace.tsx` und
> `docs/hufi-workspace.md`) neben der Hufi-KI-Startseite aussehen sollte.
>
> **Nichts an der echten Navigation wurde verändert.** Kein Code-Commit,
> keine Route umgebaut, `docs/qa/` nicht angefasst. Alle Empfehlungen in
> diesem Dokument sind **Hypothesen zur Entscheidung durch Pascal**, keine
> beschlossene Umsetzung.
>
> Methodik: Jede Aussage zu Reifegrad/Zweck ist entweder direkt aus
> `src/config/appMap.ts` (Single Source of Truth, 247 Einträge, Stand dieses
> Checkouts) zitiert, oder durch eigenes Nachlesen im echten Code verifiziert
> (Datei/Zeile genannt). Wo appMap etwas nicht abdeckt oder ich im Code etwas
> gefunden habe, das appMap nicht dokumentiert (z.B. kaputte Sidebar-Links),
> ist das explizit als **eigener Code-Fund, nicht aus appMap** gekennzeichnet.
> Wo ich unsicher bin, steht "nicht im Code nachgewiesen".
>
> Verwandtes, ebenfalls aktuelles Dokument:
> `docs/architecture/HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md` behandelt
> die Frage "welches Modul sieht welcher Beruf" im Detail (Berufsprofil ×
> Arbeitsweise × Einnahmequelle × Betriebsstruktur). Dieses Dokument hier
> fragt stattdessen "wie viele Kacheln, welche Struktur, was bleibt im
> Hamburger-Menü" — beide ergänzen sich, ich wiederhole die Berufsmatrix
> nicht im Detail, sondern referenziere sie.

---

## 1. Zusammenfassung

- **247 appMap-Einträge** analysiert: 134 `live`, 36 `teilweise`, 77
  `attrappe`. Von den 77 `attrappe`-Einträgen haben **75 gar keine Route**
  (`route: null`) — das sind vollständig unerreichbare, aber existierende
  Dateien ("toter Code"), keine schlecht auffindbaren Funktionen. Nur 2
  `attrappe`-Einträge haben überhaupt eine Route (`/client-marketplace` und
  der Portal-Fallback `/portal/:slug/*`), beide bewusst hinter
  Feature-Flags versteckt.
- Zusätzlich zu appMap habe ich **direkt im Code weitere, dort nicht
  erfasste kaputte Navigationslinks gefunden**: Die Partner-Sidebar
  (`PartnerAppLayout.tsx`) verlinkt auf **10 Routen, die in `App.tsx`
  überhaupt nicht existieren** (führen zu 404); die Provider-Sidebar
  (`AppSidebar.tsx`) verlinkt auf **3 weitere nicht existierende Routen**.
  Siehe Abschnitt 5.
- Kernbefund zu Duplikaten: **Kalender, Kunden, Pferde, Rechnungen,
  Management/Einstellungen, Chat und Support existieren jeweils 3–5 mal**
  parallel implementiert, einmal pro Rolle (Provider/Partner/Employee/
  Client/Portal), mit unterschiedlichem Reifegrad und unterschiedlichen
  Bugs pro Kopie. Siehe Abschnitt 6.
- Zwei komplette, fertig gebaute aber **nirgends verdrahtete Rollen/Module**
  liegen tot im Repo: die **Botschafter-Dashboard-Suite** (14 Dateien) und
  die **Stallbetreiber-Rolle** (16 Dateien, inkl. Client-seitiger
  Stall-/Gewerbeverwaltung). Beide bewusst per Feature-Flag pausiert
  (`stallbetreiberRolle`, `botschafterDashboard` in
  `src/config/featureFlags.ts`), nicht versehentlich verloren.
- Die im Auftrag vorgegebene 10-Modul-Hypothese halte ich nach Prüfung
  gegen die echten Daten für **teilweise, nicht vollständig tragfähig**:
  zwei der zehn Module ("Produkte & Shop", "Digitales Business") sind für
  die beiden Kernrollen (Provider, Partner) nur schwach mit echten,
  täglich genutzten Funktionen unterlegt. Meine Empfehlung in Abschnitt 9
  weicht deshalb an zwei Stellen ab.

---

## 2. Methodik & Quellen

- `src/config/appMap.ts` (2987 Zeilen, 247 Einträge) programmatisch
  geparst (Node, AST-freie Array-Extraktion) und nach Rolle gruppiert.
- `src/App.tsx` (744 Zeilen) vollständig gelesen: jede Route, jedes
  `ProtectedRoute allowedRoles`, jede Layout-Zuordnung.
- Navigationsquellen vollständig gelesen: `HufiMenu.tsx`,
  `AppSidebar.tsx`, `MobileBottomNav.tsx`, `ClientAppLayout.tsx`,
  `PartnerAppLayout.tsx`, `EmployeeAppLayout.tsx`, `PortalAppLayout.tsx` +
  `PortalSidebar.tsx`, `ManagementHub.tsx`.
- `docs/hufi-workspace.md`, `docs/mission-control-inventory.md`,
  `docs/HUFI_CORE_TARGET_ARCHITECTURE.md` (insb. Abschnitt 8 "Frontend
  Philosophy") gelesen und gegen den echten Code geprüft, nicht blind
  übernommen.
- Stichprobenartige `grep`-Verifikation jeder in Navigationsdateien
  verwendeten Route gegen die tatsächlich in `App.tsx` registrierten
  Pfade — daher die in Abschnitt 5 gefundenen kaputten Links, die appMap
  nicht auflistet (appMap dokumentiert *Seiten*, nicht *jeden Button, der
  auf eine Seite zeigt*).
- `src/config/featureFlags.ts` gelesen, um zu prüfen, ob "attrappe"/toter
  Code beabsichtigt pausiert oder unbeabsichtigt verloren ist.

---

## 3. Bestandsliste nach Rolle

Für jede Rolle: kurze Beschreibung der heutigen Navigationsstruktur, dann
eine Tabelle mit Route, heutigem Navigationsort, Zweck (aus appMap
`zweck`), Reifegrad (aus appMap `reife` + `reifeNotiz`, gekürzt) und
Berechtigung (`ProtectedRoute allowedRoles` aus `App.tsx`).

Alle appMap-`reifeNotiz`-Texte sind auf ca. 180 Zeichen gekürzt; für den
Volltext siehe `src/config/appMap.ts` direkt (per `id` suchbar, `id` steht
nicht in den Tabellen, aber Route+Label sind eindeutig genug zum Finden).

### 3.1 Provider / Admin — Kern-CRM (`AppLayout`, `MobileShell`)

Berechtigung: `ProtectedRoute allowedRoles={["provider","admin"]}`
(`App.tsx` Z. 576–645). Betrifft primär Hufbearbeiter/Hufschmiede (die
Kernrolle des Produkts), technisch auch für `admin`-Accounts nutzbar.

**Heutige Navigation:** Desktop `AppSidebar.tsx` — "Die 5 A's"
(Anfragen/Angebote/Aufnahme/Auffassen/Analyse, je mit Untermenü) +
"Erweiterungen" (Business, Kundenapp, Mein Office, Lager, Mitarbeiter,
Hufi Connect, E-Mail Marketing) + Management-Link unten. Mobil:
`MobileBottomNav.tsx` mit nur 4 festen Tabs (Kalender, Pferde, Kunden,
Rechnungen) + zentralem Mic-Button zum Hufi-Assistenten. Zusätzlich
`HufiMenu.tsx` (Hamburger, rechts oben im Assistenten-Screen) — bewusst
schlank, nur Profil/Einstellungen/Guthaben/Abo/Hilfe/Rechtliches/Logout.

| Route | Nav-Ort heute | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|---|
| `/home` | MobileBottomNav Mic-Button, Startpunkt | Dashboard-Startseite für Provider mit Übersicht, Hufi-Assistent und Schnellzugriffen | live | — |
| `/pferde` | Sidebar "3 Aufnahme"; MobileBottomNav Tab | Übersicht aller eigenen/freigegebenen Pferde mit Suche und Statistiken | live | — |
| `/pferd/:id` | von `/pferde` aus | Detailansicht: Stammdaten, Termine, Fotos, Dokumente, Pferdeakte | live | — |
| `/kunden` | Sidebar "3 Aufnahme"; MobileBottomNav Tab | Kundenverwaltung: Anlegen, Einladen, Filtern, Export | live | — |
| `/kalender` | Sidebar "4 Auffassen"; MobileBottomNav Tab | Terminkalender Tag/Woche/Monat, Kartenansicht, Sync, Drag&Drop | live | — |
| `/rechnungen` | Sidebar "5 Analyse"; MobileBottomNav Tab | Rechnungen erstellen, PDF, Stornieren, DATEV-Export | live | — |
| `/mein-angebot` | Sidebar "2 Angebote" | Leistungen, Preisgruppen, Preismatrix | live | — |
| `/anfragen` | Sidebar "1 Anfragen" (Warteliste) | Eingehende Leads/Anfragen, Status, Klassifizierung | live | — |
| `/aufnahme` | Workspace-Prototyp-Kandidat (nicht in Sidebar direkt) | Schnellzugriff-Hub: neuer Kunde/Pferd, App-Einladung | live | — |
| `/tour` | Sidebar "4 Auffassen" (Tages-Cockpit) | Tages-Cockpit: GPS, Route, Terminabarbeitung, Notfalltermine | live | — |
| `/lager` | Sidebar "Erweiterungen" (Feature-gated) | Lagerverwaltung: Katalog, Bestand, Lieferanten, Einkaufsliste | live | — |
| `/work-mode` | Sidebar "4 Auffassen" (HufCam/Hufanalyse Deep-Links) | Zeiterfassung, km-Tracker, Tourkarte, HufCam, Hufanalyse, Fahrzeuge | live | — |
| `/ausgaben` | Sidebar "5 Analyse" | Betriebsausgaben erfassen/kategorisieren, indikativer Monatsgewinn | live | — |
| `/buchhaltung` | Sidebar "5 Analyse" | EÜR, USt-VA, Belegarchiv, Export, Steuerberater-Freigabe | **teilweise** | EÜR/USt-VA/Belegarchiv/Export live; "Steuerberater"-Tab hatte Fake-Token-Link (mittlerweile auf "Bald verfügbar" deaktiviert), "Komplettpaket erstellen" ehrlich als toast gelabelt |
| `/guv` | Sidebar "5 Analyse" | Monats- und 6-Monats-Vergleich Einnahmen/Ausgaben/Ergebnis | live | — |
| `/business` | Sidebar "Erweiterungen" (Hufi Business) | Kachel-Hub zu Rechnungen/Buchhaltung/Ausgaben/GuV/Fuhrpark/Lager/Export | live | — |
| `/analyse` | verlinkt aus `/archiv`, GlobalSearch, HelpCenter | Hub-Seite: Statistiken, Umsatz, Pferde-Auswertung, Bewertungen | live | — |
| `/analyse/betriebszahlen` | Sidebar "5 Analyse" (Betriebszahlen) | Jahresumsatz, Termine, Kunden, Charts | **teilweise** | Charts/KPIs live; Export-Button ohne `onClick`, tut nichts |
| `/chat` | Sidebar "1 Anfragen" (Inbox) | Konversationsliste + Chat Provider↔Kunde, Realtime | live | — |
| `/auffassen` | — (Hub selbst nicht direkt in Sidebar verlinkt, referenziert nur Unterpunkte) | Hub-Seite Arbeitstag: Terminplaner, Tages-Cockpit, Nachrichten, Übersicht | live | — |
| `/auffassen/feedback` | Sidebar "4 Auffassen" (Feedback) | Kundenbewertungen + internes Feedback, Rezensionsanfragen | live | — |
| `/mein-office` | Sidebar "Erweiterungen" (Feature-gated) | Dokumentenverwaltung: Vorlagen, Favoriten, Archiv | live | — |
| `/mein-office/:id` | von `/mein-office` aus | Canvas-Editor: Bearbeiten, PDF-Export, PDF-Ablage in Storage | live | — |
| `/archiv` | **verwaist** (nur Link liegt in `MobileHeader.tsx`, das nirgends importiert wird) | Rollenabhängiges Kachel-Menü als zentrale Navigation zu allen Bereichen + Logout | live | — |
| `/fuhrpark` | Sidebar "5 Analyse"; `/business`-Hub | Fahrzeuge, Tankkosten, km-Stand verwalten/auswerten | live | — |
| `/team` | Sidebar "Erweiterungen" (Mitarbeiter, Feature-gated) | Mitarbeiter, Abwesenheiten, Materialzuweisungen | live | — |
| `/notfall` | **verwaist** — kein einziger sichtbarer Link im Provider-UI (nur Style-Check in `AppSidebar.tsx` Z. 256, keine echte `NavLink`) | Rollenspezifische Soforthilfe: Kunden-OTP, Eskalation, SOS-Support | live | — |
| `/management` … 10 Unterseiten | siehe 3.2 | siehe 3.2 | siehe 3.2 | siehe 3.2 |
| `/bhs-balance` | Sidebar "3 Aufnahme" (Feature-gated `bhs`) | Übersicht/Verwaltung laufender BHS-Balance-Abos inkl. Kündigung | live | — |
| `/support` | Sidebar (Hilfe & Support, unten) | Einstieg: Hufi-Chat, FAQ, E-Mail-Support, Video-Tutorials | **teilweise** | Chat-Kachel klickt per `document.querySelector` auf externen Floating-Button (fragiler DOM-Hack) statt echtem Handler |
| `/hilfe` | HufiMenu ("Hilfe & FAQ") | (separate Hilfe-Seite, war gebaut aber nie geroutet, App.tsx-Kommentar Z. 643) | nicht im Code als eigener appMap-Eintrag erfasst — separat von `/support` | — |

Nicht Teil der 5-A's-Sidebar, aber im Provider-Layout geroutet und in
appMap erfasst: `/hufi-observation-lab` (ProtectedRoute
`["provider","employee","admin"]`, **explizit bewusst nicht in die
Hauptnavigation aufgenommen** — siehe Kommentar `App.tsx` Z. 153–158; im
Workspace-Prototyp als "Beobachtung"-Kachel verlinkt) und `/hufi/memory`
(ProtectedRoute `["provider","admin"]`, nur erreichbar über einen Link in
`KiSettingsCard.tsx`/`Datenschutz.tsx`, nicht über Sidebar/Menü — DSGVO-
Transparenzfunktion "Was Hufi über dich weiß").

### 3.2 Provider — Management/Einstellungen (`/management/*`)

Selbe Berechtigung wie 3.1 (Teil von `AppLayout`). Erreichbar über
`ManagementHub.tsx` (Kachel-Hub) sowie einen einzelnen "Management"-Link
unten in `AppSidebar.tsx` und "Einstellungen" in `HufiMenu.tsx`.

| Route | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|
| `/management` | Zentrales Einstellungs-Hub: Profil, Sicherheit, Business, Recht/Steuer, Abo, Guthaben, Import | live | — |
| `/management/profil` | Profilpflege (Business/Hours/Reminders-Tabs) | live | — |
| `/management/sicherheit` | WebAuthn-Biometrie einrichten/testen/entfernen | live | — |
| `/management/business` | Hub zu Steuer/Abo/Recht/Website/Kommunikation mit Status je Kachel | live | — |
| `/management/kommunikation` | Nachrichtenvorlagen, Push- und E-Mail-Einstellungen | **teilweise** | Speichert `communication_mode`, aber kein Backend wertet das Feld aus, um WhatsApp vs. In-App tatsächlich zu routen |
| `/management/abo` | Abo-, Zahlungs-, B2B-Tabs | live | — |
| `/management/guthaben` | Voice-Guthaben, Verlauf, CopeCart-Aufladen | live | — |
| `/settings/abo` | Zeigt aktuellen Plan, Upgrade/Kündigung/Rechnungsanfrage — **zweite Route für dasselbe Thema wie `/management/abo`** | live | — |
| `/management/rechtliches` | Impressum, AGB/Datenschutz, AVV für eigene Landingpage | live | — |
| `/management/steuer` | Land, Steuernummer, Kleinunternehmerregelung, Preisanzeige | live | — |
| `/management/import` | Kontakt-Import: CSV/Excel/vCard/JSON, Magic Link, Telefonbuch, KI-Assistent | live | — |
| `/management/website` | Landingpage-Einstellungen (Subdomain, Texte, Sections, Galerie), Bewertungen | live | — |
| `/management/botschafter` | **Nur ein `Navigate to="/management"`-Redirect** — Ziel existiert nicht als eigene Seite für Provider (siehe Abschnitt 7, Botschafter-Cluster) | — | — |

### 3.3 Client (Pferdebesitzer) — `ClientAppLayout`

Berechtigung: `ProtectedRoute allowedRoles={["client"]}`. Navigation:
eigenes Sidebar-Menü in `ClientAppLayout.tsx` mit Gruppen (Dashboard,
Meine Pferde, Termine & Aufträge, Kommunikation, [bedingt: Stallbetrieb/
Gewerbebetrieb], Verwaltung, Konto) + eigene mobile Bottom-Nav (Home,
Pferde, Buchen, Aufträge, Profil).

| Route | Nav-Ort heute | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|---|
| `/client-home` | Sidebar "Dashboard" + Bottom-Nav | Dashboard: Pferde, offene Aufträge, nächster Termin, Quick Actions | live | — |
| `/client-horses` | Sidebar "Meine Pferde"; Bottom-Nav | Liste aller Pferde mit Kurzinfo, nächster Termin | live | — |
| `/client-horse/:id` | von `/client-horses` | Pferdeprofil: Pferdeakte, Fotos, Dokumente, Termine | live | — |
| `/client-booking` | Sidebar "Termine & Aufträge"; Bottom-Nav | Schritt-für-Schritt-Buchung eines Service | live | — |
| `/client-invoices` | Sidebar "Termine & Aufträge" | Rechnungen ansehen/PDF/versenden/bezahlen, Ausgaben-Tracking | live | — |
| `/client-bhs-abo` | Sidebar "Termine & Aufträge" | BHS-Abo einsehen/kündigen | live | — |
| `/client-permissions` | Sidebar "Verwaltung" | Datenfreigabe: wer hat Zugriff auf Pferdedaten | live | — |
| `/client-profile` | Sidebar "Konto"; Bottom-Nav | Persönliche Daten, Stallstandort, Notfallkontakte, DSGVO-Export/Löschung | live | — |
| `/client-account-type` | Sidebar "Konto" | Account-Modus (privat/Stall/Gewerbe) einstellen | live | — |
| `/client-notifications` | Sidebar "Kommunikation" | Push-/E-Mail-Einstellungen, Sprache | live | — |
| `/client-notfall` | Sidebar "Verwaltung" | Hilfe-Center Login-Probleme, Chat-Kontakt, SOS-Meldung | live | — |
| `/client/search-providers` | Sidebar "Verwaltung" (Experten-Verzeichnis) | Fachpartner/Provider in der Nähe suchen, für Pferd einladen | live | — |
| `/client-support` | Sidebar "Konto" (Hilfe & Support) | Chat/FAQ/E-Mail/Video-Einstieg | **teilweise** | "FAQ"/"Video-Tutorials" navigieren zu `/faq` bzw. `/hilfe?section=videos` — beide existieren nicht, führen ins Leere |
| `/client-orders` | Sidebar "Termine & Aufträge"; Bottom-Nav | Liste eigener Service-Aufträge | live | — |
| `/client-chat` | Sidebar "Kommunikation" | Chat mit Hufbearbeiter, Experten, Stallgruppe | live | — |
| `/client-network` | Sidebar "Kommunikation" (Netzwerk) | Verbindungen zu anderen Pferdemenschen verwalten | **teilweise** | Annehmen/Ablehnen live; "Einladen", "HM Connect", "Per E-Mail einladen", Chat-Icon je Verbindung sind Platzhalter |
| `/client-marketplace` | Sidebar "Kommunikation" (nur wenn `clientMarketplaceBrowse` an — aktuell **aus**) | Marktplatz für Einstellplätze/Kurse/Dienstleistungen durchsuchen | **attrappe** | "Coming Soon"-Badge, hartcodiertes `DEMO_LISTINGS`, "Anfragen"-Button disabled |
| `/client-marketplace/create` | Sidebar (nur wenn Flag an) | Neues Marktplatz-Inserat anlegen | live | — |
| `/client-marketplace/mine` | Sidebar (nur wenn Flag an) | Eigene Inserate verwalten | live | — |
| `/client-kalender` | **nicht in `ClientAppLayout`-Sidebar gefunden** — separat von `/client-booking` | Monatskalender mit eigenen Terminen | live | — |
| `/client-historie` | **nicht in Sidebar gefunden** | Historie vergangener/stornierter Termine | live | — |
| `/client-dokumente` | **nicht in Sidebar gefunden** | Alle Dokumente aller eigenen Pferde gesammelt | live | — |

Zusätzlich vollständig **totes** Client-Untermenü "Stallbetrieb" (6
Einträge) und "Gewerbebetrieb" (5 Einträge) in `ClientAppLayout.tsx`
(Z. 95–134) — diese Sidebar-Gruppen werden nur gerendert, wenn
`accountType` = `stall`/`business` ist, verlinken aber auf Routen wie
`/client-stall/kalender`, `/client-business/customers`, die **nicht in
`App.tsx` registriert sind**. appMap führt die zugrunde liegenden Dateien
korrekt als `dead-*`-Einträge (siehe Abschnitt 7). Das bedeutet:
Nutzer, die im Onboarding "Stall" oder "Gewerbe" als Account-Typ wählen,
sehen eine Sidebar mit bis zu 11 Menüpunkten, die alle ins Leere führen.

### 3.4 Partner (Therapeuten, Osteopathen, Fachpartner) — `PartnerAppLayout`

Berechtigung: `ProtectedRoute allowedRoles={["partner","admin"]}`.
Navigation: eigene "5 A's"-Sidebar analog Provider, aber mit **eigenem,
unabhängig gepflegtem Routen-Set**, das an mehreren Stellen von
`App.tsx` abweicht (siehe Abschnitt 5 — 10 kaputte Links).

| Route | Nav-Ort heute | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|---|
| `/partner-home` | Sidebar "Dashboard" | Dashboard mit KPIs (Pferde, Termine, Kunden), Widgets | live* | KPIs echt, Quick-Action-Buttons zeigen auf `/partner-horses`/`/partner-import` — beide existieren nicht |
| `/partner-pferde` | Sidebar "3 Aufnahme" | Übersicht Kunden-/freigegebene Pferde, Suche | live* | Daten live, Kartenklick zeigt auf `/partner-horse/:id` statt registriertem `/partner-pferd/:id` |
| `/partner-pferd/:id` | von `/partner-pferde` | Detailansicht Pferd inkl. Zugriffskontrolle, Pferdeakte | live | — |
| `/partner-kunden` | Sidebar "3 Aufnahme" | Kundenverwaltung: anlegen, einladen, Pferde verwalten | live | — |
| `/partner-calendar` | Sidebar "4 Auffassen"; Bottom-Nav | Terminkalender, Termine anlegen/verschieben/löschen | live | — |
| `/partner-chat` | Sidebar "1 Anfragen" (Inbox); Bottom-Nav | Nachrichtenaustausch Partner↔Kunden/Hufbearbeiter | live | — |
| `/partner-notes` | Sidebar "3 Aufnahme" | Behandlungsnotizen pro Pferd | live | — |
| `/partner-plans` | Sidebar "3 Aufnahme" | Therapiepläne mit Fortschrittsverfolgung | live | — |
| `/partner-documents` | Sidebar "3 Aufnahme" | Upload/Verwaltung Befunde, Röntgenbilder, Berichte | live | — |
| `/partner-invoices` | Sidebar "5 Analyse" | Rechnungserstellung mit DACH-Steuerlogik, PDF-Export | live | — |
| `/partner-services` | Sidebar "2 Angebote" | Leistungen, Preisgruppen, Preismatrix | live | — |
| `/partner-connect` | **nicht im Sidebar-Array gefunden** (nur `/hm-connect`, das nicht existiert — siehe Abschnitt 5) | Vernetzung per ID-Suche, Verbindungsübersicht | **teilweise** | Suche/Liste live, "Verbinden"-Button ohne `onClick` |
| `/partner-profile` | **nicht im Sidebar-Array gefunden** | Partnerprofil bearbeiten (Foto, Bio, Qualifikationen) | live | — |
| `/partner-settings` | **nicht im Sidebar-Array gefunden** | Geschäfts-, Steuer-, Benachrichtigungseinstellungen | live | — |
| `/partner-management` (+4 Unterseiten) | Sidebar "Management" | Zentrale Kachel-Übersicht Profil/Business/Botschafter | **teilweise** | "Botschafter werden"-Kachel verlinkt auf nicht registrierte Route |
| `/partner-support` | Sidebar "Management" (Hilfe & Support) | Support-Hub: Chat, FAQ, E-Mail, Video-Tutorials | live | — |
| `/partner-einladung/:token` | öffentlich, per Link | Landingpage für Einladungslinks (Pferdezugriff) | live | — |
| `/partner/:prid` | öffentlich, per Link | Öffentliches Partnerprofil mit Kontaktformular | **teilweise** | Profildaten live, Kontaktformular sendet nichts wirklich ab (simulierter `setTimeout`-Erfolg) |

*„live*" markiert Seiten, deren Kerndaten laut appMap live sind, deren
Quick-Action-Buttons aber auf nicht existierende Routen zeigen
(`/partner-home` → `/partner-horses`/`/partner-import`;
`/partner-pferde`-Kartenklick → `/partner-horse/:id` statt
`/partner-pferd/:id`). appMap dokumentiert das bereits in der
`reifeNotiz`, ich übernehme es hier nur verkürzt.

### 3.5 Employee (Mitarbeiter) — `EmployeeAppLayout`

Berechtigung: `ProtectedRoute allowedRoles={["employee","admin"]}`.
Navigation: eigene Sidebar (Dashboard, Mein Arbeitstag, Kommunikation,
Verwaltung, Konto) + eigene Bottom-Nav. Von den vier Rollen-Layouts
navigatorisch am saubersten — keine im Code gefundenen kaputten Links.

| Route | Nav-Ort heute | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|---|
| `/employee` | Sidebar "Dashboard"; Bottom-Nav | Heutige Termine, Check-in/out, Wochenzeiten, Material, Abwesenheit | live | — |
| `/employee/tour` | Sidebar "Touren & Termine"; Bottom-Nav | Heutige Termine als Route, Navigation, Reihenfolge | **teilweise** | Liste/Check-in/Navigation echt; "Route optimieren"-Button nutzt `haversineDistance` nicht — reines Logging |
| `/employee/kalender` | Sidebar "Touren & Termine" | Kalenderansicht zugewiesener Termine + Abwesenheiten | live | — |
| `/employee/pferde` | Sidebar "Verwaltung" | Pferde, mit denen der Mitarbeiter zu tun hatte | live | — |
| `/employee/pferd/:id` | von `/employee/pferde` | Detailansicht: Termine, Huf-Fotos, Dokumente | live | — |
| `/employee/hufcam` | Sidebar "Dokumentation"; Bottom-Nav | Huf-Fotodokumentation | live | — |
| `/employee/chat` | Sidebar "Kommunikation" | 1:1-Chat mit Arbeitgeber + Team-Chat | live | — |
| `/employee/notizbuch` | Sidebar "Verwaltung"; Bottom-Nav | Persönliches Notizbuch, Text + Bilder | **teilweise** | Funktional, aber nur `localStorage` — kein Supabase-Sync, Datenverlust bei Gerätewechsel möglich |
| `/employee/material` | Sidebar "Verwaltung" | Materialverbrauch erfassen, Nachbestellungen anfragen | live | — |
| `/employee/timer` | Sidebar "Zeit & Tracking"; Bottom-Nav | Arbeitszeiten EU-konform inkl. Pausen | live | — |
| `/employee/analyse` | Sidebar "Dokumentation" | LTZ-Bearbeitungsbögen, Historie | live | — |
| `/employee/abwesenheiten` | Sidebar "Verwaltung" | Urlaub/Krankheit/Sonstiges beantragen/verwalten | live | — |
| `/employee/vertrag` | Sidebar "Verwaltung" | Vertragsdaten, PDF-Download, AVV-Unterschrift | live | — |
| `/employee/profil` | Sidebar "Konto"; Bottom-Nav | Persönliche Daten, Avatar, Land, Account-Löschung | live | — |
| `/employee/management` (+3 Unterseiten) | Sidebar "Konto" | Hub zu Profil/Einstellungen/Botschafter | live | — |
| `/employee/support` | Sidebar "Konto" | Chat/FAQ/E-Mail/Video | live | — |
| `/employee-invite` | öffentlich, per Einladungs-E-Mail | Passwort setzen, Konto aktivieren | live | — |

### 3.6 Vet (Tierarzt, eigene Subdomain `/vet/*`)

Kein `ProtectedRoute allowedRoles` im klassischen Sinn — Zugriff über
eigene Subdomain-Erkennung (`detectPortalMode`, `mode === 'veterinary'`)
und eigenes Login `VetPortalLogin`, nicht über den normalen
`app_role`-Mechanismus der anderen Rollen. Betrifft Tierärzte, die über
das eigenständige Tierarzt-Portal-Produkt laufen (zu unterscheiden von
Tierärzten, die stattdessen als `partner` im normalen Praxis-Modell
laufen — siehe `HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md` Abschnitt
2.1). Keine eigene persistente Sidebar-Navigation im gelesenen Code
gefunden (jede Vet-Route wird direkt angesteuert); nicht im Code
nachgewiesen, ob eine Navigationsleiste existiert, die alle 6 Punkte
verbindet.

| Route | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|
| `/vet/dashboard` | Pferde-Patienten, Impfungen, PMS-Sync-Übersicht | live | — |
| `/vet/soap` | Strukturierter tierärztlicher Untersuchungsbefund | live | — |
| `/vet/pms-connect` | Praxisverwaltungssoftware verbinden | **teilweise** | Verbindung wird real angelegt, OAuth-Sync selbst laut UI "kommt in Kürze" |
| `/vet/csv-import` | Befunde per CSV importieren | live | — |
| `/vet/got-rechner` | GOT-Positionen berechnen | live | — |
| `/vet/impfungen` | Impfstatus aller Patienten | live | — |
| `/tierarzt-finder` | Tierärzte/Kliniken in der Nähe finden (öffentlich, nicht subdomain-gebunden) | live | — |

### 3.7 Portal (Versicherung/Hersteller/Tierarztklinik/Lieferant/Schule/Verband) — `PortalAppLayout`

Zugriff über `/portal/:slug/*` auf der Insurance/Portal-Subdomain,
gesteuert über `detectPortalMode` + `PortalLogin`, nicht über den
normalen Rollen-Mechanismus. **Das gesamte Portal-Produkt hängt hinter
dem Feature-Flag `portalWhiteLabel` (aktuell `enabled: false`)** und ist
laut `featureFlags.ts`-Kommentar "nur über feste Demo-E-Mail erreichbar".
Navigation: `PortalSidebar.tsx` mit je nach Organisationstyp
unterschiedlicher Menüzusammenstellung (Versicherung: Policen/
Schadensfälle; Hersteller/Lieferant: Produkte/Bestellungen; Schule:
Kurse/Schüler/Prüfungen; Verband: Standards/Mitglieder/Statistiken;
Tierarztklinik: Patienten/Befunde/Impfungen), plus gemeinsamer Kern
(Dashboard, Kalender, Team, HM Connect, Import Center, Management,
Einstellungen).

| Route | Zweck | Reife | reifeNotiz (gekürzt) |
|---|---|---|---|
| `/portal/:slug` (Login) | Anmeldung, Weiterleitung zum Org-Dashboard | live | — |
| `/portal/:slug` (Dashboard) | Startseite der Organisation | **teilweise** | Mitgliederzahl + Widgets live, Aktivitäten-Feed "erscheinen bald" |
| `/portal/:slug/kalender` | Terminübersicht aus echten Appointment-Daten | **teilweise** | Ansicht live, "Neuer Termin"-Button ohne `onClick` |
| `/portal/:slug/management` | Navigationszentrale Profil/Org/Botschafter | live | — |
| `/portal/:slug/settings` | Branding, Team, Plan | **teilweise** | Branding live, "Team einladen"-Button ohne `onClick` |
| `/portal/:slug/analytics` | Kennzahlen/Trends | **teilweise** | Nur Mitgliederzahl live, Rest "–" bzw. Platzhalterbox |
| `/portal/:slug/team` | Team-Mitglieder anzeigen | live | — |
| `/portal/:slug/connect` | HM Connect im Portal-Kontext | live | — |
| `/portal/:slug/import` | Datenimport im Portal-Kontext | live | — |
| `/portal/:slug/policen` | Versicherungspolicen verwalten | **teilweise** | Hartcodiertes `DEMO_POLICEN`, kein Supabase |
| `/portal/:slug/claims` | Schadensfälle | **teilweise** | Hartcodiertes `DEMO_CLAIMS`, kein Supabase |
| `/portal/:slug/produkte` | Produktkatalog (Hersteller) | **teilweise** | Hartcodiertes `DEMO_PRODUKTE`, kein Supabase |
| `/portal/:slug/orders` | Bestellungen (Lieferant) | **teilweise** | Hartcodiertes `DEMO_ORDERS`, kein Supabase |
| `/portal/:slug/schulungen` | Schulungsangebote | **teilweise** | Hartcodiertes `DEMO_SCHULUNGEN`, kein Supabase |
| `/portal/:slug/kurse` | Ausbildungskurse | **teilweise** | Hartcodiertes `DEMO_KURSE`, kein Supabase |
| `/portal/:slug/schueler` | Schüler-Verwaltung | **teilweise** | Hartcodiertes `DEMO_SCHUELER`, kein Supabase |
| `/portal/:slug/pruefungen` | Prüfungen | **teilweise** | Hartcodiertes `DEMO_PRUEFUNGEN`, kein Supabase |
| `/portal/:slug/standards` | Verbands-Standards/Leitfäden | **teilweise** | Hartcodiertes `DEMO_STANDARDS`, kein Supabase |
| `/portal/:slug/mitglieder` | Verbandsmitglieder | **teilweise** | Liste/Suche live, "Einladen"-Button ohne `onClick` |
| `/portal/:slug/statistiken` | Verbands-Statistiken | **teilweise** | Nur Mitgliederzahl live, Rest hartcodiert |
| `/portal/:slug/patienten` | Tierarzt-Patienten (Klinik-Portal) | **teilweise** | Hartcodiertes `DEMO_PATIENTEN`, kein Supabase |
| `/portal/:slug/befunde` | Tierärztliche Befunde (Portal) | **teilweise** | Hartcodiertes `DEMO_BEFUNDE`, kein Supabase |
| `/portal/:slug/impfungen` | Impfstatus Klinik-Patienten | **teilweise** | Hartcodiertes `DEMO_IMPFUNGEN`, kein Supabase |
| `/portal/:slug/horse/:id` | Vollständiges Pferdeprofil im Portal-Kontext | live | — |
| `/portal/:slug/*` | Fallback-Platzhalter für nicht aktivierte Module | **attrappe** | Bewusster Fallback, kein Bug |

**Fazit Portal:** Vom gesamten Portal-Produkt (25 appMap-Einträge) ist
nur der organisatorische Kern (Login, Dashboard-Gerüst, Kalender-Ansicht,
Management, Team, Connect, Import, ein echtes Pferdeprofil) mit echten
Daten verdrahtet. Alle 14 branchenspezifischen Fachmodule
(Policen/Claims/Produkte/Orders/Schulungen/Kurse/Schüler/Prüfungen/
Standards/Mitglieder-Detail/Statistiken/Patienten/Befunde/Impfungen)
laufen auf hartcodierten Demo-Arrays. Das ist konsistent mit dem
Feature-Flag-Status (`portalWhiteLabel: false`) — kein unbeabsichtigter
Bug, sondern ein bewusst pausiertes, großes Zukunftsprodukt.

### 3.8 Admin (separat, hier nur der Vollständigkeit halber kurz erfasst)

Berechtigung: `ProtectedRoute allowedRoles={["admin"]}` (außer
`/admin/smoke-test`: `["provider","admin"]`). 12 appMap-Einträge, alle
`live` bis auf `/admin/verarbeitungsverzeichnis` (**teilweise** —
DSGVO-Verarbeitungsverzeichnis liegt nur in `localStorage`, nicht in
Supabase). Das Admin-Bereich-Detail ist bereits vollständig in
`docs/mission-control-inventory.md` dokumentiert (37+ Komponenten,
Stand 02.03.2026) — dieser Bericht wiederholt das nicht, da Admin kein
Ziel des Workspace-Umbaus ist (eigenes Cockpit, eigene Zielgruppe). Ich
habe das Dokument gegen `App.tsx` geprüft: die dort gelisteten Routen
(`/admin/mission-control` etc.) stimmen mit den tatsächlichen Routen
überein.

---

## 4. Öffentliche/sonstige Routen (kein Rollen-Layout)

23 appMap-Einträge sind öffentlich zugänglich und gehören zu keinem der
sechs Rollen-Layouts: Landingpages (`/`, `/website`, `/bhs`, `/p/:slug`),
Rechtliches (`/impressum`, `/datenschutz`, `/agb`, `/widerruf` —
`/datenschutz` ist laut `reifeNotiz` **teilweise**: Text stammt aus einem
eRecht24-Generator mit laut Code-Kommentar abgelaufener Lizenz, TODO im
Quelltext fordert rechtliche Neufassung), Einladungs-/Notfall-Links
(`/notfall/:eqid/:token`, `/connect/:slug`, `/preview/:token`,
`/widget/:slug/:type`), Botschafter-Öffentlich (`/botschafter/login`,
`/botschafter/warten`, `/ref/:code`), sowie zwei isolierte, bewusst nicht
verlinkte Entwicklungsrouten: `/hufi-lab` (Premium-Design-Prototyp) und
das öffentliche Partnerprofil `/partner/:prid` (**teilweise** — Kontakt-
formular sendet nichts wirklich ab). Diese Gruppe ist für die
Workspace-Frage nicht relevant, wird hier nur der Vollständigkeit halber
genannt.

---

## 5. Eigene Code-Funde jenseits appMap: kaputte Navigationslinks

appMap dokumentiert *Seiten* und ihre *eigenen* Bugs (z.B. ein Button
ohne `onClick`). appMap dokumentiert nicht systematisch, ob *andere*
Dateien (Sidebar, Menüs) auf eine Route verlinken, die es gar nicht gibt.
Das habe ich zusätzlich per `grep` gegen `App.tsx` geprüft:

**Provider-Sidebar (`AppSidebar.tsx`, „Erweiterungen“-Block, Z. 231–239):**
3 von 7 Einträgen verlinken auf nicht in `App.tsx` registrierte Routen:
`/hufi-connect`, `/email-marketing`, `/abo-matrix` (letzteres nur für 2
Stealth-E-Mail-Adressen sichtbar, aber auch für die kaputt).

**Partner-Sidebar (`PartnerAppLayout.tsx`, Z. 88–103):** 10 von rund 25
Einträgen verlinken auf nicht in `App.tsx` registrierte Routen:
`/partner-ausgaben`, `/partner-fuhrpark`, `/partner-buchhaltung`,
`/partner-guv`, `/partner-analyse`, `/partner-office`, `/partner-lager`,
`/hm-connect`, `/partner-autoflow`, `/partner-import`. Das betrifft
praktisch die kompletten Sidebar-Abschnitte "5 Analyse" (Ausgaben,
Fuhrpark, Buchhaltung, GuV, Betriebszahlen — alle 5 kaputt außer
Rechnungen) und "Erweiterungen" (Office, Lager, HM Connect, AutoFlow —
alle 4 kaputt außer Import, das ebenfalls kaputt ist).

**Einordnung:** Diese Links existierten schon vor diesem Auftrag und
haben nichts mit dem Workspace-Prototyp zu tun — sie sind ein
bestehender Qualitätsmangel in der *heutigen* Partner- und
Provider-Sidebar. Ich nenne sie hier, weil sie für Abschnitt 6 (Partner
hat für dieselben Funktionen wie Provider *keine* eigenen, funktionieren-
den Routen für Ausgaben/Fuhrpark/Buchhaltung/GuV/Lager/Office) und für
die Migrationsplanung relevant sind: Ein Workspace-Umbau darf diese
kaputten Links nicht unverändert in neue Kacheln übernehmen.

---

## 6. Überschneidungen und doppelte Funktionen

Das dominante Muster: **dieselbe fachliche Funktion existiert 2–5 mal,
einmal pro Rollen-Layout, unabhängig implementiert**, mit
unterschiedlichem Reifegrad und unterschiedlichen Bugs je Kopie.

| Funktion | Provider | Partner | Employee | Client | Portal | Anzahl Implementierungen |
|---|---|---|---|---|---|---|
| Kalender/Termine | `/kalender` (live) | `/partner-calendar` (live) | `/employee/kalender` (live) | `/client-kalender` (live) | `/portal/:slug/kalender` (teilweise, "Neuer Termin" kaputt) | **5** |
| Pferde-Liste + Detail | `/pferde`+`/pferd/:id` (live) | `/partner-pferde`+`/partner-pferd/:id` (live, Kartenklick kaputt) | `/employee/pferde`+`/pferd/:id` (live) | `/client-horses`+`/client-horse/:id` (live) | `/portal/:slug/horse/:id` (live, nur Detail) | **5** (4 volle Listen + 1 Detail) |
| Kunden/Kontakte | `/kunden` (live) | `/partner-kunden` (live) | — (nutzt Provider-Kunden) | `/client-network` als Pendant (teilweise) | — | **2** echte Kundenverwaltungen + 1 lose verwandtes Netzwerk-Modul |
| Rechnungen | `/rechnungen` (live) | `/partner-invoices` (live) | — | `/client-invoices` (live, Konsumentensicht) | — | **3**, davon 2 mit eigener DACH-Steuerlogik separat gepflegt |
| Chat | `/chat` (live) | `/partner-chat` (live) | `/employee/chat` (live) | `/client-chat` (live) | — | **4** |
| Management/Einstellungs-Hub | `/management` + 10 Unterseiten (live bis auf 1 teilweise) | `/partner-management` + 4 Unterseiten (teilweise, mehrere kaputte Kacheln) | `/employee/management` + 3 Unterseiten (live) | (kein eigener Hub, Einzelseiten unter "Konto") | `/portal/:slug/management` (live) | **4** parallele Hubs |
| Abo/Zahlung | `/management/abo` **und** `/settings/abo` (beide live, doppelt für dieselbe Rolle) | `/partner-management/abo` (teilweise, laut appMap kein echtes Plan-Management) | — | `/client-bhs-abo` (anderes Konzept: Produkt-Abo, nicht App-Plan) | `/portal/:slug/settings` (Plan-Tab, teilweise) | **4+1 Dopplung** |
| Hilfe & Support | `/support` (teilweise, DOM-Hack) | `/partner-support` (live) | `/employee/support` (live) | `/client-support` (teilweise, 2 kaputte Links) | — | **4**, Qualität uneinheitlich |
| Botschafter/Empfehlung | `/management/botschafter` → **Redirect ins Leere** | `/partner-management/botschafter` → **nicht registriert** | `/employee/management/botschafter` (live) | `/client/botschafter` (Sidebar-Eintrag, Route nicht verifiziert) | `/portal/:slug/management` (verlinkt Botschafter) | **1 funktionierend von 4 versuchten** |

**Bewertung:** Das ist kein reines "Naming"-Problem, sondern echte
Code-Duplikation: fünf Kalender-Implementierungen bedeuten fünf Stellen,
an denen z.B. ein Bugfix oder ein neues Feature (wie GPS-Tracking, das
heute nur in `/tour` für Provider existiert) einzeln nachgezogen werden
muss. Für die Workspace-Frage heißt das konkret: **eine gemeinsame
Workspace-Kachel-Komponente pro Konzept (z.B. "Termine") kann nicht
einfach eine bestehende Seite pro Rolle einbinden — sie träfe auf 5
unterschiedlich reife, unterschiedlich verlinkte Implementierungen.**

---

## 7. Verwaiste und schwer erreichbare Bereiche

Zwei klar zu unterscheidende Kategorien:

### 7.1 Vollständig toter Code (75 appMap-Einträge, `route: null`)

Diese Dateien existieren, werden aber von **keiner** Route in `App.tsx`
referenziert — auch nicht "versteckt" erreichbar. Alle sind bewusst
hinter Feature-Flags pausiert (siehe `src/config/featureFlags.ts`), kein
versehentlicher Verlust:

- **Botschafter-Dashboard-Suite (14 Dateien)**, Flag
  `botschafterDashboard: false`: `BotschafterConversions`,
  `BotschafterDashboard`, `BotschafterHufmanager`, `BotschafterInsights`,
  `BotschafterLinks`, `BotschafterNachrichten`, `BotschafterProfil`,
  `BotschafterRangliste`, `BotschafterSponsoring`,
  `BotschafterUmsaetze`, `BotschafterWerbemittelPage`,
  `WerbemittelEditor`, `PferdeakteBotschafter` sowie die zugehörige
  `BotschafterLayout`. Nicht zu verwechseln mit den *live* öffentlichen
  Routen `/botschafter/login`, `/botschafter/warten`, `/ref/:code` —
  jene funktionieren, das eigentliche Dashboard dahinter nicht.
- **Stallbetreiber-Rolle (16 Dateien)**, Flag `stallbetreiberRolle:
  false`: 9 eigenständige `Stall*`-Seiten (`StallDashboard`,
  `StallCockpit`, `StallKalender`, `StallLager`, `StallLeistungen`,
  `StallAnfragen`, `StallAngebote`, `StallSettings`,
  `StallPlaceholder`) plus 7 client-seitige Pendants
  (`ClientStallBoard`, `ClientStallManagement`, `ClientStallOverview`,
  `ClientStallBoarders`, `ClientStallExperts`, `ClientStallStaff`,
  `ClientStallReports`, `ClientLocations` — die
  `ClientAppLayout`-Sidebar zeigt bereits Menüpunkte dafür, die aber ins
  Leere führen, siehe Abschnitt 3.3). appMap-Hinweis zu
  `dead-clientlocations`: es gibt bereits eine funktional äquivalente,
  echte Komponente (`ClientLocationsManager`) — hier wurde offenbar
  doppelt gebaut.
- **Partner-Management-Extras (4 Dateien)**, Flag
  `partnerManagementExtras: false`: Botschafter/Kommunikation/
  Öffentliches-Profil/Rechtliches für Partner-Management — genau die
  Kacheln, die in `/partner-management` und
  `/partner-management/business` bereits sichtbar sind, aber auf nicht
  registrierte Routen zeigen (Abschnitt 3.4).
- **6 Portal-Demo-Seiten** (`InsurancePortalDemo`,
  `ManufacturerPortalDemo`, `VetPortalDemo`, `SupplierPortalDemo`,
  `EducationPortalDemo`, `AssociationPortalDemo`) plus eine weitere,
  nicht einmal importierte `PortalDemo`-Komponente sowie
  `PortalGallery`/`PortalApplication`, die von Deep-Links aus anderen
  Portal-Seiten referenziert werden (`navigate('/portal/galerie')`,
  `navigate('/portal/bewerben')`), aber selbst nicht geroutet sind.
- **Rest-Cluster (~24 Dateien) ohne Feature-Flag-Zuordnung**, laut
  `reifeNotiz` größtenteils "Store-Fahrplan Schritt 2 (18.07.2026): tote
  Route entfernt/nie verlinkt": u.a. `Academy`, `AutoFlow`-Infoseite,
  `Blog`+`BlogPost`, `Changelog`, `Docs`, `Ecosystem`, `FAQ`
  (eigenständig), `Geld verdienen`, `Glossar`, `Hilfe & FAQ`
  (eigenständig, zu unterscheiden vom echten `/hilfe`), `Hufanalyse`
  (eigenständige Seite, `GlobalSearch.tsx` verweist noch darauf),
  `Hufi-FAQ` (mehrere Stellen verlinken auf `/hufi/faq`, existiert
  nicht), `Hufrente`, `Kalkulator`, `Landing-Editor`, `Meine Website`
  (eigenständig, zu unterscheiden von `/management/website`),
  `Netzwerk` (eigenständig), `Preisgruppen-Verwaltung`, `Services`
  (Route `/services` redirected stattdessen direkt), `Statistiken`
  (eigenständig), `Systemstatus`, `Vertrauen & Sicherheit` (von
  `FooterNew.tsx` verlinkt, Ziel existiert nicht), `Abo-Matrix`
  (Datei existiert, aber `/abo-matrix` selbst aus Abschnitt 5 ist auch
  kaputt — zwei unabhängige Belege für dieselbe fehlende Route).

### 7.2 Reale, aber schwer/gar nicht erreichbare *routete* Bereiche

Diese Seiten existieren, sind sogar in `App.tsx` registriert und
funktionieren technisch — es fehlt nur der sichtbare Weg dorthin:

- **`/notfall`** (Provider "1. Hilfe Kunden Center"): kein einziger
  sichtbarer Link im gesamten Provider-UI gefunden (nur ein
  Style-Check in `AppSidebar.tsx`, keine echte `NavLink`). Bemerkenswert,
  weil es sich um eine sicherheitsrelevante Notfallfunktion handelt —
  die Pendants für Client (`/client-notfall`) und Admin (`/admin/notfall`)
  sind dagegen klar verlinkt.
- **`/archiv`** ("Menü/Archiv" — rollenabhängiges Kachel-Menü als
  zentrale Navigation zu allen Bereichen): der einzige im Code gefundene
  Link liegt in `MobileHeader.tsx`, das selbst **nirgends importiert
  wird** — die Komponente, die auf `/archiv` verweist, ist selbst toter
  Code. `/archiv` ist damit faktisch nur per direkter URL-Eingabe
  erreichbar.
- **`/hufi-observation-lab`**: laut explizitem Code-Kommentar in
  `App.tsx` (Z. 153–158) *bewusst* nicht in die Hauptnavigation
  aufgenommen — kein Bug, sondern Zwischenstand eines laufenden
  Feature-Aufbaus (siehe `docs/hufi-observation-phase-1-contracts.md`).
  Aktuell nur über den Workspace-Prototyp ("Beobachtung"-Kachel)
  erreichbar.
- **`/hufi/memory`** ("Was Hufi über dich weiß", DSGVO-Transparenz): nur
  über einen Link aus `KiSettingsCard.tsx`/`Datenschutz.tsx` erreichbar,
  nicht aus Hamburger-Menü, Sidebar oder Management-Hub.
- **`/hufi-lab`**: laut Code-Kommentar "isolierter Premium-Design-
  Prototyp (nicht verlinkt, kein Ersatz fürs Cockpit)" — bewusst isoliert,
  kein Nutzer-Feature.
- **`/client-kalender`, `/client-historie`, `/client-dokumente`**: in
  `App.tsx` registriert und laut appMap `live`, aber in der gelesenen
  `ClientAppLayout.tsx`-Sidebar-Definition nicht gefunden (weder im
  Sidebar-Array noch in Bottom-Nav/Quick-Actions). Nicht abschließend im
  Code verifiziert, ob sie an anderer Stelle (z.B. innerhalb von
  `/client-home`) verlinkt sind — als möglicher Orphan markiert, nicht
  als sicher bestätigt.
- **`/hilfe`**: laut explizitem `App.tsx`-Kommentar (Z. 643) "war gebaut,
  aber nie geroutet — das Menü braucht sie", mittlerweile nachgerüstet
  und in `HufiMenu.tsx` verlinkt. Beispiel dafür, dass so ein
  Orphan-Zustand real vorkam und schon einmal behoben wurde.

---

## 8. Einstellungen vs. tägliche Arbeitsbereiche

Kriterium: Wird der Bereich **routinemäßig während der Arbeit** genutzt
(mehrmals täglich/wöchentlich, operativ) oder **einmalig/selten
konfiguriert** (Setup, Rechtliches, Kontoverwaltung)?

**Klar Einstellungen (gehören ins Hamburger-Menü / Management-Hub, nicht
in den Workspace):**
`/management/profil`, `/management/sicherheit`, `/management/abo`,
`/settings/abo`, `/management/guthaben`, `/management/rechtliches`,
`/management/steuer`, `/management/kommunikation` (Vorlagen-Setup, kein
Tages-Werkzeug), `/management/import` (einmaliger Vorgang bei
Umstieg/Einrichtung), `/client-account-type`, `/client-permissions`,
`/client-notifications`, `/partner-settings`, `/partner-profile`,
`/employee/vertrag`, `/employee/profil`, alle `*-management/*`-Wrapper.
Das entspricht exakt der bereits getroffenen, dokumentierten Entscheidung
in `HufiMenu.tsx` (30.07.2026: bewusst schlank — nur Profil,
Einstellungen, Guthaben, Abo, Hilfe, Rechtliches, Abmelden), die dieser
Bericht bestätigt statt in Frage stellt.

**Grenzfälle, wo appMap/Code selbst eine Doppelrolle zeigt:**
- `/management/website` — für Provider mit aktiver Landingpage
  potenziell regelmäßig gepflegt (neue Fotos, Angebote), für die meisten
  aber Setup-einmalig. appMap-`zweck` beschreibt es als
  Konfigurationsseite ("Landingpage-Einstellungen"), nicht als
  Tagesgeschäft.
- `/mein-angebot` (Leistungen/Preise) — wird laut `zweck` "verwaltet",
  nicht täglich abgearbeitet, aber ist gleichzeitig die Datengrundlage
  für jede Terminbuchung/Rechnung. appMap listet es unter Provider-Kern,
  nicht unter Management — ich übernehme das, stufe es aber unten
  bewusst als *adaptiv*, nicht als *Kern*-Arbeitsfläche ein (Begründung
  Abschnitt 9).

**Klar tägliche Arbeitsbereiche (Workspace-Kachel-Kandidaten):**
`/kalender`/`/tour`, `/kunden`, `/pferde`+`/pferd/:id`, `/anfragen`,
`/chat`, `/rechnungen`, `/ausgaben`, `/mein-office`, `/aufnahme`,
`/auffassen/feedback`, `/hufi-observation-lab`, sowie die jeweiligen
Pendants der anderen Rollen aus Abschnitt 6.

**Operativ, aber nicht bei jeder Rolle/jedem Betriebsmodell relevant
(adaptiv):**
`/fuhrpark` (nur mobile Berufe mit Fahrzeug), `/team` (nur Betriebe mit
Mitarbeitern), `/lager` (nur materialintensive Berufe, für Partner nicht
mal als Route vorhanden), `/work-mode`-Unterwerkzeuge (HufCam/Hufanalyse
sind berufsspezifisch, nicht bei Physiotherapeuten relevant).

---

## 9. Kritische Prüfung der 10-Modul-Hypothese und Empfehlung

### 9.1 Die vorgegebene Hypothese

Heute · Termine · Kunden & Pferde · Dienstleistungen · Aufträge &
Dokumentation · Rechnungen & Finanzen · Produkte & Shop · Betrieb &
Ressourcen · Digitales Business · Team & Kommunikation.

### 9.2 Prüfung gegen echte appMap-Daten und Nav-Struktur

| Hypothese-Modul | Deckung durch reale, `live`/`teilweise`-Routen | Einschätzung |
|---|---|---|
| Heute | **Keine** — es gibt keine appMap-Route, die eine Tagesübersicht *als eigene Seite* liefert. `/home` ist der Hufi-Assistent selbst (Konversation), nicht eine strukturierte Zusammenfassung. `HUFI_CORE_TARGET_ARCHITECTURE.md` Abschnitt 8 beschreibt "Hufi Today" explizit als **noch zu bauendes** Zielbild, nicht als Bestand. | Höchster Neubau-Aufwand aller vorgeschlagenen Kacheln — kein bestehender Code wiederverwendbar. |
| Termine | `/kalender`, `/tour` (Provider); analoge Routen bei allen 4 anderen Rollen | Stark belegt, klarer Kern-Kandidat. |
| Kunden & Pferde | `/kunden`, `/pferde`, `/pferd/:id`, `/aufnahme` | Stark belegt, klarer Kern-Kandidat. |
| Dienstleistungen | Nur `/mein-angebot` (Provider) / `/partner-services` (Partner) — ein einzelner appMap-Eintrag pro Rolle | Dünn belegt als *eigenständige* Kachel; siehe 9.3. |
| Aufträge & Dokumentation | `/anfragen` (Aufträge/Leads) + `/mein-office`, `/archiv`, `/auffassen`, `/hufi-observation-lab` (Dokumentation) — zwei fachlich sehr unterschiedliche Themen unter einem Titel | Belegt, aber die Bündelung "Aufträge" (Sales-Funnel-artig) + "Dokumentation" (Ablage/Notizen) ist inhaltlich nicht naheliegend — die Sidebar selbst bündelt "Anfragen" stattdessen bereits mit "Chat" (siehe unten). |
| Rechnungen & Finanzen | `/rechnungen`, `/ausgaben`, `/buchhaltung`, `/guv`, `/business`, `/analyse`, `/analyse/betriebszahlen`, `/bhs-balance` | Sehr stark belegt (8 appMap-Einträge), klarer Kern-Kandidat, deckt sich mit dem bestehenden `/business`-Hub. |
| Produkte & Shop | Nur `/lager` (Provider, reine Materialverwaltung, kein Verkaufskanal); bei Partner **existiert keine Route** dafür überhaupt (der Sidebar-Link `/partner-lager` ist einer der 10 kaputten Links aus Abschnitt 5). Echte Shop-/Produktkataloge existieren nur im Portal-Bereich (`/portal/:slug/produkte`, `/orders`) — und dort nur als Demo-Daten. | Schwach belegt für die beiden Kernrollen; "Shop" suggeriert mehr als das, was der Code heute anbietet. |
| Betrieb & Ressourcen | `/fuhrpark`, `/team`, teilweise `/lager`, `/work-mode` | Belegt, aber stark berufsabhängig (Fuhrpark für mobile Berufe, Team nur bei Mitarbeitern) — passt eher als *adaptiv* denn als *Kern* zu jeder Rolle. |
| Digitales Business | `/management/website`, `/management/import` | appMap stuft beide bereits als Management/Einstellungen ein (`zweck`: "Einstellungen", "Konfiguration"), nicht als Tagesgeschäft — passt eher zu Abschnitt 8 "Einstellungen" als zu einer Workspace-Kachel. |
| Team & Kommunikation | `/team` (selten, Verwaltung) + `/chat` (täglich, hochfrequent) | Fachlich zwei sehr unterschiedliche Nutzungsfrequenzen unter einem Titel; die bestehende Sidebar bündelt Chat stattdessen mit Anfragen ("1 Anfragen": Inbox + Warteliste), nicht mit Team. |

### 9.3 Empfehlung (Hypothese, keine Entscheidung)

Basierend auf obiger Prüfung empfehle ich, **von der vorgegebenen
10er-Liste an zwei Stellen abzuweichen**: "Produkte & Shop" und
"Digitales Business" sind für die beiden tragenden Rollen (Provider,
Partner) heute zu dünn mit echten, täglich genutzten Funktionen
unterlegt, um eine eigene permanente Kern-Kachel zu rechtfertigen.
Stattdessen bündle ich "Anfragen" mit "Chat" zu einer
Kommunikations-Kachel — das folgt genau dem Muster, das die bestehende
`AppSidebar.tsx` bereits selbst verwendet ("1 Anfragen" = Inbox + Warte-
liste in einem Menüpunkt), ist also keine neue Idee, sondern eine
Bestätigung eines bereits im Code etablierten Musters.

**6 universelle Kernmodule** (jede Rolle mit Kundenkontakt braucht sie,
stark appMap-belegt):

1. **Heute** — Tagesübersicht (neu zu bauen, siehe 9.4)
2. **Termine** — Kalender + Tour
3. **Kunden & Pferde** (bzw. rollenabhängig benannt: "Kunden &
   Patienten", "Klienten & Tiere") — inkl. Aufnahme
4. **Anfragen & Nachrichten** — Leads/Inbox + Chat zusammengeführt
5. **Rechnungen & Finanzen** — Rechnungen, Ausgaben, GuV, Buchhaltung
   (nutzt idealerweise den bereits bestehenden `/business`-Hub statt neu
   zu bauen)
6. **Dokumentation** — Mein Office, Archiv, Auffassen/Feedback,
   perspektivisch Beobachtung (`/hufi-observation-lab`)

**2–4 adaptive Module** (nur sichtbar, wenn Berufsprofil/Betriebsmodell/
Feature-Flag es hergeben — Mechanismus dafür existiert bereits:
`professionHasFeature()` in `AppSidebar.tsx`, siehe auch
`HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md`):

A. **Betrieb & Ressourcen** — Fuhrpark, Team, Lager, Work-Mode-Werkzeuge
   (nur für mobile/materialintensive/Team-Betriebe)
B. **Dienstleistungen & Preise** — Mein Angebot (adaptiv statt Kern, weil
   Konfigurations-lastig, aber je nach Preismodell unterschiedlich
   oft genutzt)
C. *(optional, niedrige Priorität)* **Digitales Business** — Website/
   Marketing, nur für Provider mit aktiver Landingpage
D. *(optional, nur bei Bedarf)* **Team & Personal** — separat von
   Kommunikation, nur für Betriebe mit Mitarbeitern

### 9.4 Wichtigster Vorbehalt zur Empfehlung

Die "Heute"-Kachel ist die einzige der zehn (6+4) vorgeschlagenen
Kacheln, die **nicht auf eine bestehende Seite gemappt werden kann** —
sie müsste inhaltlich neu gebaut werden (Aggregation aus Terminen,
Anfragen, Nachrichten, Risiko-Markern — das Konzept aus
`HUFI_CORE_TARGET_ARCHITECTURE.md` Abschnitt 8 "Hufi Today"-Mockup ist
bisher nur eine Skizze, kein Code). Das ist der mit Abstand aufwändigste
und risikoreichste Teil jeder Umsetzung dieser Empfehlung.

---

## 10. Route-Mapping für die Empfehlung (Provider, da Prototyp heute
     provider-only ist — andere Rollen analog, siehe Abschnitt 12)

| Kachel | Route(n), die hineinfallen würden | Reifegrad-Warnung |
|---|---|---|
| Heute | *keine bestehende Route — Neubau* | — |
| Termine | `/kalender`, `/tour` | beide `live` |
| Kunden & Pferde | `/kunden`, `/pferde`, `/pferd/:id`, `/aufnahme` | alle `live` |
| Anfragen & Nachrichten | `/anfragen`, `/chat` | beide `live` |
| Rechnungen & Finanzen | `/rechnungen`, `/ausgaben`, `/guv`, `/buchhaltung`, `/business`, `/analyse`, `/analyse/betriebszahlen` | `/buchhaltung` und `/analyse/betriebszahlen` sind **teilweise** — Kachel müsste das im UI ehrlich kennzeichnen, kein "fertig" suggerieren |
| Dokumentation | `/mein-office`, `/mein-office/:id`, `/archiv`, `/auffassen`, `/auffassen/feedback`, `/hufi-observation-lab` | `/archiv` ist aktuell verwaist (Abschnitt 7.2) — müsste beim Einbau in den Workspace ohnehin neu verlinkt werden |
| *Adaptiv:* Betrieb & Ressourcen | `/fuhrpark`, `/team`, `/lager`, `/work-mode` | alle `live` |
| *Adaptiv:* Dienstleistungen & Preise | `/mein-angebot` | `live` |
| *Adaptiv (optional):* Digitales Business | `/management/website` | `live`, aber appMap stuft es als Konfiguration ein |

Zum Vergleich: Der **heutige Swipe-Workspace-Prototyp**
(`HufiSwipeWorkspace.tsx`) deckt aktuell nur 6 Einzelrouten ab (Termine,
Kunden, Pferde, Rechnungen, Beobachtung, Dokumente) — das sind Bruchteile
von "Kunden & Pferde" und "Rechnungen & Finanzen" aus der Empfehlung,
und "Anfragen & Nachrichten" fehlt komplett. Kamera und Synchronisierung
sind im Prototyp als "planned" sichtbar, aber ohne Route bewusst
deaktiviert.

---

## 11. Explizite Zuordnung

**Bleibt im Hamburger-Menü** (unverändert zur bestehenden Entscheidung
30.07.2026, durch diese Analyse bestätigt): Profil, Einstellungen
(→ Management-Hub), Voice-Guthaben, Abo, Hilfe & FAQ, Rechtliches,
Impressum, Datenschutz, Abmelden.

**Wird Workspace-Kachel** (Kern, gemäß Empfehlung 9.3): Heute, Termine,
Kunden & Pferde, Anfragen & Nachrichten, Rechnungen & Finanzen,
Dokumentation.

**Wird adaptive Workspace-Kachel** (nur bei passendem
Berufsprofil/Betriebsmodell sichtbar): Betrieb & Ressourcen,
Dienstleistungen & Preise, optional Digitales Business, optional Team &
Personal.

**Wird Unterbereich einer Kachel** (heute eigenständige Seite, in der
Empfehlung Tab/Abschnitt innerhalb einer größeren Kachel):
`/ausgaben`, `/guv`, `/analyse`, `/analyse/betriebszahlen` → Unterbereiche
von "Rechnungen & Finanzen" (analog zum bereits bestehenden
`/business`-Hub-Muster); `/auffassen/feedback` → Unterbereich von
"Dokumentation"; `/work-mode`-Untertools (HufCam, Hufanalyse, Zeit,
km-Tracker) → Unterbereiche von "Betrieb & Ressourcen".

**Sollte zusammengelegt werden** (unabhängig vom Workspace-Umbau, reine
Aufräum-Kandidaten):
- `/management/abo` und `/settings/abo` — zwei Routen für exakt dasselbe
  Thema innerhalb derselben Rolle.
- Die vier parallelen Support-Hubs (`/support`, `/partner-support`,
  `/employee/support`, `/client-support`) — fachlich identisch, aber mit
  4 unabhängigen Implementierungen unterschiedlicher Qualität; einer
  ist per DOM-Hack fragil, einer hat zwei kaputte Links.
- Die vier parallelen Management-Hubs — technisch schwer zusammenlegbar
  wegen unterschiedlicher Datenmodelle je Rolle, aber zumindest die
  **Struktur** (welche Kacheln, welche Reihenfolge) könnte
  vereinheitlicht werden, damit nicht jede Rolle ihre eigene, leicht
  abweichende Version pflegt.
- Botschafter-Einstieg: aktuell 4 unabhängige Versuche
  (`/management/botschafter` toter Redirect, `/partner-management/
  botschafter` unregistriert, `/employee/management/botschafter`
  funktioniert, `/client/botschafter` nicht verifiziert) für dasselbe
  Programm — sollte auf eine gemeinsame, rollenparametrisierte Seite
  konsolidiert werden, sobald das Programm reaktiviert wird.

---

## 12. Migrationsplan, Risiken, offene Entscheidungen für Pascal

**Wichtig vorweg:** Dies ist ein Vorschlag für die *Reihenfolge*, falls
Pascal sich für die Empfehlung aus Abschnitt 9 entscheidet — keine
Aufforderung, jetzt loszulegen.

### 12.1 Vorgeschlagene Schritte

1. **Nur Provider zuerst.** Der Swipe-Workspace-Prototyp ist heute schon
   provider-only fest verdrahtet (`TILES`-Array in
   `HufiSwipeWorkspace.tsx` nutzt ausschließlich Provider-Routen). Die
   anderen 4 Rollen haben eigene, unabhängige Layouts — ein
   rollenübergreifender Workspace würde entweder 5 separate
   Tile-Konfigurationen brauchen oder eine gemeinsame Abstraktionsebene,
   die es heute nicht gibt.
2. Vor dem Ausbau der Kacheln: die in Abschnitt 5 gefundenen kaputten
   Sidebar-Links (Provider: 3, Partner: 10) bereinigen oder bewusst
   nicht in neue Kacheln übernehmen — sonst wandert der Fehler nur in
   die neue Oberfläche statt behoben zu werden.
3. "Termine", "Kunden & Pferde" als erste echte Kacheln bauen — höchste
   appMap-Reife, geringstes Risiko, kein Neubau nötig (reine Links auf
   bestehende, funktionierende Seiten, wie im Prototyp heute schon für
   Kalender/Kunden/Pferde/Rechnungen gemacht).
4. "Rechnungen & Finanzen" als Sammel-Kachel bauen — kann den
   bestehenden `/business`-Hub wiederverwenden statt eine neue
   Kachel-in-Kachel-Struktur zu erfinden.
5. "Anfragen & Nachrichten" bauen — bisher nicht im Prototyp enthalten,
   aber laut appMap beides `live` und in der bestehenden Sidebar bereits
   als ein Menüpunkt gedacht (Vorlage vorhanden).
6. "Heute" zuletzt — höchster Aufwand, kein wiederverwendbarer Code,
   höchstes Scope-Creep-Risiko. Sollte erst angegangen werden, wenn die
   fünf anderen Kern-Kacheln stabil laufen.
7. Adaptive Kacheln (Betrieb & Ressourcen, Dienstleistungen) erst
   einblenden, wenn der Kern steht — Sichtbarkeitslogik kann das
   bestehende `professionHasFeature()`-Muster aus `AppSidebar.tsx`
   wiederverwenden statt neu zu erfinden.
8. **Alte Sidebar/BottomNav erst abschalten, wenn Feature-Parität
   nachgewiesen ist.** Nicht vorher — sonst entsteht genau das Muster,
   das schon zu den 75 appMap-`attrappe`-Einträgen geführt hat: Code
   bleibt, aber der Weg dorthin verschwindet.
9. Rollenausweitung (Partner/Employee/Client/Vet/Portal) erst nach
   stabilem Provider-Rollout und nur mit vorheriger Entscheidung, wie
   die in Abschnitt 6 dokumentierte Routen-Duplikation gehandhabt wird —
   sonst verfünffacht sich der Umsetzungsaufwand pro Kachel.

### 12.2 Risiken

- **Funktionsverlust durch zu frühen Umbau:** Der Prototyp deckt aktuell
  6 von ~30 Provider-Live-Bereichen ab. Ein Wechsel weg von Sidebar/
  BottomNav vor Vervollständigung würde bestehende Funktionen für
  Nutzer unsichtbar machen, obwohl sie im Code weiterhin existieren.
- **Aufwands-Vervielfachung durch Rollen-Duplikation:** Ohne vorherige
  Konsolidierung (Abschnitt 6) bedeutet "eine Kachel pro Konzept über
  alle Rollen" in Wirklichkeit 3–5 unabhängige Nacharbeiten pro Kachel.
- **Kaputte Links unverändert übernommen:** Falls die Partner-Sidebar-
  Links 1:1 in Partner-Workspace-Kacheln übertragen werden, erbt der
  Workspace 10 tote Links, bevor er überhaupt live geht.
- **"Heute"-Kachel als Aufwandsfalle:** Einzige Kachel ohne 1:1-Mapping
  auf Bestandscode — Risiko für Scope-Creep und Verzögerung der übrigen,
  einfacheren Kacheln, falls zuerst angegangen.
- **Parallele Großbaustellen nicht neu aufreißen:** Die bereits
  pausierten Bereiche (Portal-Whitelabel, Botschafter-Dashboard,
  Stallbetreiber-Rolle, Partner-Management-Extras, Client-Marketplace)
  sollten durch den Workspace-Umbau nicht implizit wieder aufgemacht
  werden — sie sind laut `featureFlags.ts`-Kommentar bewusst "bis
  fertig" verborgen, nicht abgesagt.

### 12.3 Offene Entscheidungen für Pascal

1. Workspace zuerst nur für die Provider-Rolle (Kernrolle, geringerer
   Aufwand) oder von Anfang an rollenübergreifend gedacht (höherer aber
   einmaliger Aufwand statt späterer 5-facher Nacharbeit)?
2. Soll "Mein Angebot" (Dienstleistungen/Preise) eine eigene adaptive
   Kachel sein, oder als Unterbereich in "Betrieb" oder "Rechnungen"
   aufgehen?
3. Sollen Fuhrpark/Team/Lager grundsätzlich für jeden Provider-Account
   sichtbar sein, oder wirklich nur bei passendem Berufsprofil/
   Betriebsmodell (Mehraufwand für die Sichtbarkeitslogik, aber weniger
   Überladung für z.B. Solo-Physiotherapeuten ohne Fahrzeugflotte)?
4. Was passiert mit `/notfall` (aktuell für Provider komplett
   unerreichbar, Abschnitt 7.2)? Bewusst als eigene Kachel/Kachel-
   Unterbereich aufnehmen, oder unabhängig vom Workspace-Projekt zuerst
   isoliert reparieren, weil es eine Sicherheitsfunktion ist?
5. Sollen die kaputten Sidebar-Links (Provider: 3, Partner: 10, Abschnitt
   5) vor dem Workspace-Umbau bereinigt werden — sie sind schon heute im
   Live-Betrieb kaputt, unabhängig vom Workspace-Projekt?
6. Bleibt die Botschafter-Suite (14 fertige, aber unverdrahtete Dateien)
   auf Eis, oder soll sie im Zuge der Navigations-Überarbeitung
   reaktiviert (und dann konsolidiert, siehe Abschnitt 11) oder endgültig
   entfernt werden? Blockiert den Workspace-Umbau nicht direkt, sollte
   aber nicht vergessen werden, da sie in mehreren Rollen halbfertige
   UI-Verweise hinterlässt (tote Redirects, unregistrierte Kacheln).
7. Gleiche Frage für die Stallbetreiber-Rolle (16 Dateien) — sie hat
   bereits sichtbare, aber komplett tote Menüpunkte in der
   Client-Sidebar, sobald ein Nutzer Account-Typ "Stall" oder "Gewerbe"
   wählt (Abschnitt 3.3). Das betrifft potenziell echte Nutzer heute,
   nicht nur zukünftige Planung.

---

## 13. Anhang: Zahlen zur Nachprüfbarkeit

- appMap gesamt: 247 Einträge — `live`: 134, `teilweise`: 36,
  `attrappe`: 77 (davon 75 ohne jede Route, 2 mit Route hinter
  Feature-Flag).
- appMap ohne Route (`dead-*`-IDs), nach Cluster: Botschafter-Suite 14,
  Stallbetreiber-Rolle 16 (9 eigenständig + 7 Client-Pendants — die
  16. Datei `ClientLocations` zählt zusätzlich), Partner-Management-
  Extras 4, Portal-Demos/Fallbacks 9, restliche unverlinkte
  Einzelseiten ca. 24, macht in Summe die 75 im Repo gefundenen Einträge
  ohne Route.
- Rollenverteilung der 247 appMap-Einträge (nach Routen-Präfix
  klassifiziert): Provider-Kern 30, Provider-Management 12, Client 22,
  Partner 21, Employee 20, Vet 7, Portal 25, Admin 12, öffentlich/
  sonstige 23, ohne Route 75. Summe 247.
- Eigene, nicht aus appMap stammende Funde: 3 kaputte Links in der
  Provider-Sidebar, 10 kaputte Links in der Partner-Sidebar (Abschnitt
  5) — diese Zahlen sind **zusätzlich** zu den appMap-247, nicht
  darin enthalten, da appMap Seiten, nicht Buttons/Links, katalogisiert.
