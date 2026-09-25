# HufManager Slim — Gesamtbericht

**Stand:** 25.09.2026, abends · Branch `release/hufmanager-lifecycle-2026-09-11` · HEAD `1d1d33fe` (Repo) · Live-Frontend `25d88773`
· Production-DB `vnschgjxkzzwzefqlrji`, Ledger `20260925080000`.
Quelle: Live-Abfragen dieses Tages + `docs/CURRENT_STATE.md`. Markierung: **[verifiziert]** = heute live/Code geprüft,
**[Doku]** = aus früherer, dokumentierter Evidenz, **[gemeldet]** = von Pascal manuell gemeldet, im Repo nicht im Detail erfasst.

---

## 1. Executive Summary

**Wo wir stehen:** Der Kernablauf eines Hufbearbeiters (Registrierung → Trial → Kunde → Pferd → Termin → Tour → Abschluss →
Rechnung → PDF) funktioniert auf Production im Browser (390 px). Alle bisher gefundenen **Security-P0s sind behoben und auf
Production nachgewiesen** (Leistungskatalog-Leak, Cross-User-Cache, Invite-Passwort, Demo-Endpoints). Die DB ist nach dem
Incident vom 24.09. stabil.

**Was noch nicht funktioniert / nicht belegt ist:**
- **Kauf ist nicht belegt:** kein Testkauf CopeCart → Paid-Entitlement → Login. Kein Trial-Countdown, kein Kauf-CTA in der Slim-Oberfläche;
  Kaufpfad nur über den Sperrbildschirm → `/management/abo` (zeigt Legacy-Status).
- **E-Mail-Bestätigung ist aus** (`mailer_autoconfirm=true`) — jeder kann mit fremder E-Mail ein Trial-Konto anlegen.
- **Termin-DB-Schutz fehlt:** `appointments`-INSERT prüft nicht, ob Pferd/Kunde zum Provider gehören (nur UI-Guard).
- **UX ist uneinheitlich:** alle „Mehr“-Einträge verlassen die Slim-Shell und öffnen die alte App-Oberfläche.
- Mobile nur emuliert, kein echtes Android-Gerät. Material/Lager nicht getestet.

**Nähe zu den Zielen:**
- `READY_FOR_REAL_USERS` = **BEDINGT** — begleitete Pilotnutzer (wie heute Claudia) ja; offene Selbstregistrierung erst nach
  Confirm-Email + Termin-DB-Guard.
- `SALE_READY` = **NEIN** — Kauf-E2E fehlt, Kaufpfad in der Oberfläche fehlt, UX-Konsolidierung fehlt.

---

## 2. Production-Infrastruktur

| Punkt | Stand |
|---|---|
| DB-Incident 23./24.09. | Geschlossen 24.09. 21:32 UTC (`INCIDENT_RECOVERY=PASS`) [Doku] |
| Root Cause | `net._http_response` (pg_net) auf 267 MB für 566 Zeilen aufgebläht, Autovacuum seit 05.08. nie gelaufen; TTL-DELETE bis 26 min/Lauf ≈ 90 % DB-Zeit. Dazu `cron.job_run_details` ohne Retention: 373.248 Zeilen/410 MB inkl. Bearer-JWT je Zeile. Nach Bereinigung blieb die Instanz gedrosselt (Compute/IO-Budget) bis zum Neustart durch Pascal. [Doku] |
| `cron.job_run_details` | 2.321 Zeilen / 2,3 MB, älteste 24.09. 17:18 UTC [verifiziert] |
| Retention | Job 24 `purge-cron-job-run-details` (täglich 03:17 UTC, > 7 Tage), erster Lauf 25.09. 03:17 erfolgreich [verifiziert] |
| `net._http_response` | 2,8 MB, `last_autovacuum` **weiterhin 05.08.** → Frühwarnsignal, beobachten (P1) [verifiziert] |
| Job 20 `hufi-routines-runner` (*/5) | deaktiviert, nicht gelöscht (Legacy-Duplikat) [verifiziert] |
| Job 21 `routines-runner` (jede Minute) | aktiv, `hufi_routines` hat 0 Zeilen → fachlich leer [verifiziert/Doku] |
| Cron-Fehler | 169 in 24 h, **alle vor dem Neustart** (≤ 24.09. 21:05 UTC); seitdem 0 [verifiziert] |
| DB-Größe | 194 MB (vor Incident-Bereinigung 865 MB) [verifiziert] |
| Offen | JWT im Klartext in Cron-Kommandos 8–14, 16–21 (P1, Vault-Umstellung); Compute-Größe Nano/Micro; kein Offsite-/Storage-Backup; letzter Restore-Drill 11.09. |

---

## 3. Security / Tenant Isolation

**Ursprünglicher Fund (25.09., Pascal manuell):** Nach Kontowechsel im selben Browser zeigte das Demo-Konto Pferde des Hauptkontos
im Termin-Dialog. **Kein DB-Leak** (RLS: Demo sieht 0 dieser Pferde). **Root Cause:** TanStack-Query-Cache in IndexedDB persistiert
und ohne Besitzerbindung wiederhergestellt; Query-Keys `horses-with-price-group`/`horses-quick-add` ohne User-ID. [Doku]

**Fixes (live, `afb43d95` + `25d88773`):** Cache an uid gebunden, persistenter Besitzer-Marker, Wechsel leert Query-Cache +
IndexedDB (Offline-Sync-/Bild-Queues) + unscoped localStorage (**Mitarbeiter-Notizbuch**, Arbeitszeit); **Offline-Queues** laufen nur
für den Besitzer. **Same-tab account switch** und **QA A/B** auf Production: 0 Leak in 12 Bereichen; Reload behält eigenen Cache. [Doku]

**Weitere geschlossene P0s:** Leistungskatalog Cross-Tenant (RLS + Schreib-Trigger, 24/24 Tests, Prod-Smoke) · Invite-Einmalpasswort ·
Demo-Endpoints/Passwörter · PII-Logging CopeCart. **DB/RLS:** 36/36 Adversarial-Checks A↔B (2×). [Doku]

**Verbleibende Risiken:**
| Risiko | Klasse | Prio |
|---|---|---|
| `appointments` INSERT prüft Pferd/Kunde ↔ Provider nicht (nur UI-Guard) [verifiziert: nur `trg_hm_guard_service_owner_v1`] | Security | P1 |
| Autoconfirm: Registrierung mit fremder E-Mail möglich | Security | P0 für offene Registrierung |
| Access-Gates fail-open bei Lesefehler (Daten durch RESTRICTIVE-RLS geschützt) | Security-Härtung | P1 |
| „Mehr“-Ziele (Lager, Ausgaben, Fuhrpark …) laufen außerhalb `HufmanagerSlimAccessGate`; DB-Gate dieser Tabellen nicht geprüft | Billing/Security | P1 (prüfen) |
| JWT in Cron-Kommandos/Logs | Security/Ops | P1 |
| Repo `passaondigital/hufmanager` öffentlich | Security | Owner-Entscheidung |
| Fremde `profile_id` in Kontakt anlegbar (ohne Sichtgewinn); Kunden, die sich selbst verbinden, sehen Leistungen; Cross-Tab-Auth-Broadcast | Security | P2 |

---

## 4. Auth

| Flow | Stand |
|---|---|
| Signup (UI) | PASS — sendet `signup_app=hufmanager`, Trial startet [Doku] |
| Login / Logout / Reload | PASS — Reload in Arbeitsseiten behält Session, `/`/`/auth` erzwingt Neu-Login, Logout → `/auth` [Doku] |
| Sessionwechsel | PASS nach Cache-Fix [Doku] |
| Confirm Email | **AUS** (`mailer_autoconfirm=true`) [verifiziert via `/auth/v1/settings`] |
| SMTP | Custom SMTP aktiv: Absender `team@hufmanager.de` (Resend), Zustellung an Gmail in < 1 s [verifiziert: 3 Mails] |
| Reset Password | Mail korrekt (`ConfirmationURL`, Redirect `app.hufmanager.de/reset-password`) [verifiziert]; Klick + neues Passwort **nicht E2E getestet** |
| Magic Link | Mail korrekt, HufManager-Branding, Redirect `app.hufmanager.de/home` [verifiziert] (nur Admin-OTP nutzt es) |
| Invites (Kunde) | eigene Resend-Mail, Origin-Allowlist `app.hufmanager.de`, 8/8 [Doku] |
| Invites (Provider/Mitarbeiter/Partner) | **falsche Domains** hart kodiert/als Fallback (s. u.) [verifiziert] |
| Email Change / Reauthentication | im Frontend nicht verwendet [verifiziert] |

**Shared Supabase HufManager/HufiApp — Korrektur:** Das live unter `hufiapp.de` ausgelieferte HuufiApp-Frontend (Repo
`passaondigital/hufiappde`) nutzt Supabase **`oortmejcefbiewaceccc`**, nicht das HufManager-Projekt. Im HufManager-Projekt liegen nur
HufManager-Nutzer, 1 echter `hufiapp`-Nutzer vom 08.08. und `preview.hufiapp.de` (alter Build). Die Site URL `https://hufiapp.de`
schickt Fallback-Links also in eine App mit anderem Backend. Bewiesen: Reset-Mail ohne `redirect_to` → `redirect_to=https://hufiapp.de`.

**Code-Fix (`1d1d33fe`, gepusht, NICHT deployt):** `/connect/:slug` (Kunden-Selbstregistrierung über Provider-Link, 10 aktive Links)
rief `signUp` ohne `emailRedirectTo` auf und leitete ohne Session weiter. Jetzt Redirect `/client-home` + Hinweis „Bitte bestätige deine
E-Mail“. Guard-Test prüft alle `signUp`/`signInWithOtp`/`resetPasswordForEmail`-Aufrufe (Negativkontrolle schlägt fehl). vitest 333/333,
tsc 131 = Baseline. Security-Review des Diffs: nur `window.location.origin` (GoTrue akzeptiert nur Allowlist), E-Mail per JSX escaped — keine Findings.

**Edge-Functions mit falscher Ziel-Domain (unabhängig von Confirm Email):**
`admin-create-user` v132 + `send-provider-invitation` v110 → `https://hufiapp.de/auth` (P1) · `send-employee-invitation` v94 →
`APP_URL || https://app.hufiapp.de` (Zertifikat ungültig, P1) · `send-partner-invitation` v81 → `APP_URL || https://hufiapp.de` (P2) ·
`send-client-invitation` Fallback nur ohne Origin-Header (P2).

**Handlungsbedarf:** Deploy `1d1d33fe` → Confirm-Template im Dashboard sichten → Confirm Email einschalten → QA-Signup E2E.
Danach Edge-Invite-Domains korrigieren. Site URL: Entscheidung Pascal (siehe Abschnitt 15).

---

## 5. Trial / Membership / Billing

| Punkt | Stand |
|---|---|
| 14-Tage-Trial | PASS — serverseitig (Producer + Trigger, CHECK 14 T., Ablauf beim Lesen) [Doku] |
| Nur HufManager | PASS — Migration `20260925080000`, nur `signup_app='hufmanager'`, fail-closed; 23/23 Tests [Doku] |
| HufiApp unaffected | PASS im HufManager-Projekt (API-Signup `hufiapp` → kein Entitlement); Live-HufiApp nutzt ohnehin anderes Projekt [verifiziert] |
| Membership-404 | `get_product_membership_context` fehlt in Prod, 1×/Sitzung, nicht blockierend (P2) [Doku] |
| CopeCart | IPN → `copecart-webhook` v165 ack-only + `hufi-data-core` (Slim-Wahrheit); `CANONICAL_BILLING_WRITER=UNRESOLVED`; Secret-Rotation DEFERRED/RISK_ACCEPTED [Doku] |
| Testkauf | **NICHT durchgeführt** |
| Trial-Countdown | **fehlt** in der Slim-Oberfläche [verifiziert: kein Treffer im Slim-Code] |
| Kauf-CTA ab Tag 1 | **fehlt**; nur Sperrbildschirm bei Ablauf → `/management/abo` (Legacy-Status) [verifiziert] |
| Paid-State danach | nicht belegt |

---

## 6. Kunden / Pferde / Termine

- **Kunden / Pferde anlegen:** PASS inkl. Reload; Doppelklick-Dubletten behoben (`76679463`). [Doku]
- **Termine:** PASS inkl. Doppelklick-Schutz; Leistungsauswahl nur eigene Leistungen. [Doku]
- **Service Catalog:** isoliert (RLS + Trigger). Neue Provider haben **0 Standard-Leistungen** (`create_default_service_presets` → 0) → Termin mit 0-€-Standardvorlage. [Doku]
- **DB-Schutz Termine:** Leistung ✅ (`trg_hm_guard_service_owner_v1`); **Pferd/Kunde ↔ Provider ❌** [verifiziert].
- **22 historische Termine** (5 echte Provider, seit 14.08.) mit fremden Leistungen: unverändert, weiter bearbeitbar; Preisrekonstruktion = **Owner-Entscheidung offen**. [Doku]
- **Race Conditions:** Doppel-Submit behoben (Submit-Lock); Job 20/21-Doppelausführung durch Deaktivierung Job 20 entschärft. Keine weiteren belegt.
- **Datenzuordnung:** 30 Tage 0 Termine mit Pferd ohne Grant zum Provider; Termin Fenja-Hope konsistent. [Doku]

---

## 7. Rechnungen

- **Nummer pro Provider:** `UNIQUE (provider_id, invoice_number)` live, 11 Bestandsrechnungen unverändert. [Doku]
- **Erstellung:** PASS (RPC atomar, Beträge korrekt: 50,42 + 9,58 = 60,00 €). [Doku]
- **PDF:** PASS; Kundenstraße + Datums-Default gefixt (`84eefb13`). **P1:** Pflichtangaben Absender (Adresse, Steuernr., IBAN) fehlen ohne Hinweis/Gate. **P2:** Spalten „Pos.“/„Menge“ zu schmal. [Doku]
- **Nummernlücken:** RE-2026-0001/0002 im QA-Tenant durch Fehlversuche vor dem Fix verbraucht; Nummernvergabe lückenlos nicht garantiert (P2, steuerlich prüfen).

---

## 8. UX/UI

Detailbefunde aus Pascals manuellem Test sind im Repo **nicht einzeln dokumentiert**; Einordnung nach Bereich. Code-Fakten markiert.

| Bereich | Befund | Klasse |
|---|---|---|
| Dark/Light | inkonsistent [gemeldet]; Ursache mit hoher Wahrscheinlichkeit: „Mehr“-Ziele rendern im alten `AppLayout`, nicht in der Slim-Shell [verifiziert: Routing] | Designinkonsistenz |
| Modals / Dropdowns | Darstellungsprobleme [gemeldet] | UX-Bug |
| Tooltip-Überlagerung | Hilfe-Tooltip über Termin-Dialogtitel [Doku], nicht nachgetestet | UX-Bug |
| Abgeschnittene Footer | [gemeldet] | UX-Bug |
| Kalender | „Termin planen“ springt aus Slim nach `/kalender` (Legacy) [Doku] | UX-Bug |
| Kunden & Pferde | Partner-Notizen leer (400, fehlende Spalten) [Doku]; weitere [gemeldet] | funktionaler Bug (P2) |
| „Mehr“ | alle 10 Einträge verlassen die Slim-Shell [verifiziert] | Designinkonsistenz / fehlendes Feature |
| Material/Lager | ungetestet | — |
| Hufanalyse | in Slim-Shell, nicht E2E getestet | — |
| Finanzen / Heute | funktional im Golden Flow; Detailbefunde [gemeldet] | UX-Bug |
| Sidebar | Legacy-Sidebar in „Mehr“-Zielen [verifiziert: AppLayout] | Designinkonsistenz |
| Sichtbarer Account | fehlt [gemeldet] | fehlendes Feature |
| Logout | nur in „Mehr“ (Slim) [verifiziert: Kommentar App.tsx] | UX |
| Datum/Uhrzeit | Rechnungsdatum-UTC-Bug behoben; weitere [gemeldet] | funktional (behoben) / UX |
| Trial-/Kaufstatus | nicht sichtbar [verifiziert] | fehlendes Feature (P1) |

---

## 9. Onboarding

- Betriebsname aus Signup wird **nicht gespeichert** (`hm_pending_business_name` ohne Consumer) — funktionaler Bug. [Doku]
- **Keine Standard-Leistungen** für neue Provider — funktionaler Bug, hebt auf P1 (jeder neue Nutzer startet mit 0-€-Terminen).
- Erster Kunde / erstes Pferd / erster Termin: funktionieren; Wizard-Hänger behoben (`2668a344`). [Doku]
- Trial startet automatisch. Kaufpfad: fehlt in der Oberfläche (s. 5).

---

## 10. Mobile / PWA

- **Simuliert (Pixel-7-Emulation, 390×844):** 7 Screens ohne horizontales Überlaufen, Golden Flow, Manifest installierbar, Service Worker aktiv. [Doku]
- **Fehlt auf echtem Android:** Installation, Kamera/Foto-Upload, Tastatur-Overlays, GPS/Tour, Push, Performance.
- **Offline:** Kaltstart geht nicht (`navigateFallback: null`) — **deferred** (Post-Release-Entscheidung). Manifest-MIME + `theme_color` (P2).

---

## 11. „Mehr“ — Feature-Inventar

Code-Stand: alle Ziele existieren als Routen im alten `AppLayout` (nur `ProtectedRoute`, **kein Slim-Entitlement-Gate im Frontend**).
Funktional nicht einzeln getestet → „vollständig“ ist für keinen Eintrag belegt.

| Eintrag | Ziel | Vorhanden | Test-Status | Empfehlung |
|---|---|---|---|---|
| Kalender & Termine | `/kalender` | ja (Legacy) | Termin-Anlage über Slim getestet, Kalender selbst nicht | sichtbar, in Slim integrieren |
| Anfragen | `/anfragen` | ja (Legacy) | nicht getestet | ausblenden bis getestet |
| Kundenzugang / KundenApp | `/kunden` | ja (Legacy) | Invite 8/8 [Doku] | sichtbar |
| Material & Lager | `/lager` | ja (Legacy) | nicht getestet | ausblenden oder testen |
| Ausgaben & Belege | `/ausgaben` | ja (Legacy) | nicht getestet | ausblenden oder testen |
| Fuhrpark & Fahrtenbuch | `/fuhrpark` | ja (Legacy) | nicht getestet | ausblenden |
| Einstellungen | `/management` | ja (Legacy) | Betriebsdaten für PDF relevant | sichtbar |
| Abo & Vertrag | `/management/abo` | ja, zeigt Legacy-Status | nicht releasefähig | ersetzen durch Slim-Kaufseite |
| Hilfe / Support | `/hilfe`, `/support` | ja | nicht getestet | sichtbar |
| Theme-Umschalter | in Slim | ja | — | sichtbar |

---

## 12. Release Gates

| Gate | Status | Grund |
|---|---|---|
| Security | WARN | P0s geschlossen; offen: Autoconfirm, Termin-Guard, fail-open, Cron-JWT |
| Tenant Isolation | WARN | DB 36/36, Services + Cache gefixt; Termin-INSERT ohne Pferd/Kunde-Prüfung |
| Signup | PASS | UI-Signup + Trial Production |
| Confirm Email | FAIL | aus; Fix `1d1d33fe` nicht deployt |
| Trial | PASS | nur HufManager, 14 T. |
| Customer | PASS | |
| Horse | PASS | |
| Appointment | WARN | funktioniert; DB-Guard fehlt |
| Service Catalog | WARN | isoliert; neue Provider ohne Leistungen |
| Tour | PASS | Golden Flow (emuliert) |
| Documentation | WARN | nur „Alles gut“-Pfad getestet |
| Material/Lager | NOT TESTED | |
| Invoice | WARN | korrekt; Pflichtangaben-Gate fehlt |
| PDF | WARN | Pflichtangaben, Spaltenbreite |
| Mobile | WARN | nur Emulation; Realgerät NOT TESTED |
| Billing | FAIL | kein Testkauf, kein Kaufpfad in UI |
| UX/UI | FAIL | Slim/Legacy-Bruch, gemeldete Darstellungsfehler |

---

## 13. Prioritäten

**P0 (vor Verkauf / offener Registrierung)**
1. Kauf-E2E: Testkauf → Paid-Entitlement → Login; Canonical Billing Writer festlegen.
2. Confirm Email aktivieren (nach Deploy `1d1d33fe`).
3. Sichtbarer Kaufpfad (CTA + Trial-Countdown) — ohne ihn kann nach Tag 14 niemand kaufen außer über Legacy-Abo-Seite.

**P1**
Termin-DB-Guard (Pferd/Kunde ↔ Provider) · Edge-Invite-Domains (admin-create-user, send-provider-invitation, send-employee-invitation) ·
Site-URL-Entscheidung · Standard-Leistungen für neue Provider · Rechnungs-Pflichtangaben-Gate · Slim-Gate für „Mehr“-Ziele prüfen ·
fail-open Gates · Cron-JWT → Vault · `_http_response`-Autovacuum beobachten · Offsite-Backup + Restore-Drill · UX-Konsolidierung „Mehr“/Theme.

**P2**
Betriebsname speichern · Membership-RPC 404 · Partner-Notizen 400 · Push 403 · PDF-Spalten · Nummernlücken · Manifest-MIME/theme_color ·
fremde `profile_id` in Kontakt · Cross-Tab-Auth · `send-partner-invitation`/`send-client-invitation`-Fallback.

**Post-Release**
Offline-Kaltstart · Ledger-Sanierung Weg B · Legacy-SECURITY-DEFINER-Abbau · CopeCart-Secret-Rotation (Risiko akzeptiert).

**Owner-Entscheidungen offen:** 22 Alttermine (Preise), Site URL, Canonical Billing Writer, Repo öffentlich, Offline.

---

## 14. Plan ab jetzt

| # | Wer | Schritt |
|---|---|---|
| 1 | Pascal | Deploy `1d1d33fe` freigeben (Claude führt `./deploy.sh hufmanager` aus) |
| 2 | Pascal | Dashboard: Confirm-Signup-Template sichten, Confirm Email einschalten (Klickanleitung im Chat) |
| 3 | Claude | Direkt danach QA-Signup über UI, Mail lesen, Link klicken, Landung `/home` + Trial prüfen; bei Fehler sofort zurückschalten |
| 4 | Claude | Termin-DB-Guard: Migration + Tests + Negativkontrolle + Security-Review, Apply nach Freigabe |
| 5 | Claude | Edge-Invite-Domains auf `app.hufmanager.de` (deployte Fassung vorher gegen Repo prüfen) |
| 6 | Claude | Trial-Countdown + Kauf-CTA in Slim, Standard-Leistungen, Betriebsname |
| 7 | Pascal + Claude | Testkauf CopeCart → Paid-State verifizieren |
| 8 | Codex | UX: „Mehr“-Ziele in Slim-Shell, Dark/Light-Tokens, Modals/Dropdowns/Tooltips/Footer, Account-Anzeige, Datum/Uhrzeit |
| 9 | Pascal | Android-Realgerät: Installation, Foto, Tour, Tastatur |
| 10 | Claude | Rechnungs-Pflichtangaben-Gate, Restore-Drill + Offsite-Backup |

**Zwingend vor Verkauf:** 1–7, UX-Grundkonsolidierung (8, mindestens „Mehr“/Abo/Theme), Android-Test (9).

---

## 15. Abschluss

```
READY_FOR_REAL_USERS = BEDINGT (Pilotnutzer ja; offene Registrierung nein)
SALE_READY           = NEIN
OPEN_P0              = 3 (Kauf-E2E, Confirm Email, Kaufpfad/CTA in UI)
OPEN_P1              = 11
OPEN_P2              = 10
OWNER_ACTIONS        = Deploy-Freigabe 1d1d33fe; Confirm-Template sichten + Confirm Email an; Site-URL-Entscheidung;
                       Testkauf; Android-Test; 22 Alttermine; Canonical Billing Writer
NEXT_5_ACTIONS       = 1 Deploy 1d1d33fe · 2 Confirm Email an + QA-Signup-E2E · 3 Termin-DB-Guard ·
                       4 Trial-Countdown + Kauf-CTA · 5 Testkauf CopeCart
SAFE_TO_ENABLE_CONFIRM_EMAIL = NO bis Deploy 1d1d33fe, danach YES (mit Template-Sichtprüfung)
```
