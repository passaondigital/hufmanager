# HufManager — CURRENT STATE / SOURCE OF TRUTH

**Stand:** 24.09.2026, Nachmittag (live verifiziert, read-only gegen Production; MCP-Ziel per get_project = HufManager/eu-central-1 bestätigt)

> Aktueller technischer Snapshot für Menschen und Agenten. Bei Widerspruch gilt:
> Repo + aktuelle Runtime + aktuelle DB + reproduzierbare Testevidenz vor älterer Doku.
>
> **Korrektur zum Stand 22.09.:** Die dort genannte Sperre `MIGRATION_LEDGER=BLOCKED` war
> zum Zeitpunkt des Schreibens bereits überholt. Sie basierte auf Commit `0ca6d2a4` und kannte
> 23 lokal auf dem Server liegende, ungepushte Commits vom 21.09. nicht (Ledger-Reconciliation
> + Production-Apply der Release-Migrationen #1–#9). Diese Commits sind jetzt gepusht.

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

### Golden Flow E2E (Production, QA-Trial, Browser 390×844) — 25.09.2026, läuft

- ✅ Kunde anlegen (Kunden & Pferde → Neuer Kunde), ✅ Pferd anlegen, ✅ Termin planen (Formular zeigt nur eigene
  Leistungen bzw. Standardvorlagen), ✅ Tour starten → Termin öffnen → Abschluss speichern (DB: `completed`).
- ❌ **P0 Rechnung erstellen:** `create_invoice_with_items` → 409 `invoices_invoice_number_key` (RE-2026-0002 existiert bei
  anderem Betrieb). Zähler `invoice_number_counters` ist pro Provider, Unique-Constraint aber global → jeder neue Provider
  kollidiert. Fix = Repo-Migration `20260910063819_tenant_scope_invoice_number_uniqueness` (auf PROD nie angewendet, nicht
  im Ledger). Lokal getestet (2. Betrieb gleiche Nummer erlaubt, gleicher Betrieb doppelt blockiert), keine Lookups nur über
  `invoice_number`, keine FKs darauf, 0 Duplikate pro Provider. Apply-/Rollback-Dateien: `docs/backups/mig12_*`.
  **PROD-Apply wartet auf Owner-Freigabe.** Nebeneffekt: fehlgeschlagene Versuche verbrauchen Nummern (Lücken).
- Befunde UX: „Termin planen“ springt aus der Slim-Shell nach `/kalender`; Provider ohne eigene Leistungen bekommen
  Standardvorlagen mit 0 € (vorher fremde Preise) → Onboarding sollte Leistungen anlegen lassen (Claudia: 0 eigene).
- QA-Testdaten bleiben im QA-Tenant: Kunde „QA GoldenFlow“, Pferd „QA Goldie“, 1 abgeschlossener Termin.
- Offen: Rechnung/PDF, Mobile/PWA-Details.

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
