# HufiApp Market-Ready & Sale-Ready Master Audit

**Stand:** 07.08.2026
**Auftraggeber:** Pascal Schmid
**Durchgeführt von:** Claude Code (Chief Product Officer / Release Director / UX- & Security-Auditor, diese Session)
**Repository:** `/home/pascaladmin/hufiapp-dev`
**Methode:** Statische Code-/Datenbank-/Konfigurationsprüfung, read-only SQL gegen PROD (`vnschgjxkzzwzefqlrji`), lokale Testläufe (`npm test`, `tsc --noEmit`, `npm run build`, `git diff --check`). **Kein Live-Browser-Zugriff in dieser Session verfügbar** (Chrome-Erweiterung nicht verbunden) — alle rein visuellen Aussagen sind ausdrücklich als „nicht visuell verifiziert" gekennzeichnet, nicht als geprüft dargestellt.

---

## 1. Executive Summary

HufiApp ist ein **technisch weit entwickeltes, funktional breites Produkt** (over 700 Precache-Einträge, dutzende Rollen-Dashboards für Provider/Client/Partner/Employee/Admin, echte Kalender-, Rechnungs-, CopeCart-, Voice-, Offline- und Compliance-Infrastruktur) — kein Prototyp. Der Kernblocker für einen glaubwürdigen Marktstart ist **nicht fehlende Funktionalität**, sondern eine Kette **unvollständig ausgerollter, bereits behobener oder halb ausgerollter Fixes** plus **ungeklärter Marken-/Registrierungswahrheit**:

- Der produktive `hufiapp.de`-Build zeigt im Browsertab, PWA-Namen und Manifest weiterhin **„HufManager"** statt „Hufi" (Build-Flavor-Bug, `deploy.sh` setzt `VITE_APP_FLAVOR` nie).
- Es existiert **keine belastbare Registrierungsquelle** (`signup_app` bei 0 von 75 Profilen befüllt) — jede „Woher kommen unsere Kunden"-Aussage ist heute Spekulation.
- Ein bereits geschriebener CORS-/Correlation-ID-Fix für `anthropic-proxy` ist **lokal fertig, aber nicht deployt** (REL-001, aktuell einziger READY-Task).
- Drei reale AVV-Unterschriften existieren, werden aber im Admin-Dashboard **fälschlich als 0 von 21 angezeigt** (Tabellen-Mismatch).
- TD-05 (Cross-Tenant-Zählungsleck in `PortalWidgets.tsx`) ist real bestätigt und weiterhin offen.
- Biometrie-Server-Backup und echtes Error-Monitoring sind **nicht begonnen**.

Kein einziger dieser Punkte erfordert einen Architektur-Neubau. Alle sind eng begrenzte, bereits identifizierte Korrekturen. Das Produkt ist heute in einem Zustand, der **kontrollierten Pilotbetrieb (Stufe B)** erlaubt, aber noch **kein Market-Ready (Stufe C)**.

**Go/No-Go: siehe Abschnitt 12 — CONTROLLED PILOT.**

---

## 2. Tatsächlicher Systemstand

| | Wert |
|---|---|
| Repository | `hufiapp-dev`, Remote `git@github.com:passaondigital/hufmanager.git` |
| Branch | `feature/hufi-assistant-experience-preview` (kein `main`/`master` im Repo — Projektnorm, keine Abweichung) |
| HEAD | `b5bebded` (07.08., „test: separate edge contract node checks") |
| Lokal ahead of origin | 13 Commits (nicht gepusht) |
| Uncommittete Änderungen | `docs/HUFI-CODEX-HANDOFF.md`, `docs/HUFI-E2E-NEXT-STEPS.md` (modifiziert), `docs/HUFI-TEAM-STATUS-2026-08-04.md`, `docs/qa/` (neu) — Codex' laufende Arbeit, unangetastet |
| Live-Build `hufiapp.de` | `/var/www/hufiapps/v25`, zuletzt deployt 04.08.2026 — **älter als mehrere bereits committete Sicherheits-/Compliance-Fixes** (a30dc4ea, 68276881, b3785f15, 13075211, 870a2c1c sind alle NICHT im Live-Build) |
| Live-Build `app.hufmanager.de` | `/var/www/hufmanager/app`, zuletzt deployt 25.07.2026 — 12 Tage älter, kein Deploy-Skript dafür vorhanden |
| Supabase-Projekt | `vnschgjxkzzwzefqlrji`, identisch für beide Domains (im JS-Bundle verifiziert) |
| Build-Flavor | `vite.config.ts`: `VITE_APP_FLAVOR` wird von `deploy.sh` nie gesetzt → Default `"hufmanager"` — **betrifft den aktuellen Live-Build von hufiapp.de** |
| Testbefehle | `npm test` (Vitest), `npx tsc --noEmit`, `npm run build`, `git diff --check` — alle real ausgeführt in dieser Session |
| E2E/Playwright | **nicht vorhanden** im Repo |

**Live vs. Committed vs. Lokal — Kernaussage:** Mehrere sicherheits- und compliance-relevante Fixes dieser Auditserie (CORS-Härtung, Rechnungs-Autorisierung, CopeCart-Härtung) sind **committet, aber nicht live**. Jede Aussage „ist schon gefixt" muss in dieser Session als „ist im Repo, nicht im Produktivbetrieb" gelesen werden, bis ein isolierter Edge-Function-Deploy erfolgt (siehe Release Plan).

---

## 3. Marken- und Produktwahrheit — Funde

| Fund | Datei/Ort | Aktueller Zustand | Zielzustand | Verkaufsblocker |
|---|---|---|---|---|
| Browsertab-Titel PROD | `deploy.sh` → `vite.config.ts` `APP_FLAVOR`-Default | „HufManager — Software für Hufbearbeiter" auf `hufiapp.de` live verifiziert | „Hufi — Dein KI-Assistent für Pferdeprofis" | **Ja** |
| PWA-Manifest-Name | `manifest.webmanifest` im Live-Build | „HufManager" | „Hufi" | **Ja** |
| PWA-Icon-Set | Build-Flavor-Weiche in `vite.config.ts` | HufManager-Icon-Set (72–512px, dunkles Theme) statt Hufi-Icon-Set | Hufi-Icon-Set | **Ja** |
| `app.hufmanager.de` vs. `hufiapp.de` | Nginx, zwei getrennte Webroots | Identischer Code, unterschiedlich alter Build, beide zeigen aktuell dasselbe (falsche) HufManager-Branding | Trennung erst nach BUILD-001 sinnvoll beurteilbar | Nein (Ursache liegt in BUILD-001, nicht in dieser Trennung selbst) |
| Registrierungs-Benachrichtigung | `notify-new-registration/index.ts` | Body/Footer/Absender hartcodiert „HufManager" unabhängig von echter Quelle; nur Betreff nutzt korrektes `appLabel` | konsistent nach echter Quelle beschriftet (REG-002) | Nein (internes Tool, kein Kundenkontakt) — aber irreführend für Pascal |
| Migrations-UX (`HufManagerWelcome.tsx`) | `src/components/migration/` | **Positiver Fund**: sauber Hufi-gebrandete Willkommens-UI für Bestandsnutzer, keine Vermischung | unverändert lassen | Nein |
| README.md | Repo-Root | Lovable-Boilerplate ohne Projektbezug | kein Kaufkontext, rein internes Dokument | Nein |
| „Hufi App" vs. „HufiApp" vs. „Hey Hufi" | verstreut, 8/2/11 Dateitreffer | uneinheitliche Schreibweise im Code (nicht zwingend im UI sichtbar) | einheitlich nach Governance (`HUFI_ECOSYSTEM_BRAND_ARCHITECTURE.md` §8) | Nein (kosmetisch) |

**Kernfund:** Das größte Marken-Risiko ist nicht Restcode, sondern ein **einzeiliger Deploy-Konfigurationsfehler** (`VITE_APP_FLAVOR` fehlt in `deploy.sh`), der dazu führt, dass das aktuelle Hauptprodukt sich selbst als das Legacy-Produkt ausgibt.

---

## 4. Komplette Neukundenreise (34 Schritte)

Klassifikation je Schritt. „Nicht visuell verifiziert" bedeutet: Code-/Routen-/Datenbankexistenz bestätigt, aber kein Live-Rendering in dieser Session geprüft (keine Browserverbindung verfügbar).

| # | Schritt | Klassifikation | Beleg |
|---|---|---|---|
| 1 | Landingpage | teilweise, nicht visuell verifiziert | `src/pages/Index.tsx`, `ProviderLanding.tsx` real vorhanden, mehrere Landing-Varianten (`PferdeakteLanding`, `BhsLandingPage`) — Konsistenz zwischen ihnen nicht geprüft |
| 2 | Produktverständnis | nicht visuell verifiziert | abhängig von 1 |
| 3 | Preise/Tarifverständnis | funktioniert vermutlich | `/preise` leitet auf `/mein-angebot` um (Route bestätigt); Tarifnamen laut `mission-control-inventory.md` z.T. veraltet (advanced vs. duo/team) |
| 4 | Registrierung | **funktioniert verifiziert (technisch)**, Herkunft nicht nachweisbar | `useAuth.tsx` `signUp()` real, DB-Trigger `handle_new_user` per `pg_get_functiondef` live verifiziert korrekt |
| 5 | Registrierungs-E-Mail | funktioniert, **falsch beschriftet** | `notify-new-registration` real, aber HufManager-Body unabhängig von echter Quelle (siehe Abschnitt 3) |
| 6 | E-Mail-Bestätigung/Magic Link | nicht visuell verifiziert | `emailRedirectTo` in `useAuth.tsx` gesetzt, Zustellung nicht getestet (keine echte E-Mail in diesem Audit) |
| 7 | Erster Login | funktioniert vermutlich | `/auth` Route bestätigt, `Auth.tsx` real |
| 8–10 | Onboarding, Geschäftsprofil, Rollenauswahl | UI vorhanden, funktioniert vermutlich | `OnboardingWizard.tsx`, `ProviderSetupWizard.tsx`, `ProfessionSelector.tsx`, `CountrySelectionStep.tsx` real vorhanden — Ende-zu-Ende-Durchlauf nicht getestet |
| 11–12 | Startseite/Kachelmenü | nicht visuell verifiziert | `/home` Route bestätigt |
| 13 | Kunde anlegen | funktioniert vermutlich | `/kunden`, `Kunden.tsx` real, `admin_provider_payments`/`profiles`-Schreibpfad an anderer Stelle verifiziert |
| 14 | Pferd anlegen | funktioniert vermutlich | `/pferde`, `AddHorseModal.tsx` (78 kB eigener Chunk — substanzielle Komponente) |
| 15 | Kunde+Pferd verbinden | nicht geprüft | `access_grants`-Tabelle bekannt, UI-Fluss nicht im Detail geprüft |
| 16–18 | Termin/Kalender/Tagesplanung | UI vorhanden | `Kalender.tsx`, `DesktopBigCalendarView.tsx`, `WeekCalendarWidget.tsx`, `AppointmentFormModal.tsx` real, mehrere Kalender-Varianten je Rolle |
| 19–20 | Dokumentation/Fotos | UI vorhanden | `useOfflinePhotoUpload.tsx`, `horse-documents`/`horse-photos`-Buckets real (RLS in AVV-Audit bereits geprüft) |
| 21 | Huf-/Behandlungsakte | UI vorhanden | `Pferdeakte-*.js` eigener 144 kB Chunk — umfangreich |
| 22–24 | Rechnung erstellen/-nummer/PDF | **funktioniert verifiziert (technisch)** | `CreateInvoiceModal.tsx`, `invoicePdfGenerator-*.js` (41 kB), `invoices`-Tabelle live geprüft (9 Zeilen, 2 „paid") |
| 25 | Rechnung versenden | **fertig, nicht live** | `send-invoice-email` Autorisierungsfix (b3785f15/13075211) committet, PROD läuft noch auf Version 122 ohne diesen Fix |
| 26–27 | Zahlungs-/Tarifprozess, CopeCart | **verifiziert korrekt (Code+Tests), 0 reale Live-Transaktionen** | `copecart-webhook` gehärtet (870a2c1c), 3/3 Contract-Tests grün, `admin_revenue_log` real 0 Zeilen (konsistent mit „bisher nur Testkauf") |
| 28 | Erneuter Login | funktioniert vermutlich | Standard-Supabase-Auth, keine Besonderheit gefunden |
| 29 | Mobile Bedienung | **nicht visuell verifiziert** | PWA-Konfiguration vorhanden, `MobileShell.tsx` 119 kB eigener Chunk — kein Live-Screenshot möglich |
| 30 | Logout | funktioniert vermutlich | `signOut()` in `useAuth.tsx` real, räumt LocalStorage/IndexedDB gezielt auf |
| 31 | Passwort-/Zugangswiederherstellung | nicht geprüft | kein expliziter Reset-Flow in dieser Session gesucht |
| 32 | Datenschutz-/Export-/Löschwege | teilweise | `delete-my-account`-Function real vorhanden; `data-export`-Function real vorhanden; `data_retention_rules`-Tabelle aus Compliance-Audit bekannt |
| 33 | Hilfebereich | UI vorhanden | `/hilfe`, `Hilfe.tsx`-Route bestätigt |
| 34 | Sichtbare Kontaktmöglichkeit | UI vorhanden | `/support`, `Support.tsx`-Route bestätigt |

**Zusammenfassung Neukundenreise:** Keine der 34 Etappen ist als „nicht vorhanden" oder „blockiert" eingestuft. Der reale Risikoschwerpunkt liegt bei Schritt 1 (falsches Branding im ersten Eindruck durch den PWA-/Browsertab-Bug), Schritt 5 (irreführende interne Benachrichtigung) und Schritt 25 (fertiger, aber nicht ausgerollter Sicherheitsfix).

---

## 5. Frontend- und UX-Befunde

Ohne Live-Browser-Zugriff sind visuelle Aussagen (Kontrast, Abstände, „professioneller Eindruck", defekte Bilder) **nicht visuell verifiziert**. Belastbar aus Code/Build:

- **Bundle-Größe:** mehrere Chunks über 500 kB (`index-*.js` 638 kB/190 kB gzip, `GlobalSearch-*.js` 605 kB, `xlsx-*.js` 427 kB, `AdminBlogManager-*.js` 392 kB, `jspdf.es.min-*.js` 355 kB). PWA-Precache: **700 Einträge, 14,4 MB** — ungewöhnlich groß für den ersten App-Load auf mobilen Verbindungen. Vite warnt selbst.
- **Sehr breite Rollenaufteilung:** vier vollständig getrennte Dashboard-Bäume (Provider/Client/Partner/Employee) plus Admin — architektonisch sauber getrennt (eigene Chunks), aber Gesamtumfang macht Wartung/Konsistenzprüfung aufwendig.
- **Migrations-UX vorbildlich umgesetzt** (`HufManagerWelcome.tsx`, siehe Abschnitt 3) — als positives Muster für weitere Rebrand-Flächen verwendbar.
- **Kein Playwright/E2E vorhanden** — jede visuelle Regression wird heute nur manuell entdeckt.
- Alles Weitere aus dem Prüfkatalog (defekte Bilder, ewige Loader, tote Buttons, Kontrast, Touch-Flächen, Desktop-Nutzung der Breite) ist **nicht visuell verifiziert** — Browserzugriff in dieser Session nicht verfügbar (Chrome-Erweiterung nicht verbunden). Empfehlung: separater, kurzer Termin mit tatsächlichem Live-Zugriff, bevor Marketing-Budget eingesetzt wird.

---

## 6. Funktionswahrheit (zentrale Bereiche)

| Bereich | UI | Lesen | Schreiben | Hintergrund/Async | Live deployed | E2E getestet | Einstufung |
|---|---|---|---|---|---|---|---|
| Registrierung | Ja | Ja | Ja | Trigger real verifiziert | Ja | Contract-Tests (5/5) | funktioniert, Herkunft nicht nachweisbar |
| Kunden/Pferde | Ja | Ja | Ja | — | Ja | nein | funktioniert vermutlich |
| Termine/Kalender | Ja | Ja | Ja (vermutlich) | — | Ja | nein | funktioniert vermutlich |
| Rechnungen (Erstellung) | Ja | Ja | Ja | — | Ja | nein | funktioniert verifiziert |
| Rechnungsversand (Mail) | Ja | — | Autorisierung gefixt | Resend-Aufruf real | **Nein** (Fix nicht deployt) | 5/5 Contract-Tests | fertig, nicht live |
| CopeCart | Ja (Checkout extern) | Ja | Ja, gehärtet | Webhook real | Ja (v160, alter Stand ohne Härtung live) | 3/3 Contract-Tests | **gehärteter Code fertig, PROD läuft auf ungehärtetem Stand** |
| AVV/Compliance | Ja | Ja (aber falsche Quelle im Dashboard) | Ja | — | Ja (mit bekanntem Anzeigefehler) | nein | Anzeige fehlerhaft, Daten real vorhanden |
| Biometrie | Ja (Frontend) | Ja | **Nein — kein Server-Backup** | — | Ja (nur `localStorage`) | nein | unvollständig, TD-Kandidat |
| Error-Monitoring | Ja (Boundary-UI) | — | — | **kein echtes Backend (Sentry Platzhalter)** | Ja | nein | nicht vorhanden |
| Push-Benachrichtigungen | Ja (mehrere UI-Komponenten) | — | `send-push-notification` real, von CopeCart-Webhook genutzt | — | Ja | nein | funktioniert vermutlich, nicht einzeln E2E geprüft |
| Hufi Voice/TTS | Ja | — | `hufi-tts`-Function real vorhanden | — | Ja | nein | funktioniert vermutlich |
| Hufi AI (Chat) | Ja | — | `anthropic-proxy`/`ai-chat` real | — | Ja (mit bekannter CORS-Lücke, REL-001) | nein | funktioniert, Sicherheitsfix ausstehend |
| Offline-Sync | Ja (dediziertes Modul) | Ja | Ja | Sync-Hooks real (`useOfflineMutation`, `useOfflineState`) | Ja | nein | funktioniert vermutlich, nicht E2E geprüft |
| Mitarbeiter/Partner | Ja | Ja | Ja | — | Ja | nein | funktioniert vermutlich; AVV-Nachweis für diese Rollen **nicht vorhanden** (0 Zeilen in beiden Vertragstabellen) |
| Feature-Flags/Trial | — (Admin-UI) | Ja | Ja | — | Ja | nein | funktioniert, aber Plan-Wechsel provisioniert `feature_statuses` laut Inventar-Doku nicht automatisch (bekannte Lücke) |

**Grundsatz eingehalten:** Keine sichtbare Oberfläche wurde in dieser Tabelle als „vollständige Funktion" bewertet, ohne die zugehörige Schreib-/Live-/Testebene zu benennen.

---

## 7. Sale-Ready-Bewertung

| Kriterium | Status |
|---|---|
| Klarer Kundennutzen/Zielgruppe | vermutlich vorhanden, nicht visuell verifiziert |
| Klare, korrekte Preise/Tarifnamen | teilweise — bekannte Diskrepanz `advanced` vs. `duo`/`team` in `PLAN_FEATURE_MAP` (Inventar-Doku, nicht in dieser Session erneut verifiziert) |
| Funktionierende Kaufstrecke (CopeCart) | Code verifiziert korrekt, **0 reale Live-Transaktionen bisher** |
| Funktionierende Freischaltung | ja, Code-verifiziert (Feature-Provisionierung im Webhook) |
| Funktionierende Rechnung | ja (Erstellung), Versand-Fix nicht live |
| Funktionierende Registrierungsbestätigung | ja technisch, Branding irreführend |
| Support-Möglichkeit sichtbar | Route vorhanden, Inhalt nicht geprüft |
| Kündigungs-/Zugangslogik verständlich | Datenmodell vorhanden (`subscription_status`, `access_valid_until`), UI-Klarheit nicht geprüft |
| Keine Testdaten im echten Kundenerlebnis | **Risiko**: 7 Demo-Profile sind nur über E-Mail-Muster erkennbar, kein `is_demo`-Flag — bei fehlerhafter Filterung könnten Demo-Daten in echten Auswertungen auftauchen |
| Klare Abgrenzung zu HufManager | **nicht gegeben** — aktueller Live-Build zeigt HufManager-Branding auf hufiapp.de selbst |

**Kann Pascal morgen einen ersten neuen zahlenden Kunden aufnehmen?** Technisch ja (CopeCart-Kette funktioniert nachweislich), aber mit falschem Markenauftritt im Browsertab/PWA und ohne Gewissheit über Rechnungsversand (Fix nicht live).

**Was würde beim ersten echten Kunden wahrscheinlich schiefgehen?** Rechnungsversand nutzt den ungefixten PROD-Stand (funktioniert vermutlich trotzdem, da der Autorisierungsfix nur eine zusätzliche Prüfung hinzufügt, keine bestehende entfernt) — reales Risiko eher beim **CORS-/Correlation-ID-Stand von `anthropic-proxy`** (REL-001), falls Hufi-AI-Funktionen im Kundenerlebnis zentral sind.

**Was muss Pascal manuell begleiten?** AVV-Einholung bei neuen Providern (Dashboard zeigt heute falsch „0 unterschrieben" — Pascal muss das wissen, um nicht doppelt nachzufragen), Rechnungsversand-Erfolg stichprobenartig prüfen bis Fix live ist.

**Für den Markstart vorübergehend akzeptabel:** manuelle AVV-Nachverfolgung außerhalb des Dashboards, manuelle Beobachtung der ersten CopeCart-Zahlungen.

**Verkaufsblocker:** falsches Branding im ersten Eindruck (Browsertab/PWA), keine belastbare Registrierungsherkunft für Marketing-Erfolgsmessung.

---

## 8. Sicherheits- und Compliance-Gate

| Befund | Stufe | Quelle |
|---|---|---|
| TD-05 — fehlende `org_id`-Filterung in `PortalWidgets.tsx:61`, Cross-Tenant-Zählungsleck | **P0** | Code direkt verifiziert, TODO-Kommentar im Code bestätigt Lücke |
| `anthropic-proxy` Correlation-ID nicht zeichensatzgeprüft | **P0** | REL-001, bereits in CODEXTODO.md, einziger READY-Task |
| Biometrie-Credential nur `localStorage`, kein Server-Backup | **P1** | Code verifiziert, kein Fortschritt seit erster Prüfung |
| Kein echtes Error-Monitoring (Sentry Platzhalter) | **P1** | Code verifiziert |
| `legal_agreements`: Provider kann eigenen AVV-Nachweis selbst ändern/löschen, kein Audit-Log | **P1** | RLS-Policy direkt geprüft (`ALL` ohne Einschränkung), kein Trigger außer `updated_at` |
| `legal-documents`-Bucket: jeder Provider kann fremde Dateien ersetzen/löschen (keine Ordnerprüfung) | **P1** | RLS-Policy direkt geprüft |
| Partner-/Mitarbeiter-AVV: 0 Nachweise in beiden zuständigen Tabellen | **P1** | live SQL verifiziert |
| Registrierungsattribution (`signup_app`) funktionslos | **P1** (Datenqualität, kein Zugriffsrisiko) | live SQL verifiziert, 0 von 75 |
| Rechnungsversand-Autorisierungsfix nicht deployt | **P1** | Commit vorhanden, PROD-Version älter |
| CopeCart-Härtung nicht deployt | **P2** (Code selbst bereits korrekt, PROD lief vorher auch nicht offensichtlich falsch) | Commit vorhanden, PROD-Version älter |
| Demo-Profile nur über E-Mail-Muster erkennbar, kein `is_demo`-Flag | **P2** | bereits dokumentiert, geplante spätere Migration |
| Bundle-Größe/PWA-Precache-Umfang | **P3** | Build-Output dieser Session |
| Uneinheitliche Markenschreibweise im Code | **P3** | grep-Befund dieser Session |

Nicht jede Zeile hier ist ein Marktstartblocker — siehe Priorisierung Abschnitt 9/Release Plan.

---

## 9. Priorisierte Gesamtliste (P0–P3)

**P0 (max. 5, hier 3 real vorhanden — keine künstliche Auffüllung):**
1. TD-05 `org_id`-Filterlücke
2. `anthropic-proxy` Correlation-ID-Sanitizing (REL-001, bereits READY)
3. Build-Flavor-Bug (`VITE_APP_FLAVOR` fehlt in `deploy.sh`) — **neu als P0 eingestuft**, weil er den Markenauftritt des Hauptprodukts direkt und für jeden Besucher sichtbar verfälscht, nicht nur ein internes Risiko ist

**P1 (kombiniert mit P0 max. 10 Pakete für den ersten Sprint — siehe Release Plan Abschnitt für die exakte Paketierung):**
4. Biometrie-Server-Backup
5. Error-Monitoring-Basis
6. AVV-Dashboard-Read-Layer (AVV-001, bereits in CODEXTODO.md)
7. Registrierungsattribution reparieren (REG-001, bereits in CODEXTODO.md)
8. Registrierungs-Benachrichtigung korrekt beschriften (REG-002, bereits in CODEXTODO.md)
9. Rechnungsversand-Fix isoliert deployen
10. CopeCart-Härtung isoliert deployen

**P2:** RLS-/Storage-Härtung `legal_agreements` (AVV-002), Partner-/Mitarbeiter-Vertragsklärung (AVV-004), Demo-Flag-Migration, HufManager-Übergangsseite (LEGACY-001/002).

**P3:** Bundle-Splitting, einheitliche Markenschreibweise im Code, append-only Evidence-Modell (AVV-003), Capability-Transfer-Matrix (INVENTORY-001).

---

## 10. Belege

Alle Belege sind live in dieser und den vorangegangenen Sitzungen dieser Auditserie erhoben worden: `git log`/`git status`/`pg_get_functiondef`/`pg_policies`-Abfragen gegen `vnschgjxkzzwzefqlrji`, direkte Dateiinhalte aus `hufiapp-dev`, Live-Dateisystem-Zeitstempel unter `/var/www/hufiapps/v25` und `/var/www/hufmanager/app`, Bundle-Analyse aus `npm run build` dieser Session (`/tmp/build-audit.log`).

---

## 11. Offene Pascal-Entscheidungen

Siehe `CODEXTODO.md` Abschnitt 5 — unverändert gültig, ergänzt um:

14. Soll der Build-Flavor-Fix (`VITE_APP_FLAVOR=hufiapp` in `deploy.sh`) als eigenständiger, sofortiger P0-Fix vorgezogen werden, unabhängig von REL-001?
15. Soll vor Marketingeinsatz ein echter Live-Browser-Durchlauf (visuelle Verifikation) nachgeholt werden, bevor Stufe C/D angestrebt wird?

---

## 13. Kritischer Nachtrag (07.08.2026) — Zwei getrennte Produktions-Repositories

**Dies korrigiert Abschnitt 2 dieses Dokuments in einem zentralen Punkt.**

Bei der Prüfung der vier neuen Kernbestandteile (Abschnitt 14) wurde festgestellt: **`hufiapp.de` wird nicht aus `/home/pascaladmin/hufiapp-dev` deployt**, sondern aus einem separaten, root-eigenen Checkout:

```
/root/hufmanager_v25/production
```

Beleg:
- `deploy.sh` in beiden Verzeichnissen ist **byte-identisch** (`diff` ohne Ausgabe), Ziel beider: `/var/www/hufiapps/v25/`.
- Datei-Zeitstempel in `/root/hufmanager_v25/production` (u. a. `vite.config.ts`, `package.json`, `docs/`) liegen exakt bei **04.08.2026, 10:39** — deckungsgleich mit dem Live-Build-Zeitstempel des deployten `index.html` (10:40:24).
- Beide Checkouts teilen denselben Git-Remote (`passaondigital/hufmanager`), stehen aber auf **unterschiedlichen, divergierten Branches**: `hufiapp-dev` auf `feature/hufi-assistant-experience-preview` (HEAD `b5bebded`), Produktion auf `feature/multi-beruf-verkabelung` (HEAD `660937a6`, regulär per Pull-Request #17 gemergt).
- `git merge-base --is-ancestor` bestätigt: **keiner der beiden Branches enthält den anderen.** 37 Commits existieren nur in `hufiapp-dev`, 1 Commit nur in Produktion.
- Konkret bestätigt: **keiner der fünf in dieser Auditserie geprüften Sicherheits-/Compliance-Fixes** (`a30dc4ea`, `68276881`, `b3785f15`, `13075211`, `870a2c1c` — anthropic-proxy CORS, Rechnungsversand-Autorisierung, CopeCart-Härtung) **existiert im Produktions-Branch.**

**Korrektur der bisherigen Einstufung „fertig, nicht deployt":** Diese Fixes sind nicht nur einen Deploy-Klick entfernt — sie müssten zuerst reell in den Produktions-Branch überführt werden (Merge/Cherry-Pick/PR), bevor ein isolierter Edge-Function-Deploy überhaupt etwas Neues ausrollen würde. `MARKET-104`/`MARKET-105`/`REL-001` in `CODEXTODO.md` müssen um diesen Schritt ergänzt werden (siehe Release Plan).

`AGENTS.md`/`CLAUDE.md` sind in beiden Verzeichnissen nahezu identisch, aber nicht synchron (Produktions-Version nennt „Bekannte Fallen" von vor der aktuellen Rebrand-Aufräumung) — ein weiteres Indiz für unabhängige Pflege statt eines gemeinsamen Arbeitsflusses.

**Offene Pascal-Entscheidung (neu, höchste Priorität):** Welches Repository ist künftig kanonisch für Codex-Arbeit — `hufiapp-dev` (aktiver, aktueller Arbeitsstand) oder `/root/hufmanager_v25/production` (tatsächliche Deploy-Quelle)? Ohne diese Entscheidung bleibt jede weitere Aussage „live" vs. „nur lokal" für zukünftige Prüfungen unsicher.

---

## 14. Vier nicht verhandelbare Kernbestandteile (Pascal-Vorgabe 07.08.2026)

Geprüft in **beiden** Repositories, da „produktiver Live-Status" nur aus `/root/hufmanager_v25/production` korrekt ableitbar ist, „lokaler/committed Status" aus `hufiapp-dev`.

### 14.1 Wischoberfläche

| Feld | Befund |
|---|---|
| Implementierende Komponente | `src/components/workspace/HufiSwipeWorkspace.tsx`, exportiert als **`HufiSwipeWorkspacePreview`** (Name trägt „Preview" seit Einführung) |
| Lokaler Status (`hufiapp-dev`) | vorhanden, dokumentiert in `docs/hufi-workspace.md` als „isolierter, standardmäßig ausgeschalteter Prototyp" |
| Committed Status | ja, in `hufiapp-dev` (Branch `feature/hufi-swipe-workspace` separat, zusätzlich Dateien im Hauptbranch vorhanden) |
| Deployed/Live-Status | **existiert nicht im Produktions-Repository** (`/root/hufmanager_v25/production` enthält ausschließlich das ältere, fachlich andere `useSwipeNavigation.ts` für Tab-Wischen innerhalb einzelner Screens, keine Workspace-Wischfläche) |
| Feature-Flag | `VITE_HUFI_SWIPE_WORKSPACE`, **Default aus** (`isHufiSwipeWorkspaceEnabled()` liefert `false`, wenn Variable fehlt); in `hufiapp-dev`s lokaler, gitignorter `.env` derzeit `true` gesetzt — Wirkung auf einen etwaigen künftigen Deploy aus `hufiapp-dev` nicht zuverlässig vorhersagbar, da `.env`-Zeitstempel (05.08. 22:53) **nach** dem letzten realen Deploy (04.08. 10:40) liegt |
| Zuverlässig auf echtem Smartphone | **nicht visuell verifiziert**, kein Browserzugriff in dieser Session |
| Wischrichtung | Laut Code/Doku: **Wisch von links nach rechts** öffnet ein linksseitiges Panel (nicht „nach links" wie in der Aufgabenstellung formuliert) — **Terminologie-Klärung mit Pascal nötig**, bevor irgendetwas als „erfüllt" gilt |
| Zurücknavigation/Wiederaufnahme | vorhanden im Code (Schließen-Button, `isOpen`-State), nicht live testbar |
| Vertikales Scrollen vs. horizontales Wischen | laut `docs/hufi-workspace.md` bewusst gelöst: Pointer-Handler ruft nie `preventDefault`, dedizierte 24px-Randzone als eigenes Element (nicht die Fixed-Section) — **dokumentiertes Restrisiko auf schmalen Geräten (~360px)**, laut eigener Doku „nicht blind gefixt" |
| Desktop-Alternative | ja, sichtbarer „Workspace öffnen"-Button, laut Doku tastaturbedienbar |
| Barrierefreiheit | `aria-label`, `aria-expanded`, `aria-controls`, `role="dialog"`, `aria-modal` im Code vorhanden — nicht mit echtem Screenreader getestet |
| Lade-/Leer-/Fehlerzustände | Kacheln mit `availability: "planned"` zeigen „Demnächst" und sind deaktiviert (2 von 8 Kacheln) — ehrliche Kennzeichnung vorhanden, kein Vortäuschen |
| **Einstufung** | **existiert nicht produktiv** — reine, selbst als „Preview" benannte, isolierte, standardmäßig deaktivierte Komponente, nicht im Produktions-Branch vorhanden. Klarer Verkaufsblocker für die Vorgabe „muss produktiv vorhanden, sichtbar, E2E geprüft sein" |

### 14.2 Online-/Offline-Modus

| Feld | Befund |
|---|---|
| Sichtbarer Status | `src/components/offline/OfflineBanner.tsx` — verwendet in `EmployeeAppLayout.tsx`, `PartnerAppLayout.tsx`. **Nicht** bestätigt für Provider-/Client-Hauptlayout in dieser Prüfung — offener Punkt |
| Offline lesbar | `STATIC_QUERY_KEYS` (`offlineConfig.ts`): horses, contacts, customers, services, profiles, business-settings, horse-health-logs, horse-vaccinations, horse-diary-entries, horse-documents u. a. — real, breite Abdeckung |
| Offline schreibbar | `OFFLINE_MUTATION_TABLES`: **appointments, horses, contacts, invoices, hoof_photos, horse_documents, leads, messages, hoof_analyses, vehicle_mileage_logs, horse_health_logs, horse_vaccinations, horse_diary_entries, partner_treatment_notes, horse_status_reports** — deckt exakt die von Pascal genannten Kernentitäten (Termine, Kunden, Pferde, Dokumentation, Rechnungen) ab. **Dies ist echter Datenbetrieb, kein reiner App-Shell-Cache.** |
| Lokale Speicherung/Warteschlange | `src/lib/offline/syncQueue.ts` (88 Zeilen) — `addToSyncQueue()`, Retry-Zähler (`MAX_SYNC_RETRIES = 5`) real vorhanden |
| Synchronisation nach Wiederverbindung | `SYNC_CHECK_INTERVAL` (2 Min.) vorhanden, Mechanismus real, Erfolg nicht live getestet |
| **Konfliktbehandlung** | **kein Treffer** für „conflict"/„duplicate"/„idempotent"/„localId" im gesamten `syncQueue.ts` — **kein erkennbarer Schutz vor doppelten Datensätzen oder stillschweigendem Überschreiben bei Mehrgeräte-Nutzung.** Realer, unverifizierter Risikopunkt. |
| Abgebrochene Uploads | nicht im Detail geprüft (Fotos/Dokumente laufen über dieselbe Queue, kein dedizierter Resume-Mechanismus gefunden) |
| Sicherheitskritische Aktionen offline gesperrt | nicht explizit geprüft — kein Hinweis auf eine bewusste Sperrliste gefunden; **potenzielle Lücke**, falls z. B. Rechnungsversand oder Rollenänderungen offline zulässig wären |
| Verhalten bei Logout/Mehrgeräte | nicht geprüft |
| Datenschutz lokaler Daten / kontrolliertes Löschen | nicht geprüft — kein dedizierter „lokale Daten löschen"-Mechanismus gefunden |
| Repository-Konsistenz | Offline-Infrastruktur ist in **beiden** Repositories strukturell identisch vorhanden (gleiche Dateinamen/-pfade) — im Gegensatz zur Wischoberfläche also tatsächlich im Produktions-Branch |
| **Einstufung** | **echter Datenbetrieb vorhanden, aber Konflikt-/Mehrgeräte-Verhalten unverifiziert und ohne erkennbaren Schutz** — darf nicht als „vollständig belastbar" behauptet werden, bis Konfliktbehandlung geprüft oder ergänzt ist |

### 14.3 Kachelmenü mit zehn Hauptbausteinen

**Zentraler Befund: Es existiert heute keine entschiedene, produktiv umgesetzte Zehner-Struktur — nur eine explizit als „Hypothese, keine Entscheidung" gekennzeichnete Analyse.**

Kanonische Quelle (wie vorgegeben ermittelt, keine neue Liste erfunden): `docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`, Abschnitt 9. Dort vorgegebene Hypothese: *Heute · Termine · Kunden & Pferde · Dienstleistungen · Aufträge & Dokumentation · Rechnungen & Finanzen · Produkte & Shop · Betrieb & Ressourcen · Digitales Business · Team & Kommunikation.*

| Baustein | Route(n) | Funktionsstatus | HufManager-Rest | Produktiv live |
|---|---|---|---|---|
| Heute | **keine** | **nicht vorhanden** — laut Analyse „einzige der zehn Kacheln, die nicht auf eine bestehende Seite gemappt werden kann", nur Mockup in `HUFI_CORE_TARGET_ARCHITECTURE.md` §8 | — | Nein |
| Termine | `/kalender`, `/tour` | vollständig | Nein | Ja |
| Kunden & Pferde | `/kunden`, `/pferde`, `/pferd/:id`, `/aufnahme` | vollständig | Nein | Ja |
| Dienstleistungen | `/mein-angebot` | dünn belegt als eigene Kachel laut Analyse (ein appMap-Eintrag) | Nein | teilweise |
| Aufträge & Dokumentation | `/anfragen` + `/mein-office`, `/archiv`, `/auffassen` | belegt, aber laut Analyse fachlich uneinheitlich gebündelt (Sales-Funnel + Ablage) | Nein | teilweise |
| Rechnungen & Finanzen | `/rechnungen`, `/ausgaben`, `/buchhaltung`, `/guv`, `/business` | sehr stark belegt (8 Routen) | Nein | Ja |
| Produkte & Shop | nur `/lager` (Provider), **keine Route bei Partner** (`/partner-lager` laut Analyse ein toter Link) | schwach belegt, Analyse empfiehlt Streichung als Kernkachel | Nein | teilweise/defekt |
| Betrieb & Ressourcen | `/fuhrpark`, `/team`, `/lager`, `/work-mode` | belegt, aber laut Analyse stark rollenabhängig, eher adaptiv als Kern | Nein | teilweise |
| Digitales Business | `/management/website`, `/management/import` | appMap stuft beide als Einstellungen ein, nicht Tagesgeschäft | Nein | teilweise |
| Team & Kommunikation | `/team` (selten) + `/chat` (häufig) | fachlich zwei unterschiedliche Nutzungsfrequenzen, Analyse empfiehlt Trennung von „Anfragen & Chat" | Nein | teilweise |

Zusätzlich real vorhanden, aber **nicht Teil der Zehner-Hypothese**: die tatsächliche `AppSidebar.tsx` verwendet eine andere, gruppierte Struktur (Anfragen/Angebote/Aufnahme/Auffassen/Analyse plus separate Addon-Einträge Hufi Business/Kundenapp/Mein Office/Lager/Mitarbeiter/Hufi Connect/E-Mail Marketing) — **keine konkurrierende zweite Zehner-Liste, aber eine dritte, unabhängige Navigationsstruktur**, die nicht deckungsgleich mit der Hypothese ist.

**Einstufung: keiner der vier Market-Ready-Akzeptanzpunkte („genau die freigegebene Zehnerstruktur", „keine konkurrierenden Hauptmenüs", „jede Kachel führt zu funktionierendem oder ehrlich gekennzeichnetem Bereich") ist heute erfüllbar, weil die Zehnerstruktur selbst noch nicht final entschieden ist.** Das ist keine Umsetzungslücke, sondern eine offene Grundsatzentscheidung (siehe Abschnitt 12.3 der Analyse-Quelldatei).

### 14.4 Onboarding

| Feld | Befund |
|---|---|
| Tatsächlich aktive Komponente | `HufiOnboardingChat` — verifiziert eingebunden in `MobileShell.tsx` (`showOnboardingChat`-State), **identisch in beiden Repositories** |
| Konkurrierende Systeme | `OnboardingWizard.tsx`, `HufiNewUserOnboarding.tsx`, `ProviderSetupWizard.tsx`, `PartnerOnboarding.tsx`, `EmployeeOnboarding.tsx`, `ClientOnboarding.tsx` existieren alle als Dateien; **nur `HufiOnboardingChat` ist in `MobileShell.tsx` tatsächlich verdrahtet** — die anderen sind entweder rollenspezifisch an anderer Stelle eingebunden (nicht in dieser Session einzeln nachverfolgt) oder unbenutzter Altcode. **Nicht abschließend geklärt, welche der sechs weiteren Komponenten produktiv erreichbar sind** — echte Lücke dieser Prüfung, kein Rateergebnis |
| Fortsetzung nach Abbruch | nicht geprüft |
| Pflichtfelder/Demo-Inhalte/HufManager-Branding im Onboarding-Text | nicht visuell verifiziert |
| Abschlusszustand | nicht geprüft, ob nach Onboarding tatsächlich das (noch unentschiedene) Zehner-Kachelmenü folgt — strukturell unmöglich zu erfüllen, solange 14.3 offen ist |
| **Einstufung** | **eine Komponente ist nachweislich aktiv, mindestens sechs weitere existieren als unklar verdrahteter Altcode — echtes Risiko konkurrierender/verwirrender Onboarding-Pfade, nicht ausgeschlossen, nicht bestätigt** |

---

## 12. Go/No-Go-Bewertung

**Erreichte Stufe heute: B — CONTROLLED PILOT.**

Ein bis drei bewusst manuell betreute Neukunden sind technisch möglich — die Kernkette (Registrierung → Onboarding → Kunde/Pferd → Termin → Rechnung → Zahlung) funktioniert nachweislich. Für **C (Market-Ready)** fehlen: korrektes Branding im ersten Eindruck (Build-Flavor-Fix), verlässliche Registrierungsherkunft, deployte Rechnungsversand-/CORS-Fixes, funktionierendes AVV-Dashboard.

**Was Pascal manuell übernehmen müsste (bei sofortigem Pilotstart):** AVV-Status außerhalb des Dashboards selbst nachhalten, Rechnungsversand stichprobenartig prüfen, Registrierungsherkunft nicht aus dem System, sondern aus direktem Kundenkontakt ableiten.

**Was vor dem ersten zahlenden Kunden zwingend erledigt werden muss:** Build-Flavor-Fix (Marken-Vertrauen), REL-001 (Sicherheit), TD-05 (Datenintegrität).

**Was nicht länger blockieren darf:** HufiBrowser, HufiOS, HufiAI/API, append-only Evidence-Modell, Capability-Transfer-Matrix — alle bestätigt außerhalb des kritischen Pfads zum ersten Kunden.

**Nachtrag (07.08.2026, Abschnitt 13/14):** Die Stufe B (CONTROLLED PILOT) bleibt unverändert erreichbar — Pascals eigene Entscheidung 15 erlaubt 1–3 manuell begleitete Neukunden ausdrücklich, solange keine Sicherheits-/Daten-/Zahlungsblocker bestehen. Für Stufe C (MARKET-READY) gilt jetzt zusätzlich als zwingend, aber **nicht kurzfristig lösbar**: die Wischoberfläche existiert produktiv nicht (Neubau/Entscheidung nötig), die Zehner-Kachelstruktur ist keine getroffene Entscheidung, sondern eine offene Hypothese, und die Frage, welches Repository überhaupt kanonisch für Deploys ist, muss vor jeder weiteren Freigabe geklärt sein.
