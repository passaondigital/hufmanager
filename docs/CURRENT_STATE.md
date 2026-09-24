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
| Letzter Code-Commit | `9f82803e` (Edge) / Frontend live `b15b6133` |
| `origin/main` | `f7640eaa` — für HufManager-Slim **nicht** maßgeblich |
| Worktrees / Stashes | nur Haupt-Worktree, keine Stashes |
| Server | `cloud-server-10634828` / `85.190.105.104` — **Production-Web und Staging-Web laufen auf demselben Host** |
| Production-Web | `app.hufmanager.de` (DNS → 85.190.105.104) → nginx root `/srv/hufi/business/hufmanager/app` → Symlink `current` → `releases/b15b61334616` (seit 24.09.) |
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

### Neuer P0-Befund: Neuregistrierung ohne Slim-Zugang

Ein frisch registrierter Provider erhält **kein** `product_entitlements`-Eintrag und landet im
`HufmanagerSlimAccessGate` auf „Kein aktiver Zugang“ statt in einer 14-Tage-Testphase.
Betrifft auch den echten Neukunden vom 23.09. Vorbestehend (Gate + RPC schon im Build vom 12.09.),
**nicht** durch den Deploy verursacht. → FIRST_LOGIN BLOCKED.

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
