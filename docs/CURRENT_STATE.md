# HufManager — CURRENT STATE / SOURCE OF TRUTH

**Stand:** 28.09.2026 spät (Final-Release-Sprint) (neueste Einträge am Dateiende; Kopfabschnitte 1–7 = Stand 24.09.2026, live verifiziert, read-only gegen Production; MCP-Ziel per get_project = HufManager/eu-central-1 bestätigt)

> Aktueller technischer Snapshot für Menschen und Agenten. Bei Widerspruch gilt:
> Repo + aktuelle Runtime + aktuelle DB + reproduzierbare Testevidenz vor älterer Doku.
>
> **Korrektur zum Stand 22.09.:** Die dort genannte Sperre `MIGRATION_LEDGER=BLOCKED` war
> zum Zeitpunkt des Schreibens bereits überholt. Sie basierte auf Commit `0ca6d2a4` und kannte
> 23 lokal auf dem Server liegende, ungepushte Commits vom 21.09. nicht (Ledger-Reconciliation
> + Production-Apply der Release-Migrationen #1–#9). Diese Commits sind jetzt gepusht.

## 29.09.2026 — Release-Closeout (Nachtrag)

**29.09. Closeout:** PROD unverändert (Frontend `ceacdcb4`, admin-create-user v136, Ledger `20260929120000`). Neu gefunden + im Repo gefixt (NICHT deployt, Freigabe ausstehend): P1 Mitarbeiter bekommt zusätzlich Rolle `provider` (Login hängt), P1 CopeCart-Käuferzuordnung bei E-Mail-Dubletten (Zahlung 500), P1 Kündigung beendet Zugang nie (Migration `20260929130000`), P2 kein Offline-Hinweis in der Slim-Shell, P2 Provider-Mail-Zustellbarkeit. Performance-Baseline PASS, Security 38/38 + 11/11, vitest 392/392. Details + Owner-Paket: `docs/release/HUFMANAGER_CLOSEOUT_2026-09-29.md`.

PROD-Datenänderungen heute nur an QA-Konten: `+qa-emp-0929` angelegt (account_class=qa, Fehlrolle `provider` entfernt), Mitarbeiter-Eintrag bei QA Provider A.

## 1. Source of Truth

| Punkt | Wert (verifiziert 24.09.2026) |
|---|---|
| Repo | `passaondigital/hufmanager`, lokal `/home/administrator/hufmanager` |
| Release-Branch | `release/hufmanager-lifecycle-2026-09-11` |
| Live-Stand | Frontend `992f9117`; Edge invite-client-with-password v9 (`992f9117`), invite-client v9, admin-create-client v118, copecart-webhook v165, demo-Functions v32/v5 (410) |
| `origin/main` | `f7640eaa` — für HufManager-Slim **nicht** maßgeblich |
| Worktrees / Stashes | nur Haupt-Worktree, keine Stashes |
| Server | `cloud-server-10634828` / `85.190.105.104` — **Production-Web und Staging-Web laufen auf demselben Host** |
| Production-Web | `app.hufmanager.de` (DNS → 85.190.105.104) → nginx root `/srv/hufi/business/hufmanager/app` → Symlink `current` → `releases/992f9117db0d` (previous `b15b61334616`) |
| Staging-Web | `hufmanager-staging.huficloud.heyhufi.com` → `/srv/hufi/lab/factory/projects/hufmanager/dist` (HTTP 200; HTTPS-Check vom Server aus: kein Response) |
| Production-DB | Supabase `vnschgjxkzzwzefqlrji` |
| Lokale Supabase | Docker-Stack `supabase_*_vnschgjxkzzwzefqlrji` auf dem Server = **lokale Kopie/Staging**, nicht Production |
| Supabase CLI | **nicht eingeloggt** (kein Access-Token) → Edge-Deploy nur über Supabase-MCP/Dashboard |

## 2. Migration Ledger — RECONCILED

Live `list_migrations` (24.09.): letzter Eintrag `20260920190000_fix_cross_provider_ghost_takeover_v1`.

In Production angewendet und im Ledger (Evidenz: `docs/HUFMANAGER_MIGRATION_LEDGER_RECONCILIATION_2026-09-21.md`, Nachträge 1–13):

```
20260917120000 add_create_customer_with_contact_v1
20260917125000 add_autoflow_invoice_appointment_idempotency_v1
20260917130000 add_create_invoice_with_items_for_provider_v1
20260917140000 fix_autoflow_trigger_auth_vault_v1
20260917150000 add_pending_client_invite_contract_v1
20260917152500 fix_hm_normalize_email_search_path_v1   (Hardening)
20260917155000 fix_invite_tenant_auto_assign_v1
20260917160000 add_create_invited_customer_with_contact_v1
20260920120000 fix_pending_invite_ghost_merge_v1
20260920190000 fix_cross_provider_ghost_takeover_v1
```

```
LEDGER_RECONCILED=YES         (Weg A: Ledger unangetastet, Release migrationsweise)
RELEASE_MIGRATIONS_PENDING=0
SAFE_FOR_NEXT_MIGRATION=YES, aber nur einzeln per Apply-Skript mit Pre/Postcheck
```

Bekannte, **bewusst nicht reparierte** Ledger-Drift: der Slim-Entitlement-Layer
(`20260911204057…20260912051700`, 7 Dateien) und 36 Legacy-Migrationen sind im Schema wirksam,
aber ohne Ledger-Eintrag. 8 `_prepared`-Migrationen sind nie angewendet.
**`supabase db push` bleibt verboten** (würde ~395 bereits angewendete Migrationen erneut ausführen
und `_prepared`-Billing-Logik scharf schalten).

## 3. Production-Stand nach Deploy 24.09.2026 (~09:50–10:00 MESZ)

Vorbedingung: Prod-Dump `~/hufmanager-backups/20260924-094320-post-mig9-pre-invite-deploy/db/`
(sha256 `87d68259…2cc73`, 30,4 MB, 339 Tabellen-Datenblöcke, Ledger `20260920190000`) — unabhängig verifiziert.
Security-Review Deploy-Set: keine neuen High-Confidence-Findings; Origin-Allowlist + Resend-Fehlerprüfung nachgezogen.

| Komponente | vorher | jetzt | Verifikation |
|---|---|---|---|
| `invite-client-with-password` | v7 | **v8** (`9f82803e`), verify_jwt=false | 401 ohne/ungültiger Token; 403 ohne Pro (echter QA-JWT) |
| `invite-client` | v8 | **v9** = 410 Gone, verify_jwt=false | 410 mit/ohne Token |
| `admin-create-client` | v117 | **v118**, verify_jwt=true | Gateway 401; Anon 401; Provider-JWT 403 |
| `copecart-webhook` | v164 | **v165** ack-only (`536b5f8b`), verify_jwt=false | SHA256 beider Dateien = Repo; 401 ohne/falsche Signatur |
| `create-demo-business-user` | v31 | **unverändert** — nicht benötigt, nicht deployt | Löschung im Dashboard empfohlen |
| Frontend | Build 12.09. | **`b15b6133`** via `./deploy.sh` | Entry-Chunk aus Release; neuer Invite-Pfad in 2 Chunks, alter in 0; Deploy-Smoke 0 Errors |

Webroot: `releases/b15b61334616` (current), Rollback-Ziel `releases/legacy-app-20260924T075848Z` (previous).
Rollback: `./deploy.sh hufmanager --rollback`; Edge-Vorfassungen in `~/hufmanager-backups/20260924-081933-pre-invite-p0-deploy/`.
DB nach Deploy + Smoke: nur +2 Profile/User (QA A/B), Grants 57 unverändert, 0 Pending Invites, Ledger unverändert.

### QA-Tenants (dauerhaft)

- QA Provider A `barhufserviceschmid+qa-a@gmail.com` (id 229ec82f…), QA Provider B `…+qa-b@gmail.com` (id 3740367c…)
- Zugangsdaten nur lokal: `~/.config/hufmanager-qa/credentials.env` (chmod 600)
- Zustand: Rolle provider, `starter/trialing`, **kein Slim-Entitlement** → `NO_ENTITLEMENT`, kein Pro → Invite 403

### Trial-P0 — BEHOBEN (24.09.2026)

Migration `20260924120000_add_hufmanager_slim_trial_producer_v1` (Commit `170a2fed`, sha256 `a38930f1…`),
angewendet per Transaktion inkl. Ledger-Eintrag. Postcheck: md5 Writer `533a14ba…`, Producer `7b8bc74b…`,
Trigger-Fn `37f3d54f…` = lokal erwartet; Rechte nur service_role; 0 offene Issues.

- Einzige Zugangswahrheit unverändert: `hm_lifecycle_events` → `hm_project_hufmanager_entitlement_v1` → `product_entitlements`.
- Neuer Producer `hm_start_hufmanager_slim_trial_v1` + Trigger `trg_user_roles_start_slim_trial` (Rolle provider).
- Writer-Guard: `trial_started` überschreibt nie einen bestehenden/aktiven/früheren Eintrag.
- 14 Tage serverseitig (CHECK-Constraint), Ablauf beim Lesen (`TRIAL_EXPIRED`).
- Security-Review: 1 Finding (Fehlerpfad hätte Signup abgebrochen) → behoben + Negativtest.
- Lokal 17/17 (`scripts/hufmanager-slim-trial-producer-tests.sql`), Negativkontrolle ohne Guard schlägt fehl.
- Live: frische Registrierung `+qa-trial` → `TRIAL_ACTIVE` bis 08.10.2026, `ACTIVE_TRIAL`.
- Neukunde vom 23.09. (`164d9860…`) per Producer freigeschaltet: `TRIAL_ACTIVE` 24.09.–08.10.2026.
- Rollback: `docs/backups/mig10_20260924120000_prestate_rollback_2026-09-24.sql` (lokal getestet, Writer-md5 zurück auf `d04fba66…`).
- Offen (nur gemeldet): 1 älterer Provider (`e228e26d…`, 14.01.2026) ohne Slim-Eintrag.

### Tenant-Smoke Production — PASS (24.09.2026)

QA A/B vorübergehend mit `plan_override='pro'` + Slim-Entitlement `ACTIVE` (`source=QA_MANUAL`) ausgestattet
(nur diese zwei User-IDs). Reproduzierbar: `scripts/ops/qa_tenant_smoke.py`.
- A und B laden je einen eigenen Testkunden ein → Rolle client, `created_by_provider_id` = Einlader,
  genau 1 aktiver eigener Grant, 0 fremde Grants, Kontakt nur beim Einlader, Pending Invite gebunden + verbraucht.
- A/B verwalten eigene Kunden (Grant/Kontakt/Profil lesen, Kontakt ändern).
- 36/36 Adversarial-Checks PASS: fremde Profile/Grants/Kontakte unsichtbar, Update/Delete fremder Rows wirkungslos,
  Grant-Diebstahl und gefälschter Grant 403, Invite-Tabelle 403, Invite-RPC direkt 403, Re-Invite fremder Kunden 409.
- Beobachtung P2: Provider kann Kontakt mit `profile_id` eines fremden Kunden anlegen (201), ohne Sichtbarkeitsgewinn.


### Nachtrag 24.09. abends — Invite-Fallback, Demo-Cleanup, finaler Smoke

- **Invite-Fallback live** (`invite-client-with-password` v9 + Frontend `992f9117`): Einmalpasswort verlässt den Server nie
  in einer API-Antwort; Mailversand 3× mit Resend-Fehlerauswertung; bei Fehlschlag `action:"resend"` → neues Passwort nur per Mail.
  Resend-Gate ausschließlich aus Serverfakten (auth.users `last_sign_in_at IS NULL` + Login-E-Mail, verbrauchter Pending Invite
  dieses Providers, eigener aktiver Grant). Security-Review: Takeover-Finding im ersten Entwurf gefunden, vor Deploy behoben, Nachprüfung CLOSED.
  Live 8/8 (eigener Kunde 200/Mail; fremder Kunde, Provider, sich selbst 403; ohne Pro 403; anon 401; kaputte ID 400).
- **Demo-Cleanup:** `create-demo-business-user` v32 und `create-demo-stallbetreiber-user` v5 → 410 + `verify_jwt=true`;
  Passwörter beider Demo-Konten auf unbekannten Zufallswert rotiert, Sessions/Refresh-Tokens gelöscht; alte (öffentliche) Passwörter → 400.
- **Finaler Production-Smoke PASS:** Tenant 36/36 (2. Lauf), Trial-Zugang, QA-Zugang, 410/401-Pfade, App 200;
  DB: 0 neue Fremd-Grants, 0 offene Issues, 0 offene Invites, Ledger `20260924120000`.
- **Offen:** CopeCart-Secret-Rotation (Pascal, Runbook), danach Webhook-Verifikation.
- **QA-Freischaltung** (Pro + Slim ACTIVE `QA_MANUAL`) für QA A/B ist noch aktiv (für Smoke nach Rotation); Rücknahme per
  `update profiles set plan_override=null …; delete from product_entitlements where source='QA_MANUAL'`.
- QA-Konten: A, B, `+qa-trial` (Trial-Test) sowie Testkunden `+qa-a-client1`, `+qa-b-client1`.


### Stand 24.09. spät — Owner-Entscheidung, QA-Cleanup, Kernflow-E2E (gestoppt)

**`SECRET_ROTATION = DEFERRED / RISK_ACCEPTED_BY_OWNER`** (Pascal, 24.09.2026): CopeCart/IPN erst vor wenigen Tagen
eingerichtet und getestet, kein belegter Secret-Leak, Payload-Logging behoben. Keine Rotation, keine Änderung im
CopeCart-Dashboard. Blockiert `SALE_READY` nicht mehr. Runbook bleibt für später.

**QA-Cleanup:** QA A/B ohne Pro/Slim (Override + `QA_MANUAL` entfernt), Testkunden A1/B1 inkl. Grants/Kontakte/Invites
gelöscht; QA-Konten bleiben. Danach: Grants 57, ACTIVE 35 (Ausgangsstand), 0 offene Issues, 0 verwaiste Profile.
Backup: `~/hufmanager-backups/20260924-qa-cleanup/`.

**Kernflow-E2E (Playwright, Production, QA-Trial-Provider mit regulärer Testphase):**
- Login ✅, Dashboard/Navigation ✅ (Heute, Tour, Kunden & Pferde, Finanzen, Mehr).
- Onboarding-Assistent hing im Schritt Business-Name → **behoben** (`2668a344`, live), im Browser verifiziert.
- Kunde anlegen ✅, nach Reload vorhanden ✅; **Doppelklick erzeugte 2 Kunden / 2 Pferde** → **behoben**
  (Submit-Lock `76679463`, live; Kunde/Pferd/Termin/Rechnung); Termin-Doppelklick auf Prod danach = 1 Termin.
- Termin anlegen: **STOP — Tenant-Leak P0** (s. u.). Tour, Doku, Material, Rechnung/PDF, Mobile: **NOT_TESTED**.
- E2E-Testdaten des Trial-Providers neutralisiert (Termin gelöscht, Pferde/Kontakte/Profile soft-deleted, Grants revoked).

**P0 (vorbestehend seit 11.02.2026): Leistungskatalog aller Provider für jeden eingeloggten Nutzer lesbar.**
- RLS `services`: Policy „Authenticated users can view active services“ = `auth.uid() IS NOT NULL AND is_active`.
- Messung: QA-Trial sieht 27 Leistungen von 12 fremden Providern inkl. Preis (0 eigene).
- Provider-Formulare laden `services` ohne Provider-Filter (`AppointmentFormModal`, `SlimFinanceScreen`,
  `EmergencyAppointmentSheet`, `QuickAddAppointmentFAB`, `Services`, `PriceGroupManagement` …) → fremde Leistungen auswählbar.
- **Echte Auswirkung:** 22 Termine von 5 echten Providern (seit 14.08.2026) verweisen auf Leistungen fremder Provider
  (+1 QA-Termin, entfernt). Risiko: fremde Preise in Terminen/Rechnungen, Offenlegung von Preislisten.
- Nicht durch Deploys vom 24.09. verursacht. Kein Fix ausgeführt (STOP-Regel). Folgeauftrag nötig.

Weitere Beobachtungen: RPC `get_product_membership_context` fehlt in Prod (404 bei jedem Seitenaufruf, nicht blockierend);
`send-push-notification` 403 nach Terminanlage; Hilfe-Tooltip überdeckt Termin-Dialogtitel.


### INCIDENT 24.09.2026 — Root Cause gefunden, Ballast entfernt (17:20 UTC), Erholung läuft

- **Root Cause:** pg_net-Worker (`pg_net 0.19.5`, Session seit 05.08.) räumt `net._http_response` per TTL-DELETE auf.
  Die Tabelle war auf 267 MB für 566 Zeilen aufgebläht (Autovacuum seit 05.08. nie gelaufen); der DELETE lief
  bis zu 26 min pro Durchlauf und belegte ~90 % der gesamten DB-Zeit (pg_stat_statements: 523.524 s). Phasen:
  23.09. ~16:00–01:00 UTC und 24.09. ab 10:40 UTC. Zusätzlich `cron.job_run_details` ohne Retention:
  373.248 Zeilen / 410 MB (pg_cron löscht nie; ~2.400 Läufe/Tag; Befehlstext inkl. Bearer-JWT pro Zeile).
- **Owner-Freigaben (Pascal, 24.09.):** `net.worker_restart()` + `TRUNCATE net._http_response` (16:44 UTC),
  `TRUNCATE cron.job_run_details` (17:15 UTC). Keine Geschäftsdaten betroffen. DB 865 MB → 188 MB.
- **Retention (neu):** Migration `20260924180000_add_cron_run_details_retention_v1` = eigener Cron-Job 24
  `purge-cron-job-run-details` (täglich 03:17 UTC, löscht > 7 Tage). Bestehende 16 Jobs unverändert.
  Rollback: `SELECT cron.unschedule('purge-cron-job-run-details');`
- **Stand 17:18 UTC:** REST noch 2–22 s (vereinzelt 500) trotz minimalem Traffic → Instanz erholt sich verzögert
  (Verdacht: aufgebrauchtes CPU-/IO-Burst-Guthaben). Weiter beobachten; falls keine Erholung: Compute im Dashboard prüfen.
- **Nebenbefund:** Job 20 und Job 21 rufen beide `hufi-routines-runner` auf (5 min + jede Minute) — nicht verändert.

#### Re-Check 24.09. 20:45–20:50 UTC (nach SSH-Abbruch) — KEINE Erholung → STOP für weitere Prod-Changes

- Ballast bleibt weg: `cron.job_run_details` 376 kB / 353 Zeilen (seit 17:18), `net._http_response` 112 kB / 138 Zeilen,
  DB 188 MB. Keine andere Tabelle aufgebläht (größte: `system_health_checks` 106 MB / 427k Zeilen, vacuumed).
  Job 24 `purge-cron-job-run-details` aktiv, erster Lauf 25.09. 03:17 UTC.
- Trotzdem: DB praktisch idle (keine aktive Query, keine Locks, 23 Backends von 60), aber triviale Queries 10–30 s
  (`count(*) from pg_stat_activity` 10 s, Größenabfrage 30 s), MCP-Verbindung zeitweise „connection timeout“.
- Cron seit 17:18 durchgehend 60–80 % `job startup timeout` (je 30-min-Slot 30–40 von ~50 Läufen), `net.http_post` dauert
  10–20 s statt ms. Postgres-Log: laufend `statement timeout`, `could not accept SSL connection: Connection reset by peer`.
- REST (anon, `services?limit=1`): 2,7 / 9,7 / 12,9 / 18,0 / 30,1 s, davon 2× HTTP 500. Auth-Health 0,07–6,9 s.
- Instanz ist klein (shared_buffers ~224 MB, max_connections 60 → Nano/Micro), Uptime 139 Tage.
- **Bewertung:** Ursache liegt jetzt nicht mehr in DB-Inhalten, sondern im Compute/IO der Instanz (gedrosselt oder degradiert,
  vermutlich aufgebrauchtes Burst-/IO-Budget nach tagelangem Voll-Last-DELETE). Braucht Dashboard: Reports → CPU/IO-Budget,
  ggf. „Restart project“ bzw. Compute-Upgrade. Kein Management-API-Token auf dem Server (`~/.supabase/access-token` fehlt),
  MCP bietet nur pause/restore → bewusst nicht genutzt.

#### INCIDENT GESCHLOSSEN — `INCIDENT_RECOVERY = PASS` (24.09. 21:32 UTC)

- Pascal hat das Projekt im Dashboard neu gestartet (Postmaster-Start 21:09 UTC).
- **Job 20 deaktiviert** (Owner-Freigabe, 21:24 UTC): `cron.alter_job(20, active := false)`, Kommando unverändert
  (md5 `01df2f3b…`), nicht gelöscht. Rollback: `select cron.alter_job(20, active := true);`. Job 21 aktiv.
- Messreihe 21:24–21:30 UTC (12× im 30-s-Takt): Auth 75–124 ms, REST 71–244 ms, alle 200.
- Cron seit Neustart: 0 Fehler, Läufe 60–200 ms (vorher 10–20 s); Job 21 läuft jede Minute erfolgreich.
- Logs ab 21:10: 0 statement timeouts, 0 cron startup timeouts, 0 SSL-Resets. 23× 503 nur in der Neustart-Minute 21:10
  (`hufi_routines`, `profiles` HEAD), danach keine 5xx.
- 21:32 UTC: `cron.job_run_details` 432 kB / 428 Zeilen, `net._http_response` 184 kB / 186 Zeilen → normales Wachstum.
- Lehre: Bereinigte Tabellen reichten nicht; die Instanz blieb bis zum Neustart gedrosselt. Beim nächsten Mal nach dem
  Aufräumen direkt neu starten. Offener Folgepunkt: Compute-Größe (Nano/Micro) und Disk-IO-Budget im Dashboard beobachten.

#### Claudia „App hängt sich ständig auf“ — Ursache + Frontend-Fix

- Ursache 1 (Hauptursache): DB-Incident oben (23.09. abends, 24.09. ab 10:40 UTC) → jede Anfrage 35–126 s / 504.
- Ursache 2 (Vermutung, im Smoke NICHT bestätigt): Tab-Wechsel innerhalb `/home/*` bauen `HufmanagerSlimAccessGate`
  nicht neu auf (React behält die Instanz; Smoke: 0 Zugangs-RPCs bei 6 Tab-Wechseln). Blockierende Vollbild-Loader gibt es
  nur beim App-Start/Reload und beim Wechsel zwischen verschiedenen `ProtectedRoute`-Top-Level-Routen (`ProductChoiceGate`,
  RPC `get_product_membership_context` = 404 in Prod, keine Schleife). Bei langsamer DB blockierten diese bis zur Antwort.
- Deploy `d717244a` (24.09. ~22:00 UTC): Ergebnis pro User-ID im Speicher, Remount rendert sofort und prüft still nach
  (`useHufmanagerSlimAccess.tsx`, `useProductMembership.ts`, Test `slimAccessCache.test.ts`). Wirkt nur bei Remounts,
  nicht beim ersten Laden. Hauptursache für Claudia bleibt der DB-Incident.
- Production-Smoke (QA-Trial, Playwright, 390×844): Login 1,2 s, 6 Tab-Wechsel ohne Vollbild-Loader, Reload 0,07 s → `/home`,
  Logout → `/auth`, `/home` ohne Session → `/auth`, Re-Login 0,4 s; Zugang `ACTIVE_TRIAL` bis 08.10.; 0 Page-Errors;
  einzige 4xx: 3× bekannter 404 `get_product_membership_context`.
- Tenant-Read (REST, QA-Trial-JWT): nur eigenes Profil + 3 eigene soft-gelöschte E2E-Kunden, 0 Pferde/Termine/Rechnungen,
  3 eigene revoked Grants. `services`: 27 fremde sichtbar = bekannter offener P0.
- **P1-Härtung (offen):** Beide Gates geben bei Lesefehler der Zugangsprüfung den Zugriff optisch frei (fail-open,
  vorbestehend). Kein Datenzugriff dadurch: `appointments`, `horses`, `invoices` haben RESTRICTIVE-Policies mit
  Slim-Entitlement-Prüfung, RPCs prüfen serverseitig. Ziel: bei Prüffehler „Zugang wird geprüft / Fehler beim Laden“
  mit Retry statt Freigabe.

#### Job 20 / 21 — Analyse

- Job 21 `routines-runner` (`* * * * *`) = kanonisch, aus Repo-Migration `20260513120000_hufi_routines_cron.sql`.
- Job 20 `hufi-routines-runner` (`*/5`) = in keiner Migration, manuell angelegt → Legacy-Duplikat. Gleiche URL, gleicher
  leerer Body, gleiche Aufgabe.
- `hufi_routines` hat **0 Zeilen** → beide Jobs tun fachlich nichts (1 SELECT pro Aufruf). 72 Aufrufe/h, davon 12 durch Job 20.
  Trägt nicht wesentlich zur Last bei (Hauptproblem ist jede Cron-Verbindung an sich, solange die Instanz lahm ist).
- Risiko bei künftigen Routinen: zur vollen 5-Minute laufen beide gleichzeitig ohne Lock → Doppelausführung/Doppel-Push möglich.
- Umgesetzt 21:24 UTC: Job 20 deaktiviert (nicht gelöscht), siehe oben.

#### Secrets in Cron-Commands (Security/Ops-Finding P1)

- JWT im Klartext im Authorization-Header der Jobs 8–14, 16–21 (8–14 ohne „Bearer“-Präfix) (Job 15 hat Platzhalter `SERVICE_ROLE_KEY` → läuft seit jeher mit ungültigem Token).
  Kein Job nutzt Vault. Der JWT landet zusätzlich in `cron.job_run_details` und via auto_explain in den Postgres-Logs.
- **Separater Folgepunkt, nicht im Incident umgesetzt.** Kleinster sicherer Fix (eigene Freigabe): Key einmal in `vault.secrets` ablegen, Jobs per `cron.alter_job` auf
  `(select decrypted_secret from vault.decrypted_secrets where name='cron_service_key')` umstellen; danach Key-Rotation
  gemäß bestehendem Rotations-Runbook. Kein Umbau im Incident.

#### Ursprüngliche Beobachtung (vor Root Cause)

- Symptome: Login 504 „upstream request timeout“ (1 von 3 Versuchen ok, ~18 s), `canceling statement due to statement timeout`,
  `cron job … job startup timeout`, triviale Systemqueries (pg_stat_activity) 12–13 s, eine Query ~500 s (Ende 10:54 UTC, Text nicht geloggt).
- Traffic unverändert (~40 Requests/5 min), keine Edge-Function-Spitze. Letzter Production-Write aus dieser Session ~09:10 UTC →
  kein zeitlicher Zusammenhang mit Deploys/Migrationen dieser Session erkennbar.
- Supabase meldet `ACTIVE_HEALTHY`. Neustart/Compute nur über Dashboard (kein CLI-Token; MCP bietet nur pause/restore → nicht genutzt).
- Nebenbefund P1: Cron-Job für `hufi-routines-runner` enthält einen Bearer-JWT im Klartext im `net.http_post`-Kommando;
  dieser erscheint in den Postgres-Logs (auto_explain).

### P0 Leistungskatalog — BEHOBEN (25.09.2026)

- Migration `20260924220000_scope_services_read_and_foreign_service_guard_v1` (Commit `cc4b5fe4`, md5 `e1da9f22…`),
  auf PROD per Transaktion inkl. Ledger-Eintrag; Ledger-md5 = Datei. Rollback:
  `docs/backups/mig11_20260924220000_prestate_rollback_2026-09-25.sql` (lokal geprüft: Policy-Diff 0).
- Lesen `services`: nur eigener Provider, aktiver Mitarbeiter (`is_employee_of_provider`), Kunde mit aktivem gültigem
  Grant (`has_active_access_grant`), Admin (`user_roles`) / Master-Admin (`master_admins`). Keine Metadata. Alte Policy entfernt.
- Schreibschutz-Trigger `hm_guard_service_owner_v1` auf `appointments`, `service_price_overrides`, `autoflow_settings`,
  `payment_products`: fremde service_id → 42501 „Leistung gehört nicht zu diesem Betrieb“, nur bei INSERT oder Änderung
  von Service-/Eigentümer-Spalte; gilt auch für service_role/RPC/Edge.
- Frontend (`cc4b5fe4`, live): `AppointmentFormModal` + `QuickAddAppointmentFAB` laden nur eigene Leistungen.
- Tests lokal 24/24 (`scripts/services-tenant-scope-tests.sql`), Negativkontrolle ohne Migration 8/24.
- PROD-Smoke (QA-Trial-JWT, REST): 0 fremde Leistungen sichtbar, eigene Leistung + Termin damit 201, fremde service_id bei
  Termin/Umstellung/Preis-Override 403/42501, Schnell-Termin ohne service_id 201; Alttermin für seinen Provider lesbar und
  bearbeitbar (Transaktion mit Selbst-Rollback). QA-Testdaten gelöscht. Browser-Smoke unverändert grün.
- Datenintegrität: 34 Leistungen / 296 Termine, md5 der 22 Alttermine und aller Leistungen vor = nach.
- 22 Alttermine NICHT verändert, Preise NICHT rekonstruiert → Owner-Entscheidung offen.
- Beziehungs-Check vor Apply: 1 Kunde verliert Sicht auf Leistungen eines Providers — Grant seit 14.08. revoked (beabsichtigt).
  Aktiver Mitarbeiter behält Sicht.
- **P2 Restrisiko:** Kunden legen Grants selbst an (Freigabe-Modell „Verbinden“). Wer sich als Kunde bei einem Provider
  verbindet, sieht dessen aktive Leistungen wie ein echter Kunde. Vorher sah jeder eingeloggte Nutzer alles.

### Golden Flow E2E + Release-Checks (Production, QA-Trial) — Stand 25.09.2026 ~00:45 MESZ

**Rechnungsnummer-Migration `20260910063819` — ANGEWENDET (Owner-Freigabe 25.09.)**
- Vorher `UNIQUE (invoice_number)` global, 11 Rechnungen, 0 Duplikate pro Provider. Nachher
  `invoices_provider_invoice_number_key UNIQUE (provider_id, invoice_number)`, Ledger-md5 = Datei (`52901df6…`),
  md5 aller 11 Bestandsrechnungen vor = nach. Rollback: `docs/backups/mig12_*` (nur solange keine Nummer doppelt über Betriebe).
- QA-Rechnung RE-2026-0003 (60 €, 1 Position) gespeichert; gleiche Nummer existiert bei anderem Betrieb (erlaubt).
  Duplikat im selben Betrieb → `invoices_provider_invoice_number_key` (Selbst-Rollback-Test). RE-2026-0001/0002 durch
  die beiden fehlgeschlagenen Versuche vor dem Fix verbraucht (Lücke, kein Refactor).
- PDF geprüft: Nummer, Kunde, Position, Netto 50,42 + 19 % 9,58 = 60,00 €. Gefixt + live (`84eefb13`): Kundenstraße fehlte
  (PDF las nur `stable_street`), Rechnungsdatum-Default war UTC-Datum (nach Mitternacht MESZ = Vortag).
- P1: Absender-Pflichtangaben (Adresse, Steuernummer, IBAN) fehlen im PDF, wenn der Betrieb sie nicht hinterlegt hat —
  kein Hinweis/Gate vor Rechnungserstellung. P2: Spalten „Pos.“/„Menge“ im PDF zu schmal (Text bricht vertikal).

**Golden Flow (RESPONSIVE_BROWSER, Playwright 390×844):** Login ✅ → Kunde ✅ → Pferd ✅ → Termin ✅ → Tour starten ✅ →
Abschluss/Doku „Alles gut“ ✅ (`completed`) → Rechnung ✅ → PDF ✅ → Reload ✅ → Logout/Login ✅. Material: NOT_TESTED.
Termin ohne eigene Leistung → Standardvorlage 0 €, service_id leer (korrekt nach P0; UX-Lücke für Betriebe ohne Leistungen).

**Mobile/PWA (RESPONSIVE_BROWSER, Pixel-7-Emulation; REAL_DEVICE: NOT_TESTED):** 7 Screens ohne horizontales Überlaufen,
kaum Mini-Tippflächen (nur Karten-Zoom/Attribution); Manifest installierbar (standalone, start_url /home, Icons 72–512 +
maskable); Service Worker aktiv + kontrolliert. **Offline-Kaltstart geht nicht** (`navigateFallback: null`, HTML bewusst
nicht gecacht gegen veraltetes Routing) → P1-Entscheidung (NetworkFirst mit Timeout + Fallback). Manifest wird als
`application/octet-stream` ausgeliefert; `theme_color` Manifest #0a0700 ≠ Meta #FF6A00 (P2).

**Claudia:** Account gesund (provider, TRIAL_ACTIVE bis 08.10., nicht gesperrt, 2 gültige Sessions, Daten vorhanden).
Fehler nur in Incident-Fenstern (500/504 bis 129 s). Außerhalb: bekannter 404 Membership-RPC, 7× 400 Partner-Notizen.
Keine Request-Schleife (1–2 Requests/min). → Ursache = DB-Incident; kein account-spezifischer Fehler.

**Signup / E-Mail / Trial:**
- **E-Mail-Bestätigung auf PROD AUS**: 7/7 Signups der letzten 30 Tage nach 0,4 s „bestätigt“, nie eine Mail verschickt.
  App ist vorbereitet (Toast „Bitte bestätigen“, `emailRedirectTo` /home). Einschalten nur im Dashboard
  (Auth → Sign In/Providers → Email → Confirm email) — kein Management-Token auf dem Server. Bestehende Accounts sind bereits
  bestätigt → werden nicht ausgesperrt.
- Rolle: `admin` nur aus `raw_app_meta_data`; aus `user_metadata` nur client/provider → OK.
- **Trial-Trigger prüft `signup_app` nicht** → künftige HufiApp-Provider bekämen HufManager-Slim-Trial (aktuell 0
  HufiApp-Provider in dieser DB). Kleinster Fix: Trigger nur bei `signup_app IS DISTINCT FROM 'hufiapp'` → braucht Freigabe.

**Kleinere Befunde:**
- `get_product_membership_context` 404: Splitter-Migration nie angewendet; seit `d717244a` höchstens 1 Aufruf pro Sitzung,
  keine Schleife, Zugang wird durchgelassen (P2).
- Push nach Termin 403: gewollt (Function erlaubt Push nur an sich selbst); Client-Push bräuchte serverseitigen Versand (P2).
- `partner_treatment_notes`: Frontend fragt Spalten `follow_up_date`, `treatment`, `recommendations` ab, die in PROD fehlen
  → 400, Partner-Notizen in der Pferdeakte leer (P2).
- „Termin planen“ springt aus Slim-Shell nach `/kalender` (P2). Termin-Tooltip über Titel: NOT_RETESTED.
- QA-Daten im QA-Tenant: Kunde „QA GoldenFlow“, Pferd „QA Goldie“, 1 Termin (completed), Rechnung RE-2026-0003.

#### Ursprüngliche Analyse (vor Fix)

- Ungefilterte Provider-Lesepfade: `AppointmentFormModal` (Z. ~193), `QuickAddAppointmentFAB` (Z. ~81). Alle anderen filtern auf `provider_id`.
- Legitime Fremdlesung: `ClientBooking` (Provider über aktiven Grant), Admin. Landing/Widget laden anonym → sehen schon heute nichts.
- `created_by_provider_id` ist KEIN geeigneter Anker (selbst editierbar) → neue SELECT-Regel nur über aktiven Grant / Employee / Admin.
- Tabellen mit Referenz auf `services`: appointments.service_id, payment_products.service_id, autoflow_settings.default_service_id,
  service_price_overrides.service_id, service_price_history.service_id, partner_appointments.service_id.
- Geplanter Schreibschutz: Trigger, der eine fremde `service_id` nur bei INSERT oder bei Änderung von service_id/provider_id ablehnt
  (die 22 Bestandstermine bleiben unverändert bearbeitbar).

## 4. Billing / CopeCart (Stand 24.09., korrigiert)

- **CopeCart-IPN-URL laut Pascal:** `https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/copecart-webhook`.
- `COPECART_ENTRYPOINT=USER_CONFIRMED` (Pascal, 24.09.).
- **Writer-Frage beantwortet (Code-Beleg):** `copecart-webhook` übergibt **nicht** an
  `hufi-data-core`, es schreibt selbst (`profiles`, `product_entitlements`,
  `saas_billing_events`, `admin_revenue_log`, `admin_invoices`, Voice-Credits-RPC).
  `hufi-data-core` schreibt über `hufi_data_ingest_and_project_v1`.
  `CANONICAL_BILLING_WRITER=UNRESOLVED` bleibt, bis Pascal die Zuständigkeit je Produkt festlegt.
- **Log-Evidenz 11.09.2026 20:06:19 UTC:** dieselbe IPN traf **beide** Endpoints —
  `hufi-data-core` → **200**, `copecart-webhook` → **401** (Retries 21:18, 22:30 ebenfalls 401).
  CopeCart ist also (mindestens zeitweise) mit zwei Zielen konfiguriert.
- Ursache 401: deployte `copecart-webhook` **v164** erwartet ein Passwort **im Body**;
  CopeCart sendet eine **HMAC-SHA256-Signatur im Header `X-Copecart-Signature`**
  (bewiesen durch den 200 von `hufi-data-core`, das genau so prüft).
  ⇒ v164 verarbeitet faktisch **keine** echte IPN.
- **v164 loggt das komplette Payload inkl. Käufer-PII vor jeder Prüfung** (Z. 482) und
  vergibt bei unbekannter Produkt-ID `|| 'pro'` (Z. 136). Sicherung der deployten Fassung:
  `~/hufmanager-backups/20260924-081933-pre-invite-p0-deploy/functions/copecart-webhook/`.
- Repo-Fassung (`bcc3342d`): HMAC, keine Payload-/PII-Logs, zentrale Allowlist fail-closed,
  Laufzeit-Check PASS. **Nicht deployt.**
- **Doppel-Writer-Risiko:** Repo-`copecart-webhook` (SaaS-Zweig) und `hufi-data-core`
  (`hm_project_hufmanager_entitlement_v1`) schreiben beide `product_entitlements` für Slim
  `3a97bd25`. Heute harmlos, weil v164 alles abweist; nach Deploy des Fixes aktiv.
  → Entscheidung Pascal nötig, welcher Endpoint für welches Produkt kanonisch ist.
- Secrets: `hufi-data-core` nutzt `COPECART_DATACORE_SECRET || COPECART_IPN_PASSWORD`.
  Welches gesetzt ist, ist ohne CLI-Login nicht prüfbar. Bei Rotation beide berücksichtigen.
- Daten: `hufi_data_events` 2 (letztes 11.09.), `product_entitlements` HUFMANAGER 35 ACTIVE / 1 LOCKED.

### Weitere Security-Befunde 24.09.

- Repo `passaondigital/hufmanager` ist **öffentlich**.
- `create-demo-business-user` (Prod, `verify_jwt=false`, kein Caller-Check) enthält
  Klartext-Zugangsdaten eines Provider-Demo-Kontos (angelegt 16.03., letzter Login 23.03.,
  nur Client eines inaktiven Grants). Passwort steht öffentlich in der Git-History →
  **kompromittiert, Rotation/Sperre nötig**. Repo-Fassung: 410 Gone (`bcc3342d`), nicht deployt.
- Invite: Einmalpasswort jetzt aus `crypto.getRandomValues`, 12 Zeichen, Rückgabe nur bei
  fehlgeschlagener Mail (`bcc3342d`), nicht deployt.

## 5. Testevidenz (24.09.2026, HEAD `7a13d19b`)

```
git diff --check (23 Commits)            PASS
vitest                                   21 Dateien, 300/300 PASS
tsc -p tsconfig.app.json                 131 Diagnosen = bekannte Baseline, 0 neue
deno check invite-client                 PASS
deno check invite-client-with-password   PASS
deno check admin-create-client           PASS
Secret-Scan über 23 ungepushte Commits   0 Treffer
```

## 6. Backup / Rollback

| Artefakt | Ort | Stand |
|---|---|---|
| DB Schema + Data Dump | `~/hufmanager-backups/20260920-211950-pre-hufmanager-release/db/` | 20.09., **vor** #1–#9 |
| Webroot vor Release | `…/20260920-211950-pre-hufmanager-release/webroot/app-before` | 12.09.-Build |
| Edge vor Invite-Deploy | `~/hufmanager-backups/20260924-081933-pre-invite-p0-deploy/` | 24.09., v7/v8/v117 wörtlich + SHA256SUMS |
| Per-Migration-Rollback | Ledger-Doku, Abschnitte „Rollback-Pfad" je Nachtrag | 21.09. |
| Restore-Drill | `~/prod-db-backup-drill/` | 11.09. — **seitdem kein Restore-Test** |
| Storage-Backup | — | **nicht vorhanden/nicht gefunden** |
| Offsite-Kopie | — | **nicht belegt** |

Frontend-Rollback nach erstem Deploy: `./deploy.sh hufmanager --rollback` (Symlink `previous`).

## 7. Nicht tun

- kein `supabase db push`
- keine Ledger-„Reparatur" ohne separate Freigabe (Weg B)
- keine `_prepared`-Migration anwenden
- keinen DNS-/Proxy-Umbau als Nebeneffekt
- Edge-Functions nur namentlich deployen, nie pauschal

Release-Gates und Next Steps: `docs/HUFMANAGER_RELEASE_GATES.md`.

## 25.09.2026 — Trial-Begrenzung, P0 Cross-User-Cache, E-Mail-Bestätigung (Vorbereitung)

**Trial-Begrenzung — LIVE:** Migration `20260925080000_limit_slim_trial_to_hufmanager_signup_v1` (Commit `79be9b9a`),
PROD per Transaktion inkl. Ledger (Ledger-md5 = Datei `992b8767…`, Body `d9eefa70…`). Auto-Trial nur bei
`profiles.signup_app = 'hufmanager'` (fail-closed). Tests 23/23 lokal, Negativkontrolle 18/23. PROD: API-Signup HufManager →
`TRIAL_ACTIVE` 14,000 T.; API-Signup `signup_app=hufiapp` → kein Entitlement; UI-Signup (`+qa-ui-0925`) sendet
`signup_app=hufmanager`, Trial aktiv, Login/Reload/Logout/Re-Login PASS. Rollback: `docs/backups/mig13_*`.

**P0 Tenant-Isolation (manueller Test Pascal) — BEHOBEN + PROD-verifiziert:**
- Session: Hauptkonto `99e50f7f` 07:56 UTC, danach Demo-Konto `ecb7497b` 08:01 UTC im selben Browser ohne Logout.
- Helga/Balu/Ginebra/Milow gehören 2 Kunden des Hauptkontos (aktive Grants nur zu `99e50f7f`); Demo-Konto hat keine Beziehung.
- DB/RLS: Demo-Konto sieht unter RLS 0 dieser Pferde, 15 eigene (alle mit aktivem Grant an `ecb7497b`, inkl. Akex/Alex/micky
  „Mia Berger“, Finn, HM-SENTINEL, QA_PO, Fenja-Hope) → **kein DB-Leak**.
- Ursache: TanStack-Query-Cache wird in IndexedDB persistiert und beim Start ohne Besitzer-Bindung wiederhergestellt; beim neuen
  App-Einstieg (`/`, `/auth`) werden nur Auth-Tokens gelöscht. Termin-Dialog `["horses-with-price-group"]` / Schnell-Termin
  `["horses-quick-add"]` ohne User-ID + staleTime 5 min → fremde Pferdeliste. „Kunden & Pferde“ nutzt Key mit User-ID.
- Reproduziert auf PROD mit QA `+qa-trial` → `+qa-ui-0925` (Pferd „QA-LeakProbe“ im QA-Tenant angelegt).
- Fix `afb43d95` + `25d88773` (deployt, previous = `84eefb13`): Cache an uid gebunden, Besitzer-Marker persistent, Wechsel leert
  Query-Cache + IndexedDB (Sync-/Bild-Queues) + unscoped localStorage (Mitarbeiter-Notizbuch, Arbeitszeit); Queues nur für Besitzer.
- Tests: vitest 332/332, tsc Baseline 131, Negativkontrolle alter Persister 5/5 FAIL. PROD: A/B neuer Einstieg + Logout: 0 Leak,
  12 Bereiche gesweept: 0 Leak; Reload behält eigenen Cache.
- Termin Fenja-Hope `25de12f1`: Provider/Kunde/Pferd/Leistung/Grant konsistent, 1 Datensatz. Meldung „Kunde konnte nicht
  ermittelt werden“ = Speicher-Guard (bricht ab, kein Datensatz), ausgelöst durch veraltete Pferdeliste.
- 30 Tage: 0 Termine mit Pferd ohne Grant zum Provider.
- **P1 offen:** `appointments` INSERT prüft nur `provider_id = auth.uid()`, nicht Pferd/Kunde ↔ Provider → DB-Guard vorbereiten.
- Security Review: keine Findings ≥8 nach Folgefix; Hinweise: Cross-Tab-Auth-Broadcast (P2), weitere Keys ohne uid (Hygiene).
- QA-Artefakte: QA A Kunde „QA LeakProbe Kunde“ (`66c99e4e`, kein Pferd), QA-Trial Kunde `dac2f06e` + Pferd `412f484e`.

**E-Mail-Bestätigung — vorbereitet, NICHT aktiv:** `mailer_autoconfirm=true`. 11 unbestätigte Konten haben sich nie eingeloggt
(7 Demo, 4 Alt) → niemand Aktives wird ausgesperrt. Flow `implicit`, Redirect `app.hufmanager.de/home` wird akzeptiert,
GoTrue-Default-Redirect (Site URL) wirkt wie `hufiapp.de`. Signup-Daten überleben jetzt neuen Tab (`pendingSignup`, an E-Mail
gebunden, 7 T.). SMTP-Konfiguration nicht prüfbar (kein Management-Token) → Dashboard-Check nötig.

**Weitere Befunde:** Betriebsname aus Signup-Schritt wird nie gespeichert (`hm_pending_business_name` ohne Consumer, P2);
neue Provider ohne Standard-Leistungen (`create_default_service_presets` → 0 Services, P2); `/management/abo` zeigt Legacy-Status.

## 25.09.2026 abends — Auth-Routing-Audit HufManager / HufiApp (vor „Confirm email“)

**Korrektur der Annahme „gleiches Supabase-Projekt“:** Das live unter `hufiapp.de` ausgelieferte Frontend
(nginx → `/srv/hufi/hufiapp/repo/dist`, Repo `passaondigital/hufiappde`, Bundle `index-75c17AwV.js`) spricht mit
Supabase **`oortmejcefbiewaceccc`**, nicht mit `vnschgjxkzzwzefqlrji`. Auf `vnschg…` laufen: `app.hufmanager.de` (live),
`preview.hufiapp.de` (Build 06.08.) und der tote Alt-Build `/srv/hufi/business/hufiapp/app` (nginx-Konflikt, nicht ausgeliefert).
`app.hufiapp.de` zeigt auf 85.13.137.120 mit ungültigem Zertifikat. Nutzer in `vnschg…`: 61 ohne `signup_app`, 8 `hufmanager`,
2 `hufiapp` (1 QA 25.09., 1 echter vom 08.08.).
⇒ Die Site URL `https://hufiapp.de` von `vnschg…` ist als Fallback **doppelt falsch**: Links landen in einer App mit anderem Backend
(Token wird dort nicht erkannt → Nutzer „nicht eingeloggt“).

**Mail-Templates (empirisch, echte Mails an QA-Adressen, Absender `team@hufmanager.de` via Resend):**
- Reset password: `{{ .ConfirmationURL }}` → `…/auth/v1/verify?…&type=recovery&redirect_to=https://app.hufmanager.de/reset-password` ✅;
  ohne `redirect_to` → `redirect_to=https://hufiapp.de` (Beleg für Fallback).
- Magic link: `{{ .ConfirmationURL }}`, Betreff „Ihr Login-Link für HufManager“, `redirect_to=https://app.hufmanager.de/home` ✅.
- Confirm signup / Invite / Change email / Reauthentication: **nicht prüfbar** (kein Management-Token; Autoconfirm verhindert Mail).
- Link-Klick (Token-Einlösung) nicht ausgeführt — bleibt Pascal-/Post-Enable-Test.

**Code HufManager (Frontend):** `signUp` (`useAuth` → `/home`), Reset (`/reset-password`), Admin-OTP, Botschafter setzen
`window.location.origin` ✅. **Fehler:** `ConnectForm` (`/connect/:slug`, 10 aktive Magic-Links, 0 Nutzungen) ohne
`emailRedirectTo` und ohne Bestätigungs-Zustand → **gefixt `1d1d33fe`** (Redirect `/client-home`, Hinweis „Bitte bestätige deine
E-Mail“), Guard-Test `authRedirectGuard.test.ts` (Negativkontrolle: alter Stand FAIL). vitest 333/333, tsc 131 = Baseline.
**NICHT deployt** (Deploy braucht Freigabe).
Nicht genutzt im Frontend: Email-Change (`updateUser({email})`), Reauthentication, `inviteUserByEmail`.

**Edge-Functions (eigene Resend-Mails, unabhängig von Confirm email):**
- `admin-create-user` v132 + `send-provider-invitation` v110: `generateLink(magiclink)` mit `redirectTo: https://hufiapp.de/auth`
  → Provider landet in fremder App (P1, nur Admin-Pfad) — **behoben 28.09. (v133/v111)**.
- `send-employee-invitation` v94: `APP_URL || https://app.hufiapp.de` (Zertifikat ungültig; Secret-Wert unbekannt) (P1) — **behoben 28.09. (v95)**.
- `send-partner-invitation` v81: `APP_URL || https://hufiapp.de` (P2); `send-client-invitation`: Origin-Header, Fallback hufiapp.de (P2).
- `copecart-webhook` Repo-Fassung `inviteUserByEmail` → hufiapp.de/auth; live v165 ack-only → derzeit tot.

**Termin-DB-Schutz (Pferd/Kunde ↔ Provider): NICHT umgesetzt** — auf `appointments` nur `trg_hm_guard_service_owner_v1`.

**Infra-Nachtrag:** DB 194 MB; `cron.job_run_details` 2.321 Zeilen/2,3 MB (Job 24 lief 25.09. 03:17); 0 Cron-Fehler seit Neustart
(169 Fehler/24 h alle ≤ 24.09. 21:05 UTC); `net._http_response` 2,8 MB, `last_autovacuum` weiterhin 05.08. → beobachten.

```
SAFE_TO_ENABLE_CONFIRM_EMAIL = NO (bis Deploy 1d1d33fe) → danach YES mit Template-Sichtprüfung + QA-Signup direkt nach Aktivierung
```

### Deploy + Production-Verifikation 25.09. ~22:15 MESZ
- Frontend `6cd8715b` (= Fix `1d1d33fe` + Doku) via `./deploy.sh hufmanager`, previous `25d88773`; Deploy-Smoke 0 Errors;
  `ConnectForm-DaNnDvmT.js` enthält `emailRedirectTo: …/client-home` + Confirm-Hinweis.
- Playwright PROD: Login/Reload/Logout/`/home` ohne Session → `/auth`/Re-Login PASS, 0 Page-Errors; Same-Tab-Wechsel (Neu-Einstieg + Logout)
  0 Leak bei Positivkontrolle, 12-Bereiche-Sweep 0 Leak; UI: Kunde „QA Verify0925“ + Pferd „QA VerifyHorse“ (Reload ✓) + Termin 201
  (Provider/Kunde/Pferd/Grant konsistent, 1 Datensatz, ohne Leistung); UI-Signup `+qa-ui-0925b` → provider, `hufmanager`, TRIAL_ACTIVE bis 09.10.
- `mailer_autoconfirm=true` (Confirm Email AUS), Site URL unverändert.
- Termin-DB-Guard: NICHT live, NICHT als Datei vorbereitet. Datenlage: 301 Termine; 254 Alt-Termine (bis 14.08.) ohne `client_id`
  (253 mit Grant-Historie Pferdebesitzer↔Provider, 1 ohne); wo `client_id` gesetzt: 0 Abweichung Pferd↔Kunde, 1 ohne aktiven Grant.

## 27.09.2026 — Resume nach 48 h: Stand verifiziert, Termin-Guard vorbereitet, hufi-agent-BOLA gefunden

Details: `docs/HUFMANAGER_SECURITY_FOLLOWUP_2026-09-27.md`. Kein PROD-Write, kein Deploy.
- Stand unverändert zu 25.09. (Frontend `6cd8715b`, Ledger `20260925080000`, Edge-Versionen gleich, Confirm Email AUS, DB stabil, Job 20 aus / 21 an).
- `net._http_response` 9 MB / 150 Zeilen, Autovacuum seit 05.08. nie → beobachten (P1).
- Termin-DB-Guard `20260927120000_add_appointment_relation_guard_v1` fertig: 39/39, Negativkontrolle 19/39, Apply+Rollback geprobt → wartet auf Apply-Freigabe.
- **P0 (Release-Blocker): Live-`hufi-agent` v40 BOLA** — fremde Termine änderbar/stornierbar, fremde Pferdeakten/Kundendaten lesbar, Push an beliebige Nutzer.
  Hotfix v41 `scripts/ops/edge-hotfix/hufi-agent-v41/` (21/21, Negativkontrolle 2/21) → wartet auf Deploy-Freigabe.

### 27.09. abends — Security-Deploys LIVE (Owner-Freigabe)
- `hufi-agent` **v41 live** (SHA256 = Repo). PROD-Tooltest 19/19. Befund: Assistent live funktionslos (Anthropic-Guthaben leer, Ollama 405).
- Termin-DB-Guard **live**, Ledger `20260927120000`, PROD-Tests 9/9 REST + 7/7 SQL (Rollback), Bestandsdaten unverändert.
- Designbefund: Hauptkonto ist Master-Admin → Admin-Ausnahme des Guards greift im Betriebsalltag (v2-Vorschlag).
- 108 Termine getrennter Kunden: 0 aktive Zukunftstermine (38 zukünftige schon am 28.07. abgesagt), 54 alte offene.
- Details: `docs/HUFMANAGER_SECURITY_FOLLOWUP_2026-09-27.md` Abschnitt 4.

### 28.09. — Live-Lücken geschlossen (Owner-Freigabe)
- net-Retention `20260927180000` live (Jobs 25/26, Erstlauf ok), Ghost-Grant-Fix `20260928090000` live (PROD 9/9),
  Termin-Guard-Admin-Nachbesserung `20260928100000` live (PROD 7/7, Regression 45/45). Ledger `20260928100000`.
- Security-/Production-Smoke 38/38. Bestandsdaten unverändert (Grants 71, Termine 301, md5 vor = nach).
- Unverändert offen: Assistent live funktionslos (Anthropic-Guthaben), Confirm Email AUS, ~~Auth-Routing-Fixes (Edge-Redirects hufiapp.de)~~ → **behoben**, s. u. (v133/v111/v95).
- Details: `docs/HUFMANAGER_SECURITY_FOLLOWUP_2026-09-27.md` Abschnitt 6.

### 28.09. mittags/nachmittags — Assistent ausgeblendet, Auth-Routing-Fix LIVE (Owner-Freigabe)
- Frontend `84d7d45d` live: Hufi-Assistent per `FEATURE_FLAGS.hufiAssistant=false` ausgeblendet.
- Edge-Deploy nur namentlich (verify_jwt unverändert): `admin-create-user` **v133**, `send-provider-invitation` **v111**,
  `send-employee-invitation` **v95** (Code `9f6c129d`). Magic-Links → `https://app.hufmanager.de/reset-password`,
  Mitarbeiter-Link → `https://app.hufmanager.de/employee-invite?token=…`, Token-Logging entfernt.
  Rollback: `git show 9f6c129d~1:supabase/functions/<name>/index.ts`.
- **E2E PROD:**
  - `admin-create-user`: Admin-UI (Pascal) → QA-Provider `+qa-prov-0928`; Function-Log 09:38:56Z „Admin … creating provider …
    usePassword: false“ → „Sending custom provider invitation email…“ → Resend `error: null`; Resend-Status DELIVERED;
    Link `type=magiclink&redirect_to=https://app.hufmanager.de/reset-password` (extern verifiziert). **PASS**
  - `send-employee-invitation`: QA-A → QA-Mitarbeiter → Mail mit `app.hufmanager.de/employee-invite?token=…`, Seite zeigt Einladung
    (nicht angenommen, Testdatensatz gelöscht). **PASS**
  - `send-provider-invitation`: v111 deployt, aber **kein Aufrufer** im Frontend-Quellcode/Live-Bundle → per UI nicht auslösbar;
    E2E = N/A (Negativtest 403/401 PASS). Entscheidung offen: Function entfernen oder UI-Aufruf („Einladung erneut senden“) bauen (P2).
  - Function-Logs 09:10–jetzt: kein Einladungslink/Token (nur `Employee invitation prepared { employeeId }`). Login/Reset/Signup-Settings
    PASS, `mailer_autoconfirm=true`, Security-Smoke 38/38.
- **Supabase-Projekte (verifiziert: Live-Bundles, `.env`, nginx):** HufManager `vnschgjxkzzwzefqlrji`, HufiApp `oortmejcefbiewaceccc`
  → **getrennte Auth-Projekte** (Annahme „gleiche Instanz“ ist falsch).
- **Neue Befunde (28.09.):**
  - **P1 Admin-angelegte Provider ohne Slim-Entitlement:** `admin-create-user` setzt kein `signup_app` → Trial-Trigger
    (nur `signup_app='hufmanager'`) greift nicht → kein `product_entitlements`-Eintrag, `_hm_has_hufmanager_access_v1 = false`.
    Auswirkung auf Nutzbarkeit noch nicht geprüft. Nichts mutiert.
  - **P1 Mission Control zeigt Legacy-Felder:** „Plan Starter / Status trialing“ = `profiles.subscription_plan/subscription_status`
    (Spalten-Defaults `'starter'`/`'trialing'`, `trial_ends_at` Default +30 Tage) — nicht die Slim-Wahrheit (`product_entitlements`,
    19,95 €/Monat, 14 Tage). „Preis 45 €“ = `services.base_price` der im Admin-Formular angelegten Leistung „Barhufbearbeitung“,
    **kein Abo-Preis**. Kein falscher Billing-State gespeichert; nur irreführende Anzeige.
  - **P1 Branding:** Provider-Mails (`admin-create-user`, `send-provider-invitation`) nennen `support@hufiapp.de`.

### 28.09. abends — Admin-Provider ↔ Slim-Trial: Fix VORBEREITET (nicht PROD)
- Root Cause: `admin-create-user` übergibt kein `signup_app` im Auth-Insert → Trial-Trigger (nur `signup_app='hufmanager'`) greift nicht;
  späteres Profil-Update zu spät. Fix: `user_metadata.signup_app='hufmanager'` nur bei Standard-Anlage (ohne planOverride),
  kanonischer Writer `hm_start_hufmanager_slim_trial_v1` über bestehenden Trigger. DB-Tests 19/19 (Negativkontrolle 9/19),
  Edge-Guard 4/4, vitest 347/347. Details + Plan-Override-Matrix: `docs/billing/ADMIN_PROVIDER_SLIM_TRIAL_2026-09-28.md`.
- Offen P1 (Business-Entscheidung): Override-Pläne (lifetime/manual/copecart/beta/employee) erhalten bei Admin-Anlage **kein** Entitlement.

### 28.09. abends — Admin-Provider ↔ Slim-Trial: Fix LIVE, PROD-E2E PASS
- `admin-create-user` **v134** = `e78f6c17` deployt (Owner-Freigabe), Live-Code gegen Repo geprüft; OPTIONS 200 / ohne JWT 401.
- Post-Fix-QA `+qa-trial-admin-0928c` (Mission Control, Standard, ohne Passwort): `signup_app=hufmanager`, genau 1 Slim-Entitlement
  TRIAL_ACTIVE/ACTIVE/NONE, exakt 14 Tage (bis 2026-10-12 14:04:58Z), genau 1 `trial_started` vom kanonischen Writer,
  Zugang true; Passwortsetzung + Login + Reload PASS; danach kein 2. Trial, `trial_ends_at` unverändert.
- Pre-Fix-Beleg `+qa-trial-admin-0928` (v133) bewusst unverändert: kein `signup_app`, kein Entitlement, kein Zugang.
- **P1 Standard-Admin-Provider ohne Trial → DONE.** Weiter **offen P1:** Override-Pläne ohne Entitlement (Business-Entscheidung);
  Mission Control zeigt Legacy-Plan/Service-Preis; `support@hufiapp.de` in Provider-Mails; **neu:** Provider-Einladungsmail
  (`info@hufmanager.de`) kommt trotz Resend-OK nicht in Gmail an.
- Details: `docs/billing/ADMIN_PROVIDER_SLIM_TRIAL_2026-09-28.md` (Abschnitt PROD-Verifikation).

### 28.09. abends — Override-Entitlements / Manual Access: Audit + Fix VORBEREITET (nicht PROD)
- PROD read-only: Override-Provider = 1 lifetime, 2 manual_cash_1y, 1 copecart_pro, 1 copecart_starter; beta/employee/duo/team/Legacy-CopeCart = 0.
  8 weitere `lifetime_grant`-Profile sind keine Provider (kein Slim nötig).
- Befunde: Gate prüft bei ACTIVE kein Enddatum → Barzahlungs-Kunden (Ende 2027-01/02) laufen nie ab; Backfill markierte Manual-Grants
  als VERIFIED_PAID; copecart_pro-VERIFIED_PAID beruht nur auf Subscription-ID + Testzahlung; 28 Standard-Provider dauerhaft ACTIVE
  nur wegen Legacy-`subscription_status='active'` (AMBIGUOUS_ACTIVE_ONLY). Kein Profilstring gibt heute direkt Zugang.
- Fix lokal: Migration `20260929090000` (Manual-Access-Writer + Admin-Wrapper + Ablauf im Gate für `billing_provider='manual'`),
  Tests `scripts/hufmanager-manual-access-tests.sql` 50/50, Trial-Regression 19/19, vitest 347/347. Lokal angewendet, PROD unberührt.
- Wartet auf Owner-Entscheidungen (Matrix, Beta-Modell, Einzelfälle) und PROD-Freigabe. Bericht:
  `docs/billing/OVERRIDE_ENTITLEMENTS_AUDIT_2026-09-28.md`.

### 28.09. nachts — Owner-Matrix Override-Entitlements umgesetzt (LOKAL, NICHT PROD)
- Owner-Regeln: Standard=Trial · Lifetime=MANUAL_LIFETIME · Barzahlung=MANUAL_FIXED_TERM (Ende Pflicht) · Beta=Variante B
  (Ende Pflicht) · Employee kein Provider-Plan · Legacy-CopeCart ausgeblendet · 28 Standard-Altprofile GRANDFATHER TEMPORARILY.
- Lokal gebaut: Writer/Wrapper final, `admin-create-user` angebunden (Plan-Whitelist vor Anlage, Enddatum-Pflicht, Grant mit Akteur),
  Mission Control Anlage + Bearbeiten bereinigt, P2-Härtung Profil-Billing-Felder (`20260929100000`). God-Mode `AdminUserDB`
  noch mit Legacy-Planliste (nur Profilfelder, ohne Zugangswirkung) → P2.
- Tests: Manual-Access 59/59, Härtung 7/7 (Negativkontrolle 4/7), Trial 19/19, vitest 358/358. PROD unverändert.
- Bestand: SAFE_MANUAL_FIXED_TERM 2 · MANUAL_REVIEW 2 (Lifetime ohne Beleg; copecart_pro nur Testzahlung) · GRANDFATHER 28 (+3 Alt-Trial)
  · UNKNOWN 1 · DO_NOT_MIGRATE 8. Details `docs/billing/OVERRIDE_ENTITLEMENTS_AUDIT_2026-09-28.md` §12–14,
  Architektur/Rollback `docs/billing/MANUAL_ACCESS_WRITER_ARCHITECTURE.md`.

### 28.09. ~20:45 — Manual-Access-Writer + Profil-Härtung LIVE (PROD vnschgjxkzzwzefqlrji)
- Pre-Deploy (frisch): Manual-Access 72/72 (inkl. Winter/Sommer/DST D1–D7, T06a/b 1 s vor/an Grenze), Härtung 7/7,
  Trial-Regression 19/19, vitest 363/363, deno check admin-create-user PASS, tsc 0 Fehler in geänderten Dateien (131 Baseline).
- PROD-Vorzustand = Rollback-Doku (Gates-md5, 42 Entitlements md5 da5543de, 0 manual).
- A/B: `20260929090000` per kanonischem Apply-Skript (md5-Guard 32b429ca, Ledger-Version exakt); 6 Funktionen md5 = lokal getestet;
  Grants: Kern nur service_role, Wrapper authenticated, anon nein; Entitlements unverändert.
- C/D: `20260929100000` (md5 de4643ac); `prevent_billing_self_update` md5 c25b2d08 = lokal; Trigger BEFORE UPDATE aktiv.
- E/F: `admin-create-user` **v135** (Stand ae2c7861), Rücklese inhaltlich = Repo, OPTIONS 200, ohne JWT 401.
- G/H: Frontend `c8bbd096` via `./deploy.sh hufmanager` (Gates + Smoke 0 Errors), previous `84d7d45d`; Bundle enthält Wrapper-Aufruf
  und neue Planliste.
- I: nur die 2 bestätigten Barzahlungs-Fälle über `hm_set_hufmanager_manual_access_v1` (Akteur = ursprünglicher Anlage-Admin):
  letzter Tag 15.01.2027 → Grenze 16.01.2027 00:00 Berlin; letzter Tag 27.02.2027 → Grenze 28.02.2027 00:00 Berlin.
  ACTIVE / NONE / manual / MANUAL_GRANT, je 1 `manual_access_granted`-Event, `access_valid_until` gespiegelt. Genau 2 Entitlements
  + 2 Profile berührt; Lifetime, copecart_pro, copecart_starter, Grandfather, Alt-Trial, 8 Nicht-Provider unverändert (Zugang unverändert).
- Offen: Admin-E2E über Mission Control (Standard/Lifetime/Cash/Beta-Anlage, Legacy-Plan → 400, Non-Admin 403, Profil-Härtung per
  Nutzer-JWT) — braucht Admin-Login. Code/Doku lokal committet, **Push erst nach QA-PASS**.
- Rollback: `docs/backups/mig20260929_rollback_PROD.sql` (vorher 2 manual-Zeilen prüfen), Edge `git show e78f6c17:…` (= v134),
  Frontend `./deploy.sh hufmanager --rollback`.

### 28.09. spät — Final-Release-Sprint (PROD vnschgjxkzzwzefqlrji)
- Live: Frontend `ceacdcb4`, admin-create-user v136, Ledger `20260929120000`. Details + Gates + Rollback:
  `docs/release/HUFMANAGER_FINAL_RELEASE_REPORT_2026-09-28.md`.
- Neu live: account_class (+ Backfill 25), Tab-Lock-Fix, Termin-Status `planned`, Kleinunternehmer-Rechnung, Membership-404 weg,
  Dunkel-Modus-Tokens, Anbieterdaten-Hinweis, Slim-Trial-Banner, Slim-Abo-Karte, `support@hufmanager.de` in Einladung.
- Kennzahlen: real 28 Provider, qa 11 (+2 QA-Testkunden), test_fixture 8, demo 2 Provider; echte Grandfather 19.
- Offen P1 (Owner): Confirm Email/Site URL, echter Kauf-E2E, Mail-Zustellung info@. P0 = 0.

