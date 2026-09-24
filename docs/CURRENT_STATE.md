# HufManager — CURRENT STATE / SOURCE OF TRUTH

**Stand:** 24.09.2026 (live verifiziert, read-only gegen Production)

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
| Letzter Code-Commit | `7a13d19b` fix(invite): route every client-creation path through the #5-#9 contract |
| `origin/main` | `f7640eaa` — für HufManager-Slim **nicht** maßgeblich |
| Worktrees / Stashes | nur Haupt-Worktree, keine Stashes |
| Server | `cloud-server-10634828` / `85.190.105.104` — **Production-Web und Staging-Web laufen auf demselben Host** |
| Production-Web | `app.hufmanager.de` (DNS → 85.190.105.104) → nginx root `/srv/hufi/business/hufmanager/app` (echtes Verzeichnis, Build vom **12.09.2026**, noch keine Release-/Symlink-Struktur) |
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

## 3. Production-Stand: DB neu, Edge/Frontend alt

| Komponente | Production | Repo |
|---|---|---|
| DB-Migrationen #1–#9 | **angewendet** | = |
| `autoflow-auto-invoice` | v80, neu (21.09. deployt) | = |
| `invite-client-with-password` | **v7 alt** — ohne Pending-Invite-Vertrag | neu (Vertrag #5–#9) |
| `invite-client` | **v8 alt** — createUser + setTimeout + eigener Grant | neu: HTTP 410 Gone |
| `admin-create-client` | **v117 alt** — direkte Writes, setTimeout | neu: kanonischer Vertrag |
| `hufi-agent` | v40 | Repo-Fassung nutzt neue RPCs, Deploy „mit Vorbehalt" |
| Frontend | Build vom 12.09. | RC `110dffc5` + Fixes bis `7a13d19b` |

### Offener Security-P0 (live)

Beide in Production erreichbaren Einladepfade (`invite-client` v8, `invite-client-with-password` v7)
legen **keinen** Pending Invite an. Ohne Invite greift in `auto_assign_client_to_provider()` der
generische „erster Provider"-Fallback (fremder Provider erhält aktiven Grant inkl. `can_view_medical`)
und die Ghost-Merge-Schleife in `handle_new_user()` bleibt aktiv.

Read-only Messung 24.09.: seit 20.09. 1 neuer Auth-User, 0 neue Kunden, **0 verdächtige Grants** →
bisher kein Schaden. Das Risiko besteht bis zum Deploy der Repo-Fassungen.

Fix liegt fertig im Repo (`7a13d19b`), getestet (siehe §5). **Deploy braucht Pascals Freigabe**,
weil Edge-Functions und Frontend zusammen gehen müssen (altes Frontend ruft `invite-client`,
das nach dem Fix 410 liefert).

## 4. Billing / CopeCart

- Kanonische Ingestion laut Doku: `hufi-data-core` (v6, `verify_jwt=false`). Legacy `copecart-webhook` (v164) weiterhin aktiv.
- `hufi_data_events`: 2 Events, letztes 11.09.2026. `hm_lifecycle_events`: 1. Keine offenen Reconciliation-Issues.
- `product_entitlements` HUFMANAGER: 35 ACTIVE, 1 LOCKED (letzte Änderung 12.09., Legacy-Backfill).
- Supabase-Logs letzte 24 h: **0 Aufrufe** von `hufi-data-core` und `copecart-webhook`.
- Welche URL im CopeCart-Dashboard hinterlegt ist, ist vom Server aus **nicht prüfbar** → `COPECART_ROUTING=UNKNOWN` bis Pascal/Dashboard-Evidenz.
- Cron aktiv u. a.: `reconcile-period-end-subscriptions`, `downgrade-expired-trials`.

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
