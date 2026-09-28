# HufManager — Resume 27.09.2026: Termin-DB-Guard + hufi-agent-BOLA

Projekt: PROD `vnschgjxkzzwzefqlrji` (nur lesend, Management-Token fehlt → Supabase-MCP mit expliziter Projekt-ID,
`default_transaction_read_only = on`). Keine PROD-Schreibvorgänge, kein Deploy.

## 1. Ist-Stand verifiziert (27.09. ~19:40 UTC)
- Repo: Branch `release/hufmanager-lifecycle-2026-09-11`, HEAD `30b689dd` = origin. Live-Frontend `releases/6cd8715be252`
  (previous `25d88773`), Entry `index-D26aIMcj.js` identisch.
- Ledger PROD letzter Eintrag `20260925080000` — keine neue Migration seit 25.09.
- Edge Functions unverändert seit 24.09. (u. a. `admin-create-user` v132, `send-provider-invitation` v110,
  `send-employee-invitation` v94, `hufi-agent` v40, `copecart-webhook` v165).
- DB 208 MB, `ACTIVE_HEALTHY`, 20 Verbindungen. Job 20 inaktiv, Job 21 aktiv (letzter Lauf erfolgreich), Job 24 lief 27.09. 03:17.
  Cron: 0 Fehler / 2.152 Läufe in 24 h. `cron.job_run_details` 6,9 MB / 6.714 Zeilen (älteste 24.09. 17:18).
- **Beobachten (P1):** `net._http_response` 9,0 MB für 150 Zeilen (25.09.: 2,8 MB), `last_autovacuum` weiterhin 05.08.
  → wächst wie vor dem Incident, nur langsamer. Nächster Schritt ggf. `VACUUM (FULL)` mit Freigabe.
- Auth: `mailer_autoconfirm=true` (Confirm Email AUS), Site URL unverändert.

## 2. Termin-DB-Guard

**Kanonische Regel (aus RLS abgeleitet):** Ein Betrieb darf ein Pferd nur verplanen, wenn er zum Besitzer einen aktiven,
gültigen Grant hat (`has_active_access_grant`) — dieselbe Regel, mit der RLS ihm das Pferd überhaupt zeigt.
`created_by_provider_id` gibt nur Profil-Sichtbarkeit (Legacy-Policy), keine Pferdesicht, und ist vom Kunden selbst editierbar.
Organisationen: 0, Org-Mitglieder: 0, `assigned_to_user_id` nie gesetzt; Mitarbeiter können per RLS gar keine Termine schreiben.

**Die „4 Kunden ohne Grant" (plus 1 pausiert):** alle 5 gehören dem Hauptkonto `99e50f7f` (Pascal), echte Adressen,
Auth-User vorhanden. 4 Grants wurden am **28.07.2026 18:43–18:44 UTC innerhalb einer Minute auf `ended` gesetzt** (manuelles
Beenden der Verbindung), 1 steht auf `paused`. Heute sichtbar nur als Profil (`created_by_provider_id`), ihre Pferde sind für den
Betrieb per RLS unsichtbar. An 3 davon hängen **108 Termine bis 2027** (planned/scheduled/cancelled).
→ Guard behandelt sie als NICHT verbunden: Alttermine bleiben unverändert bearbeitbar, neue Termine nur nach erneutem Verbinden.
**Owner-Frage:** Sollen die zukünftigen Termine dieser 3 Kunden abgesagt werden? (nicht angefasst)

**Migration:** `supabase/migrations/20260927120000_add_appointment_relation_guard_v1.sql`
(md5 `1f9c36adf12ed0dceaf9e7520f487c29`, sha256 `beb64ff7…0da7faf`). Trigger `trg_hm_guard_appointment_relations_v1`
(BEFORE INSERT / UPDATE OF horse_id, client_id, provider_id, assigned_to_user_id, organization_id), gilt für alle Rollen inkl. service_role.
Apply-Datei: `docs/backups/mig14_20260927120000_apply_canonical.sql` (Migration + Ledger-Eintrag in einer Transaktion).
Rollback: `docs/backups/mig14_20260927120000_rollback.sql`.

**Tests:** `scripts/appointment-guard-tests.sql` auf `scripts/appointment-guard-replica-schema.sql` (Wegwerf-Postgres 17,
Funktionen/Policies/Trigger wörtlich aus PROD) → **39/39 PASS**; Negativkontrolle ohne Migration **19/39** (alle 20 Verbots-Tests FAIL).
Apply-Datei + Rollback dort durchgespielt (Ledger-md5 = Datei; Rollback entfernt Trigger, Funktion, Ledger).
Hinweis: Die lokale Supabase-Kopie (Container `supabase_db_vnschgjxkzzwzefqlrji`) wurde nicht benutzt — Zugriff von der
Sicherheitsprüfung blockiert (Name = PROD-Ref). Voll-Schema-Lauf dort nur mit Pascals Freigabe.

**PROD-Auswirkung (read-only):** Anlagen Juni–Sept.: 0 Kunde↔Pferd-Abweichungen, 0 ohne Grant zum Anlagezeitpunkt
(2 im August haben heute keinen Grant mehr → später beendet). 134 Alttermine ohne aktiven Grant bleiben bearbeitbar.

**Security Review:** keine Findings ≥ 8 (Ghost-Merge-Ausnahme nur ohne Endnutzer; anon hat keine UPDATE-Policy).

**Nebenbefund (vorbestehend, P2):** `validate_appointment_status` lehnt `scheduled` ab → die 65 Alttermine mit `scheduled`
sind nur bearbeitbar, wenn gleichzeitig der Status geändert wird; `ClientBooking`, `DayCockpit`-Notfalltermin und
`hufi-agent create_appointment` (v40) senden `scheduled` und scheitern damit heute schon.

## 3. hufi-agent — BOLA (release-blockierend)

**Live-Code** = v40 = Git `23a786df` (03.08.). Repo-HEAD-Fassung ist eine nie deployte Neufassung.
**Autorisierungskontext:** `providerId = user.id` aus `auth.getUser()` (JWT) — für JEDE Rolle (Provider, Mitarbeiter, Kunde,
Partner, Admin). Kein Rollen- oder Entitlement-Check, Mitarbeiter bekommen NICHT den Betrieb. Alle Tools laufen mit Service Role,
direkt ohne Bestätigung. Vom Live-Frontend aufgerufen (MobileShell), per HTTP für jeden eingeloggten Nutzer erreichbar
(offene Registrierung, Autoconfirm). Logs letzte 24 h: 0 Aufrufe (älter nicht prüfbar).

| Tool (live v40) | Befund | Beleg (Negativkontrolle) |
|---|---|---|
| `update_appointment` | BOLA: jeder Nutzer ändert jeden Termin per UUID | A ändert B-Termin, Mitarbeiter/Kunde ändern A-Termin |
| `cancel_appointment` | BOLA + Push an fremden Kunden | A storniert B-Termin, B's Kunde erhält Push |
| `get_horse_record` | BOLA Lesen: beliebige Pferdeakte inkl. Besitzer-E-Mail, Gesundheit, Termine+IDs, Rechnungen **aller** Betriebe | fremde Akte + B-Rechnung sichtbar |
| `get_client_overview` | BOLA Lesen: beliebiger Kunde inkl. E-Mail/Telefon, Termine/Rechnungen aller Betriebe | fremder Kunde sichtbar |
| `send_notification` | Push an beliebige `user_id` mit Service Key | Push an fremden Kunden |
| `create_appointment` | fremdes Pferd per Service Role möglich — heute nur durch Status-Bug (`scheduled`) blockiert; DB-Guard deckt es ab | — |
| `search_entity` | Pferdesuche über alle Betriebe, aber durch `eq.null`-Syntaxfehler (HTTP 400) tot; Partnerliste global | — |
| `create_invoice`/`create_note`/`create_horse`/`create_contact`/`add_expense` | existieren in v40 nicht | — |

**UUID-Beschaffung real:** Bei geteilten Kunden (zwei Betriebe, ein Pferd) liefert `get_horse_record` die Termin-IDs des
anderen Betriebs → update/cancel direkt ausnutzbar.

**Fix (minimal, auf v40):** `scripts/ops/edge-hotfix/hufi-agent-v41/` (index.ts sha256 `f53cc516…ac9005`).
User-scoped Client (RLS) für alle Objekt-ID-Tools, zusätzlich `provider_id`-Filter + Trefferprüfung bei update/cancel,
Grant-Prüfung vor Push. Admin handelt über den Agenten nicht mehr global (nur eigene Termine) — bewusst, keine implizite Ausnahme.
Mitarbeiter: kein Schreibzugriff über den Agenten (entspricht DB-Regel: Mitarbeiter schreiben keine Termine).
**Tests:** 21/21 PASS (echter Code gegen PostgREST + PROD-RLS-Replik), Negativkontrolle v40 2/21, `deno check` 8 = Baseline.
**Security Review Hotfix:** keine offenen Findings; verbleibende Service-Role-Abfragen (`get_appointments`,
`get_invoice_history`) sind fest auf `provider_id = user.id` gefiltert.

**Repo-HEAD-Fassung (nicht live, P1 vor deren Deploy):** mutierende Tools laufen dort über Bestätigung + Frontend (RLS), aber
`get_horse_record`/`get_client_overview` filtern bei geteilten Kunden fremde Termine/Rechnungen nicht heraus; `executeTool`
enthält noch die ungescopten update/cancel/send_notification/create_horse-Zweige (derzeit unerreichbar).

**Veröffentlichung:** Repo ist öffentlich → diese Doku und der Hotfix bleiben lokal committed, **Push erst nach Deploy des Hotfix**.

## 4. PROD-Umsetzung 27.09.2026 (Owner-Freigabe)

### hufi-agent v41 — LIVE
- Vorher: Live v40 per SHA256 = Sicherung bestätigt (Rollback belastbar).
- Deploy via Supabase-MCP: Version **41**, `verify_jwt=false` (unverändert), deployte Dateien SHA256-identisch mit Repo
  (`index.ts f53cc516…`, `horse-knowledge.ts d6a919f7…`).
- **Befund beim Smoke:** Der Assistent ist live funktionslos — jeder Aufruf endet mit Anthropic „credit balance too low“,
  Ollama-Fallback 405 → HTTP 503. Tools liefen deshalb über die Function nicht; die Lücke war zuletzt praktisch unerreichbar
  (seit wann: unbekannt).
- Deshalb PROD-Test ohne LLM: exakt der deployte `executeTool`-Code mit echten QA-JWTs gegen die PROD-API, Push an lokalen
  Mitschnitt (`test/prod_tool_test.ts`): **19/19 PASS** — fremde Termine ändern/absagen blockiert, keine Push bei Ablehnung,
  fremde Pferdeakte/Kundenübersicht blockiert, geteilter Kunde zeigt keine Termine/Rechnungen des anderen Betriebs,
  Push an fremde/beliebige Nutzer blockiert, Mitarbeiter ohne Ausweitung, eigene Aktionen ok.
- REST-Gegenprobe mit denselben Abfragen (`test/prod_smoke.py`, Teil 2): 9/9.
- Admin: keine Sonderregel im Agenten (nur RLS + `provider_id = eigener Nutzer`); kein Admin-QA-Konto → nicht live getestet.

### Termin-DB-Guard — LIVE
- Vorcheck: Ledger `20260925080000`, kein Guard vorhanden, Tests erneut 39/39, Datei = Commit.
- Apply: kanonische Datei (Migration + Ledger in einer Transaktion). Ledger-md5 = Datei `1f9c36ad…`,
  Funktionskörper-md5 = Datei `f5395766…`, SECURITY DEFINER + `search_path=public`, kein EXECUTE für anon/authenticated.
- Bestandsdaten: md5 aller Termine vor = nach Apply.
- PROD-Tests: REST mit QA-JWT 9/9 (eigener Kunde/Pferd ok; fremder Kunde, fremdes Pferd, Pferd≠Kunde, Umbiegen auf fremdes
  Pferd/Kunde blockiert; Datum/Uhrzeit/Notiz ändern ok). SQL mit Rollback: eigener Mitarbeiter ok, fremder Mitarbeiter
  blockiert, fremden Mitarbeiter zuweisen blockiert, Serverpfad ohne Nutzer + fremdes Pferd blockiert, echter Alttermin ohne
  Grant bearbeitbar (zurückgerollt), Umbiegen blockiert.
- **Designbefund:** Das Hauptkonto `99e50f7f` ist Master-Admin; die Admin-Ausnahme greift deshalb auch im normalen
  Betriebsalltag dieses Kontos. Vorschlag v2: Admin-Ausnahme nur, wenn Admin für einen ANDEREN Betrieb handelt.
- Alt-Bug bestätigt: 65 Termine mit Status `scheduled` sind nur bei gleichzeitiger Statusänderung bearbeitbar (`validate_appointment_status`).
- QA-Fixtures danach entfernt (Termine/Rechnung/Grants/Mitarbeiter gelöscht, QA-Pferd/-Kunde soft-deleted wegen Audit-Log);
  Terminbestand wieder 301. Nebeneffekt: Anlage des QA-Kunden löste 1 `admin-notifications new_user` aus.

### 108 Termine der getrennten Kunden (read-only)
- 3 Kunden, alle Termine gehören dem Hauptkonto `99e50f7f`, alle vor der Trennung angelegt (12/2025–05/2026, 12 Serien).
- Trennung = Verbindung am 28.07.2026 18:43–18:44 UTC auf `ended` gesetzt; **am selben Tag wurden alle 54 Termine ab 27.08.
  abgesagt** (davon 38 in der Zukunft). Pferde und Kundenprofile bestehen weiter.
- Zukünftige Termine: 38, **alle bereits `cancelled`** → keine aktiven Zukunftstermine, keine Erinnerungen fällig.
- Offen in der Vergangenheit: 54 (23 planned, 30 scheduled, 1 confirmed; 29.12.2025–27.07.2026), nie abgeschlossen, 0 Rechnungen.
- Dubletten: 4 Paare am 16.07.2026 (offen, Vergangenheit), 12 Paare abgesagt.

## 5. net._http_response — Ursache + vorbereitete Retention (NICHT angewendet)
- Zeilen-Retention funktioniert (pg_net.ttl 6 h → 514 Zeilen). Speicher wird nicht frei: 7,7 MB Heap für 514 Zeilen, ~3 MB/Tag.
- Ursache: pg_net- und pg_cron-Hintergrundworker melden Inserts/Deletes nicht an die Statistik (150 statt 514 Zeilen,
  0 tote Tupel bei 311.236 Deletes; job_run_details 390 statt 6.778) → Autovacuum startet nie (letzter Lauf 05.08.).
  Kein Snapshot-Halter → normales VACUUM wirkt.
- Migration `20260927180000_add_pg_net_cron_vacuum_jobs_v1.sql`: pg_cron-Jobs `VACUUM (ANALYZE)` alle 6 h für
  `net._http_response`, täglich 03:47 UTC für `cron.job_run_details`. Kein FULL, keine Sperre für pg_net/pg_cron, keine
  Geschäftsdaten. Probelauf auf Supabase-Postgres 17.6.1.054: Job `succeeded`, idempotent. Rollback: `cron.unschedule` beider Jobs.
- Weitere große Tabellen (beobachten, nicht Teil dieser Maßnahme): `system_health_checks` 110 MB, `notifications` 29 MB.

## 6. PROD-Umsetzung 28.09.2026 (Owner-Freigabe) — alle drei LIVE

Projekt: PROD `vnschgjxkzzwzefqlrji` (Supabase-MCP, `get_project` = HufManager/eu-central-1). Jede Migration einzeln per
Transaktion inkl. Ledger-Eintrag; Ledger-md5 = Datei. Keine Änderung an Bestandsdaten (Grants 71 und Termine 301,
md5 vor = nach), die 54 historischen Termine wurden auch in Tests nicht angefasst.

### net-Retention `20260927180000` — LIVE
- Jobs 25 `vacuum-net-http-response` (`23 */6 * * *`) und 26 `vacuum-cron-job-run-details` (`47 3 * * *`), aktiv, User postgres.
  Ledger-md5 `4dad4fa1…` = Datei. Rollback: `docs/backups/mig15_20260927180000_rollback.sql`.
- Erstlauf: Job 25 einmalig auf 08:16 UTC vorgezogen → `succeeded` (0,8 s), danach Plan zurückgestellt.
  `last_vacuum`/`last_analyze` gesetzt, Statistik jetzt korrekt (518 live / 1 tot statt 150 / 0).
- `net._http_response` 10 MB (Heap 9 MB) — normales VACUUM schrumpft nicht, gibt Platz zur Wiederverwendung frei → Wachstum
  sollte stoppen. Kontrolle in 24–48 h. Job 26 erster Lauf 29.09. 03:47 UTC.

### Ghost-Grant-Fix `20260928090000_fix_foreign_ghost_grant_v1` — LIVE
- Befund präzisiert: Direkte REST-Schreibzugriffe von Providern auf `access_grants` scheitern heute schon, aber nur zufällig
  (Policies lesen `auth.users`, `authenticated` hat dort kein SELECT → `42501 permission denied for table users`; auf PROD
  verifiziert). Die permissive ALL-Policy „Provider sees own grants“ ohne WITH CHECK hebelt die engeren Policies aus —
  einziger fachlicher Schutz war der Trigger, und der prüfte Ghost-Kunden gar nicht und das Umhängen von `client_id` nie.
- Fix im Trigger `enforce_access_grant_security`: handelt der Aufrufer als Betrieb (`auth.uid() = provider_id`), gilt INSERT
  oder UPDATE mit neuer `client_id`/`provider_id` als neue Beziehung. Ghost: nur der anlegende Betrieb
  (`created_by_provider_id`). Echter Kunde: kein aktiver Grant ohne Zustimmung, jetzt auch beim Umhängen.
  Service-Role/Edge (Invite-RPC), Kunden-Selbstverbindung und Beenden bleiben unverändert.
- Tests (Wegwerf-Postgres 17, Replik `scripts/access-grant-ghost-replica-schema.sql`, `scripts/access-grant-ghost-tests.sql`):
  ohne Rechte-Barriere 20/20, Negativkontrolle ohne Fix 13/20 (alle 7 Lücken-Tests FAIL); mit PROD-Rechten Fix = Altstand
  (keine Regression). Apply + Rollback geprobt.
- PROD (Transaktion mit ROLLBACK): 9/9 — fremder Ghost aktiv/pending blockiert, eigenen Grant auf fremden Ghost bzw.
  fremden echten Nutzer umbiegen blockiert, REST-Rolle weiterhin 42501; eigene Grants beenden/ändern ok, Serverpfad ok.
- Funktion: SECURITY DEFINER, `search_path=public`, EXECUTE nur postgres/service_role.
  Rollback: `docs/backups/mig16_20260928090000_rollback.sql` (stellt auch alte Rechte her).

### Termin-Guard Admin-Nachbesserung `20260928100000_restrict_appointment_guard_admin_exception_v1` — LIVE
- Einzige Änderung: Admin-Ausnahme nur noch, wenn der Admin für einen ANDEREN Betrieb handelt (`auth.uid() <> provider_id`).
  Das Hauptkonto (Master-Admin) unterliegt im eigenen Betrieb jetzt der Grant-Prüfung.
- Regression: `scripts/appointment-guard-tests.sql` (+6 Admin-Tests T34–T39) 45/45; ohne Nachbesserung genau T34/T38 FAIL;
  ohne Guard 22/45. Apply + Rollback geprobt (Rollback-md5 = alte Fassung `f5395766…`).
- PROD (ROLLBACK): 7/7 — Master-Admin eigener Betrieb: Pferd ohne Grant blockiert, mit Grant ok; Master-Admin für anderen
  Betrieb (Support) ok; Provider eigenes Pferd ok, fremdes blockiert; Fremder im Namen eines Betriebs blockiert; Serverpfad blockiert.
- Prosrc-md5 neu `c6f92a0e…`. Rollback: `docs/backups/mig17_20260928100000_rollback.sql`.

### Security- + Production-Smoke 28.09. — PASS
- `scripts/ops/prod_security_smoke.py` (QA A/B/TRIAL, nicht-mutierend): **38/38** — Leistungen/Grants/Termine/Rechnungen nur
  eigene, fremde Pferde/Ghosts unsichtbar, Ghost-Grant/Umbiegen/fremde Termine blockiert, Edge 401/410-Pfade, Invite-Tabelle
  gesperrt, Slim-Zugang, REST 200, `app.hufmanager.de` 200.
- Cron 24 h: 0 Fehler / 2.153 Läufe. DB 211 MB. `hufi-agent` v41 aktiv; Assistent weiterhin 503 (Anthropic-Guthaben/Ollama).
