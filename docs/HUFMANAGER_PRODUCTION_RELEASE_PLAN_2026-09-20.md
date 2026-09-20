# HufManager — Kontrollierter Production-Release-Plan

**Erstellt:** 2026-09-20
**Status:** `PREPARED_NOT_DEPLOYED`
**Production wurde durch die Erstellung dieses Plans nicht verändert.** Alle Production-Abfragen waren read-only.

---

## 1. Getesteter Ausgangsstand (Release Candidate)

| Feld | Wert |
|---|---|
| Repo | `/home/administrator/hufmanager` |
| Release-Branch | `release/hufmanager-lifecycle-2026-09-11` |
| HEAD (committed) | `2f3b2a123ddce8495488460fbb1a7f669553ead7` (2026-09-12 11:14:42 +0200) |
| Getesteter Stand | HEAD **+ unkommittierter Worktree** (26 geänderte, 24 neue Dateien) |
| Staging | `http://hufmanager-staging.huficloud.heyhufi.com` (statischer Build + lokaler Supabase-Stack) |
| Production Supabase | `vnschgjxkzzwzefqlrji` — „HufManager", `eu-central-1`, `ACTIVE_HEALTHY`, PG 17.6.1.054 |
| Production Frontend | `app.hufmanager.de` → Webroot `/srv/hufi/business/hufmanager/app` (17 MB, Stand 2026-09-12 11:39) |
| Production Host | cloud-server-10634828 / 85.190.105.104 |

**Staging-Ergebnis:** `FINAL_SMOKE_TEST=PASS` — Login, Kunde, Pferd, Termin, Terminabschluss, Dokumentation, Rechnung mit zwei Positionen (65,00 € + 25,00 € = 90,00 €), PDF 1:1 zur gespeicherten Rechnung, Status Offen → Bezahlt, Reload-Persistenz. Keine Datenverluste, keine Dubletten, keine Tenant-Verletzung.

**Behobene Release-Blocker (nicht erneut zu prüfen):**

1. **Cross-Provider-Ghost-Invite** — Fremdübernahme von Kunde + Pferd. Fix: `supabase/migrations/20260920190000_fix_cross_provider_ghost_takeover_v1.sql` (CASE-B-Guard auf `profiles.created_by_provider_id`). Retest: Same-Provider `200` PASS, Cross-Provider `409` fail-closed, Retry ebenfalls fail-closed.
2. **Rechnungs-PDF** — erfundene Sammelzeile statt gespeicherter Positionen. Kein Code-Fix nötig; der geprüfte Quellstand löst Positionen bereits kanonisch aus `invoice_items` auf (`src/lib/invoiceLineItems.ts`, `resolveInvoiceLineItems`, `LEGACY_INVOICE_CONTRACT=NOT_SUPPORTED`). Staging lieferte lediglich einen alten Build.

---

## 2. ⚠️ Vorbedingung 0 — Release-Scope committen

Der getestete Stand liegt **unkommittiert** im Worktree. `scripts/build-hufmanager-canonical.sh` bricht bei `git diff --quiet`-Verletzung ab:

```
HUFMANAGER_BUILD=FAIL tracked worktree changes present
```

Vor dem Deploy ist deshalb zwingend ein Commit des unter Abschnitt 3 definierten Scopes auf `release/hufmanager-lifecycle-2026-09-11` erforderlich — **ohne** die unter „Excluded" gelisteten Pfade. Kein `git add .`.

```bash
cd /home/administrator/hufmanager
git add <RELEASE_FILES aus Abschnitt 3>      # explizit, niemals -A / .
git status --porcelain                       # Kontrolle: supabase/.branches/ NICHT dabei
git commit -m "release(hufmanager): lifecycle/invite/invoice release candidate 2026-09-20"
git rev-parse HEAD                           # -> RELEASE_HEAD im Manifest nachtragen
```

---

## 3. Release Scope

### 3.1 RELEASE_FILES

**Frontend — Rechnung / PDF (Blocker 2)**
```
src/lib/invoicePdfGenerator.ts            (M)
src/lib/invoiceLineItems.ts               (neu)   kanonische Positionsauflösung
src/lib/invoiceLineItems.test.ts          (neu)
src/lib/invoiceTax.ts                     (neu)
src/lib/invoiceTax.test.ts                (neu)
src/lib/invoiceStatus.ts                  (neu)
src/lib/invoiceStatus.test.ts             (neu)
src/lib/invoiceRpc.ts                     (neu)
src/components/invoices/CreateInvoiceModal.tsx     (M)
src/components/invoices/ClientInvoicesSection.tsx  (M)
src/pages/Rechnungen.tsx                  (M)
src/pages/ClientInvoices.tsx              (M)
src/components/dashboard/widgets/content/OpenInvoicesContent.tsx (M)
src/components/slim/SlimFinanceScreen.tsx (M)
```

**Frontend — Kunde / Pferd / Einladung (Blocker 1)**
```
src/components/customers/InviteByEmailModal.tsx    (M)   emailSent-Rückmeldung
src/components/customers/AddCustomerModal.tsx      (neu)
src/components/customers/AddHorseModal.tsx         (M)
src/components/customers/ClientDocumentsTab.tsx    (M)
src/components/slim/SlimCustomerHorseWorkspace.tsx (M)
src/pages/Kunden.tsx                      (M)
```

**Frontend — Termin / Tour / Heute**
```
src/components/calendar/AppointmentFormModal.tsx   (M)
src/components/slim/SlimAppointmentModal.tsx       (neu)
src/lib/appointmentFormGuards.ts          (neu)
src/lib/appointmentFormGuards.test.ts     (neu)
src/components/slim/TodayScreen.tsx       (M)
src/components/slim/SlimTourScreen.tsx    (M)
src/components/slim/TourLiveEditControl.tsx (M)
src/pages/Kalender.tsx                    (M)
src/components/onboarding/ProviderSetupWizard.tsx  (M)
```

**Frontend — Hufi-Agent-Anbindung (an die neuen RPCs gekoppelt)**
```
src/lib/hufi-actions.ts                   (M)
src/lib/hufi-agent-tasks.ts               (M)
src/lib/hufi-task-engine.ts               (M)
src/lib/hufi-tool-definitions.ts          (M)
src/lib/hufiActionTypes.ts                (neu)
src/lib/hufiAgentMutatingTools.test.ts    (neu)
src/lib/inviteTenantBinding.test.ts       (neu)
src/integrations/supabase/types.ts        (M)   generierte Typen der neuen RPCs
```

**Datenbank — 9 Migrationen (alle neu)**
```
supabase/migrations/20260917120000_add_create_customer_with_contact_v1.sql
supabase/migrations/20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql
supabase/migrations/20260917130000_add_create_invoice_with_items_for_provider_v1.sql
supabase/migrations/20260917140000_fix_autoflow_trigger_auth_vault_v1.sql
supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql
supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql
supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql
supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql
supabase/migrations/20260920190000_fix_cross_provider_ghost_takeover_v1.sql
```

**Edge Functions**
```
supabase/functions/invite-client-with-password/index.ts (M)
supabase/functions/autoflow-auto-invoice/index.ts       (M)
supabase/functions/hufi-agent/index.ts                  (M)
```

**Dokumentation**
```
docs/HUFMANAGER_STAGING_ACTIVATION_2026-09-20.md
docs/HUFMANAGER_PRODUCTION_RELEASE_PLAN_2026-09-20.md
docs/HUFMANAGER_RELEASE_MANIFEST_2026-09-20.md
```

### 3.2 EXCLUDED_FILES

| Pfad | Grund |
|---|---|
| `supabase/.branches/` (`_current_branch`) | lokales Artefakt der Supabase-CLI, kein Produktcode, gehört nicht ins Repo |
| `dist/` | Build-Output, gitignored, wird im Release neu erzeugt |
| `/tmp/hm_browser_driver.py` und alle `/tmp`-Testtreiber | temporäre Browser-Testwerkzeuge, kein HufManager-Produktcode |
| `/tmp/claude-*/scratchpad/**` | Test-, Screenshot- und Backup-Artefakte dieser Sessions |
| `hufmanager-staging-edge:pinned-20260920` (Docker-Image) | reines Staging-Betriebsartefakt |

**Kein sachfremdes Projekt im Scope.** Alle 50 Pfade liegen unter `src/`, `supabase/` oder `docs/` und gehören zum HufManager-Flavor.

**Hinweis Nebenwirkung:** Mehrere geänderte Dateien unter `src/components/` und `src/lib/` sind flavor-übergreifend und werden auch von HufiApp (`hufiapp.de`, Deploy über `deploy.sh` → `/var/www/hufiapps/v25`) benutzt. Dieser Release verändert **nur** den HufManager-Webroot. HufiApp erhält die Änderungen erst bei ihrem nächsten eigenen Deploy — das ist dort separat zu testen und **nicht** Teil dieses Releases.

---

## 4. Migrations-Inventar

**Production-Migrationsstand (read-only geprüft am 2026-09-20):** letzte angewandte Migration `20260911191418` (`add_hm_reconciler_scheduler_objects_only_part_a`).

### PROD_ALREADY_APPLIED
```
(keine der 9 Release-Migrationen)
```

### PROD_PENDING — Anwendungsreihenfolge (timestamp-basiert, dependency-safe)

| # | Migration | Inhalt | Abhängigkeit |
|---|---|---|---|
| 1 | `20260917120000_add_create_customer_with_contact_v1` | RPC `create_customer_with_contact` | — |
| 2 | `20260917125000_add_autoflow_invoice_appointment_idempotency_v1` | Idempotenz-Schlüssel Autoflow-Rechnung | — |
| 3 | `20260917130000_add_create_invoice_with_items_for_provider_v1` | RPC `create_invoice_with_items_for_provider` | nach 2 |
| 4 | `20260917140000_fix_autoflow_trigger_auth_vault_v1` | Autoflow-Trigger liest Vault statt NULL-URL | nach 3; Vault siehe §6 |
| 5 | `20260917150000_add_pending_client_invite_contract_v1` | Tabelle `hm_pending_client_invites` + `create/bind/invalidate_pending_client_invite_v1`; ersetzt `handle_new_user` | — |
| 6 | `20260917155000_fix_invite_tenant_auto_assign_v1` | Tenant-Bindung Auto-Assign | nach 5 |
| 7 | `20260917160000_add_create_invited_customer_with_contact_v1` | RPC `create_invited_customer_with_contact` | nach 5, 6 |
| 8 | `20260920120000_fix_pending_invite_ghost_merge_v1` | Ghost-Merge aus `handle_new_user` in die RPC verlagert | nach 7 |
| 9 | `20260920190000_fix_cross_provider_ghost_takeover_v1` | **Blocker-1-Fix:** CASE-B-Guard auf `created_by_provider_id` | **muss zwingend nach 8 laufen** (ersetzt dieselbe Funktion) |

**Read-only verifizierter Production-Zustand vor dem Release:**

| Objekt | in Production vorhanden |
|---|---|
| `public.contacts`, `public.invoice_items` | ✅ ja |
| `public.handle_new_user` | ✅ ja (alte Fassung) |
| `hm_pending_client_invites` | ❌ nein |
| `create_customer_with_contact` | ❌ nein |
| `create_invoice_with_items_for_provider` | ❌ nein |
| `create_pending_client_invite_v1` / `bind_…` / `invalidate_…` | ❌ nein |
| `create_invited_customer_with_contact` | ❌ nein |
| `_hm_normalize_email`, `_hm_has_active_pending_client_invite` | ❌ nein |

**Rückwärtskompatibilität (geprüft):** Die Migrationen sind additiv. Sie legen Funktionen/Tabellen an und `REVOKE`n ausschließlich Rechte auf die **neuen** Funktionen. Keine Policy wird gelöscht, keine Tabellenspalte entfernt, Direktschreibzugriffe auf `invoices`/`invoice_items`/`contacts` bleiben unverändert. Die ersetzte `handle_new_user` überspringt die Ghost-Merge-Schleife nur, wenn ein aktiver Pending-Invite existiert — den erzeugt ausschließlich die **neue** Edge Function. Solange die alte Function läuft, verhält sich Production exakt wie heute.

**Konsequenz:** Schritt „Migrationen" bricht die laufende Production nicht. Der Cross-Provider-Schutz wird aber erst mit dem Deploy von `invite-client-with-password` wirksam — das Zeitfenster zwischen beiden Schritten ist kurz zu halten.

---

## 5. Edge Functions

Alle drei Production-Funktionen wurden zuletzt am **2026-08-08 23:49 UTC** deployt und laufen damit nachweislich vor allen Release-Änderungen.

### EDGE_FUNCTIONS_TO_DEPLOY

#### 5.1 `invite-client-with-password` — PFLICHT

| Feld | Wert |
|---|---|
| Source | `supabase/functions/invite-client-with-password/index.ts` |
| Getesteter Stand | 401 Zeilen; Pending-Invite-Vertrag, atomare RPC `create_invited_customer_with_contact`, Kompensation/Rollback, `emailSent`-Flag |
| Production-Stand | Version 6, alte Fassung: direkte Inserts in `profiles`/`user_roles`/`contacts` ohne Fehlerauswertung, kein Pending-Invite, kein `emailSent` (Quelltext read-only verifiziert) |
| Grund | **Release-Blocker 1.** Ohne diesen Deploy bleibt die Cross-Provider-Ghost-Übernahme in Production offen |
| `verify_jwt` | Production **heute `false`**; `config.toml` hat keinen Eintrag → CLI-Default **`true`**. Getestet wurde mit JWT-Pflicht (ohne Token `401`, mit Provider-Session `200`) |
| Secrets/Env | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Plattform-Defaults), `RESEND_API_KEY` (für den Einladungsversand) |
| Abhängigkeit | Migrationen 5–9 **müssen vorher** laufen, sonst `create_pending_client_invite_v1` nicht vorhanden → jede Einladung schlägt fail-closed fehl |
| Rollback | `supabase functions deploy invite-client-with-password` aus dem gesicherten Prod-Source-Backup (§7 D), oder Version-Rollback auf v6 im Dashboard |

> **Entscheidung vor dem Deploy:** `verify_jwt` bewusst auf dem getesteten Wert (`true`) belassen **oder** mit `--no-verify-jwt` den heutigen Production-Wert beibehalten. Empfehlung: getesteten Wert (`true`) nehmen und unmittelbar mit dem Smoke-Invite verifizieren, da das Frontend die Session-JWT ohnehin mitsendet.

#### 5.2 `autoflow-auto-invoice` — PFLICHT (an Migration 2/3 gekoppelt)

| Feld | Wert |
|---|---|
| Source | `supabase/functions/autoflow-auto-invoice/index.ts` (+132/−) |
| Getesteter Stand | schreibt über `create_invoice_with_items_for_provider` (atomar + idempotent) |
| Production-Stand | Version 78 (2026-08-08), getrennte Writes ohne Idempotenzschlüssel |
| Grund | Nutzt die mit Migration 2/3 eingeführte Idempotenz; ohne Deploy bleibt der alte, nicht-atomare Rechnungspfad aktiv |
| `verify_jwt` | `false` (in `config.toml` explizit gesetzt, identisch zu Production) |
| Secrets/Env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; wird von den Autoflow-Triggern per Vault-Werten aufgerufen (§6) |
| Rollback | Redeploy des gesicherten Prod-Sources / Version-Rollback auf v78 |

#### 5.3 `hufi-agent` — PFLICHT-MIT-VORBEHALT

| Feld | Wert |
|---|---|
| Source | `supabase/functions/hufi-agent/index.ts` (+139/−) |
| Getesteter Stand | nutzt dieselben kanonischen RPCs wie das Frontend (`create_invoice_with_items`, `create_customer_with_contact`) |
| Production-Stand | Version 39 (2026-08-08), eigener nicht-atomarer Schreibpfad |
| Grund | Gehört zum Release-Scope, weil die zugehörigen Frontend-Dateien (`src/lib/hufi-*`) mitgehen; sonst laufen beide Pfade auseinander |
| `verify_jwt` | Production **`false`**; `config.toml` hat keinen Eintrag → CLI-Default **`true`**. ⚠️ **Der Hufi-Agent war NICHT Teil des Staging-Smoke-Tests.** |
| Empfehlung | Mit **`--no-verify-jwt`** deployen, um das heutige Production-Verhalten exakt beizubehalten. Alternativ aus diesem Release herausnehmen und separat nachziehen — der alte Stand bleibt nach den Migrationen funktionsfähig |
| Rollback | Redeploy des gesicherten Prod-Sources / Version-Rollback auf v39 |

### EDGE_FUNCTIONS_UNCHANGED

Alle übrigen Production-Functions bleiben unberührt — u. a. `copecart-webhook`, `serve-ical-feed`, `send-invoice-email`, `confirm-appointment`, `get-route`, `get-client-tour-status`, `hufi-data-core`, `stripe-*`, sämtliche `admin-*`, `send-*`, `generate-*`, `autoflow-customer-notify`, `autoflow-monthly-checkin`, `autoflow-process-lead`.
**Kein `supabase functions deploy` ohne Function-Namen — niemals pauschal alle deployen.**

---

## 6. Environment- / Vault-Contract

Read-only geprüft am 2026-09-20 gegen `vnschgjxkzzwzefqlrji`:

```
PROD_VAULT_AUTOFLOW_FUNCTIONS_BASE_URL=MISSING
PROD_VAULT_AUTOFLOW_SERVICE_KEY=MISSING
```
`vault.secrets` in Production enthält aktuell **0 Einträge**. Es wurden ausschließlich Namen geprüft, keine Werte gelesen oder ausgegeben.

**Bewertung:** Kein Deployment-Blocker. Migration 4 behandelt fehlende Secrets bewusst: der HTTP-Aufruf an `autoflow-auto-invoice` wird übersprungen und als `RAISE WARNING` protokolliert — das `UPDATE` auf `appointments`, an dem der Trigger hängt, schlägt nie fehl.

**Folge:** Solange die Secrets fehlen, ist die automatische Rechnungserzeugung beim Terminabschluss in Production **inaktiv**. Der manuelle Rechnungsweg (der getestete) funktioniert vollständig.

**Wenn Autoflow aktiv sein soll**, vor Migration 4 einmalig in Production setzen (Werte niemals ins Repo, niemals in Logs):

```sql
select vault.create_secret(
  '<SERVICE_ROLE_KEY VON vnschgjxkzzwzefqlrji>',
  'autoflow_service_key',
  'Bearer token the autoflow appointment triggers send to autoflow-auto-invoice.');

select vault.create_secret(
  'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1',
  'autoflow_functions_base_url',
  'Edge-Function base URL of THIS project. Never point this at another environment.');
```

⚠️ `autoflow_functions_base_url` darf **ausschließlich** auf das eigene Projekt zeigen. Ein Staging-Wert in Production (oder umgekehrt) würde Umgebungen überkreuz aufrufen.

**Frontend-Env für den Production-Build:**
```
VITE_APP_FLAVOR=hufmanager
VITE_SUPABASE_URL=https://vnschgjxkzzwzefqlrji.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key von vnschgjxkzzwzefqlrji>
```

---

## 7. Backup-Plan (unmittelbar vor dem Deploy auszuführen)

Zielverzeichnis: `RELDIR=/srv/hufi/backups/hufmanager-release-2026-09-20` (freier Speicher auf `/`: 685 GB — ausreichend).

```bash
RELDIR=/srv/hufi/backups/hufmanager-release-2026-09-20
mkdir -p "$RELDIR"/{db,functions,webroot,meta}
```

**A) Vollständiger Production-DB-Dump**
```bash
pg_dump "$PROD_DB_URL" -Fc -f "$RELDIR/db/hufmanager-prod-full-$(date +%Y%m%d-%H%M).dump"
```
Alternativ/zusätzlich: Supabase-Dashboard → Database → Backups → PITR-Zeitpunkt notieren.

**B) Schema-only Dump**
```bash
pg_dump "$PROD_DB_URL" --schema-only -f "$RELDIR/db/hufmanager-prod-schema-$(date +%Y%m%d-%H%M).sql"
```

**C) Migrationsstand dokumentieren**
```bash
psql "$PROD_DB_URL" -c "select version, name from supabase_migrations.schema_migrations order by version desc limit 20;" \
  > "$RELDIR/meta/prod-migrations-before.txt"
```
Erwarteter letzter Eintrag vor dem Release: `20260911191418`.

**D) Production Edge Function Sources + Versionen sichern**
```bash
for f in invite-client-with-password autoflow-auto-invoice hufi-agent; do
  supabase functions download "$f" --project-ref vnschgjxkzzwzefqlrji \
    --output-dir "$RELDIR/functions/$f-prod-before"
done
```
Zusätzlich Versionsstände notieren (Ist-Stand vor Release): `invite-client-with-password=v6`, `autoflow-auto-invoice=v78`, `hufi-agent=v39`.

**E) Production Webroot sichern**
```bash
rsync -a --delete /srv/hufi/business/hufmanager/app/ "$RELDIR/webroot/app-before/"
```
Erwartung: ~17 MB, 672 Asset-Dateien, Stand 2026-09-12 11:39.

**F) Git-Stand dokumentieren**
```bash
{ git -C /home/administrator/hufmanager rev-parse HEAD
  git -C /home/administrator/hufmanager rev-parse --abbrev-ref HEAD
  git -C /home/administrator/hufmanager status --porcelain
} > "$RELDIR/meta/git-state-before.txt"
```

**G) Env-/Vault-NAMEN dokumentieren (keine Werte)**
```bash
psql "$PROD_DB_URL" -c "select name, created_at from vault.secrets order by name;" \
  > "$RELDIR/meta/prod-vault-names-before.txt"
```

> In diesem Vorbereitungs-Task wurde **keiner** dieser Befehle gegen Production ausgeführt. Nur lesende Inventarabfragen fanden statt.

---

## 8. Production Safety Gates

| Gate | Prüfung | Ergebnis Stand 2026-09-20 |
|---|---|---|
| **GATE 1** Backup erfolgreich | A–G aus §7 vorhanden, Dump-Datei > 0 Byte, `pg_restore --list` lesbar | ⏳ offen (beim Deploy) |
| **GATE 2** Production Project ID bestätigt | `vnschgjxkzzwzefqlrji` = „HufManager", `ACTIVE_HEALTHY` | ⚠️ bestätigt über den Supabase-MCP mit explizitem `project_id` — siehe Hinweis unten |
| **GATE 3** keine Staging-URL in Production-Konfig | Bundle-Scan: 0 Treffer `hufmanager-staging` / `huficloud`; Prod-URL in 7 Chunks | ✅ bestätigt am Precheck-Build |
| **GATE 4** Vault/Env-Preconditions | Autoflow-Secrets bewusst `MISSING` → Autoflow bleibt inaktiv; Entscheidung dokumentiert | ✅ bewertet |
| **GATE 5** Migrationen eindeutig | 9 Migrationen, keine davon in Production, Reihenfolge fixiert | ✅ bestätigt |
| **GATE 6** Release-Files eindeutig | 50 Pfade gelistet, Excluded-Liste gepflegt | ✅ bestätigt |
| **GATE 7** Rollback-Artefakte vorhanden | DB-Dump, Function-Sources, Webroot-Kopie, Git-Commit | ⏳ offen (beim Deploy) |
| **GATE 8** keine unbekannten Dateien im Deployment | `git status --porcelain` nach Commit leer außer Excluded; `rsync`-Quelle ist ausschließlich `dist/` | ⏳ offen (beim Deploy) |
| **GATE 0** Worktree committet | `scripts/build-hufmanager-canonical.sh` verlangt sauberen Worktree | ⏳ offen (§2) |

**Ein FAIL an einem Gate bedeutet: DEPLOYMENT STOP.**

> **Hinweis zu GATE 2 (MCP-Falle aus `CLAUDE.md`):** Alle Production-Abfragen dieses Plans liefen über den Supabase-MCP mit explizit gesetztem `project_id=vnschgjxkzzwzefqlrji`. `CLAUDE.md` warnt, dass der MCP nicht zuverlässig auf PROD zeigt, und verlangt für PROD die Management API oder die CLI mit explizitem Projekt. Unter `~/.supabase/access-token` liegt kein Token, die vorgeschriebene Gegenprobe war deshalb nicht möglich.
> Indizien, dass die Abfragen tatsächlich PROD trafen: Projektname „HufManager", Host `db.vnschgjxkzzwzefqlrji.supabase.co`, Migrationshistorie endet passend bei `20260911191418`, Edge-Function-Entrypoints zeigen auf echte Deploy-Pfade (`/home/pascaladmin/hufmanager-hybrid-release/…`, `/root/hufmanager_v25/production/…`), und die lokale Staging-DB besitzt die neuen RPCs, die in dieser Abfrage als fehlend gemeldet wurden.
> **Vor dem Deploy trotzdem einmal per Management API gegenprüfen:**
> ```bash
> curl -s -X POST https://api.supabase.com/v1/projects/vnschgjxkzzwzefqlrji/database/query \
>   -H "Authorization: Bearer <Token>" -H "Content-Type: application/json" \
>   -d '{"query":"select max(version) from supabase_migrations.schema_migrations","read_only":true}'
> ```
> Erwartung: `20260911191418`. Weicht der Wert ab, gilt STOP-Bedingung 3.

---

## 9. Deployment-Reihenfolge

```
 0. PRE-FLIGHT
    - Release-Scope committen (§2)
    - npm ci && npx vitest run            -> alle Tests grün
    - npm run lint:hufmanager             -> HUFMANAGER_SCOPED_LINT=PASS
    - tsc -p tsconfig.app.json --noEmit    -> nur bekannte Baseline, keine neuen Fehler
    - git diff --check                     -> sauber
    - security-review laufen lassen        -> verbindlich vor jedem PROD-Deploy
                                              (CLAUDE.md, vom Nutzer am 2026-08-02 als Standard bestätigt)
    - GATE 2 gegen die Management API bestätigen (siehe §8, Hinweis zur MCP-Falle)
    - Deploy-Weg für den Webroot entschieden? (§9.1)
    - Wartungsfenster ankündigen (geringe Nutzung, keine laufende Tour)

 1. BACKUP (§7 A–G)                        -> GATE 1, GATE 7

 2. PRODUCTION SAFETY CHECK
    - Projekt-Ref bestätigen                -> GATE 2
    - Migrationsstand = 20260911191418      -> GATE 5
    - Webroot-Backup verifiziert            -> GATE 8

 3. VAULT/ENV PRECONDITIONS
    - Entscheidung Autoflow: Secrets setzen ODER bewusst inaktiv lassen -> GATE 4

 4. DB-MIGRATIONEN  (Reihenfolge 1..9 aus §4, einzeln, nicht gebündelt)

 5. MIGRATION VERIFICATION (§10.1)          -> bei FAIL: STOP + Rollback §11

 6. EDGE FUNCTIONS (genau diese drei, einzeln)
    a) invite-client-with-password          <- schließt Blocker 1
    b) autoflow-auto-invoice
    c) hufi-agent  (--no-verify-jwt empfohlen)

 7. FUNCTION VERIFICATION (§10.2)

 8. FRONTEND PROBELAUF
    ./deploy.sh hufmanager --dry-run
    -> baut aus sauberem Worktree, durchläuft alle Gates,
       schaltet den Symlink NICHT um

 9. FRONTEND DEPLOYMENT
    ./deploy.sh hufmanager
    -> Release-Verzeichnis, Verifikation, atomarer current-Switch,
       Smoke-Test, bei Fehlschlag automatischer Symlink-Rollback

10. (entfällt — Schritt 9 deployt und verifiziert in einem Lauf)

11. PRODUCTION BROWSER SMOKE (§12)

12. MONITORING (§13) -> Release abgeschlossen
```

### 9.1 Deploy-Weg für den HufManager-Webroot — entschieden

**Entscheidung (Pascal, 2026-09-20):** `./deploy.sh hufmanager` — Build des eingefrorenen RC → Release-Verzeichnis → prüfen → `current`-Symlink atomar umschalten. Rollback = Symlink zurück.

Damit bleibt die CLAUDE.md-Regel („Frontend: ausschließlich `./deploy.sh`", „nie von Hand rsyncen") gültig, jetzt auch für HufManager. `./deploy.sh` ohne Argument deployt unverändert HufiApp nach `/var/www/hufiapps/v25`; das HufManager-Ziel liegt isoliert in `scripts/deploy-hufmanager.sh`.

**Kommandos**

```bash
./deploy.sh hufmanager --dry-run    # baut + prüft vollständig, schaltet NICHT um
./deploy.sh hufmanager              # Deploy des aktuellen HEAD (= RC-Commit)
./deploy.sh hufmanager --ref 110dffc5e414   # expliziter Stand
./deploy.sh hufmanager --list       # Releases und Symlinks anzeigen
./deploy.sh hufmanager --rollback   # current -> previous, atomar
```

**Zielstruktur unter `/srv/hufi/business/hufmanager/`**

```
releases/<commit>/     unveränderliche Build-Artefakte + RELEASE_INFO
current  -> releases/<commit>     kanonischer Zeiger, wird atomar umgelegt
previous -> releases/<commit>     Ziel des Rollbacks
app      -> current               Pfad, den nginx ausliefert
```

`app` bleibt der von nginx ausgelieferte Pfad (`root /srv/hufi/business/hufmanager/app;`) — **die nginx-Konfiguration muss nicht angefasst und nicht neu geladen werden.** Beim ersten Lauf stellt das Skript einmalig um: das heutige echte Verzeichnis `app/` wird nach `releases/legacy-app-<ts>/` verschoben, `previous` zeigt darauf, danach existieren nur noch Symlinks. Der Alt-Stand bleibt damit als sofortiges Rollback-Ziel erhalten und wird von der Aufräumlogik nie automatisch gelöscht.

**Was das Skript vor dem Umschalten erzwingt**

| Gate | Verhalten bei Verstoß |
|---|---|
| `.env.hufmanager` vorhanden, `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` gesetzt | Abbruch |
| URL ist **keine** Staging-/Localhost-Adresse (`huficloud`, `hufmanager-staging`, `localhost`, `127.0.0.1`, `:54321`) | Abbruch |
| Build aus **sauberem git-Worktree** auf dem angegebenen Commit (unkommittierte Änderungen im Hauptbaum sind irrelevant) | — |
| Supabase-Host im Bundle | Abbruch, nichts deployed |
| Supabase-Key-Fingerprint im Bundle | Abbruch, nichts deployed |
| Keine Staging-Adresse im Bundle | Abbruch, nichts deployed |
| Secret-Scan (`service_role`, private keys) | Abbruch, nichts deployed |
| `index.html` + nicht-leeres `assets/` im fertigen Release | Abbruch vor dem Umschalten |
| Smoke-Test gegen `https://app.hufmanager.de/` | **automatischer Symlink-Rollback** auf `previous` |

Der Release wird in einem Staging-Verzeichnis aufgebaut und erst per `mv -T` (rename) nach `releases/<commit>/` finalisiert — ein abgebrochener Lauf hinterlässt damit kein halbes Release. Das Umschalten selbst geht ebenfalls über `rename()` auf einen danebengelegten Symlink, ist also atomar; es gibt keinen Moment, in dem der Webroot leer oder halb ausgetauscht ist.

Ein erneuter Deploy desselben Commits kollidiert nicht: existiert `releases/<commit>` bereits, hängt das Skript einen UTC-Zeitstempel an. Bestehende Release-Verzeichnisse werden nie überschrieben.

**Warum diese Reihenfolge zwingend ist:** Die neue `invite-client-with-password` ruft `create_pending_client_invite_v1` und `create_invited_customer_with_contact` auf. Beide existieren in Production noch nicht. Ein Function-Deploy vor den Migrationen macht jede Einladung sofort funktionsunfähig. Umgekehrt ist die Migration ohne neue Function unkritisch (§4, Rückwärtskompatibilität).

---

## 10. Verifikation nach jedem Schritt

### 10.1 Nach den Migrationen (read-only)
```sql
-- alle 9 Versionen müssen gelistet sein
select version from supabase_migrations.schema_migrations
 where version in ('20260917120000','20260917125000','20260917130000','20260917140000',
                   '20260917150000','20260917155000','20260917160000',
                   '20260920120000','20260920190000') order by version;

-- Objekte vorhanden?
select to_regclass('public.hm_pending_client_invites');
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and proname in
 ('create_customer_with_contact','create_invoice_with_items_for_provider',
  'create_pending_client_invite_v1','bind_pending_client_invite_v1',
  'invalidate_pending_client_invite_v1','create_invited_customer_with_contact',
  '_hm_normalize_email','_hm_has_active_pending_client_invite');

-- Blocker-1-Guard wirklich aktiv?
select pg_get_functiondef(oid) like '%created_by_provider_id <> p_provider_id%' as guard_aktiv
  from pg_proc where proname='create_invited_customer_with_contact';
```
**Erwartung:** 9 Versionen, Tabelle vorhanden, 8 Funktionen, `guard_aktiv = true`.
Zusätzlich: bestehende Daten unangetastet — Zeilenzahlen `profiles`, `horses`, `appointments`, `invoices`, `invoice_items` vor/nach identisch.

### 10.2 Nach dem Function-Deploy
```bash
# muss ohne Token abweisen (kein 5xx, kein 503)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/invite-client-with-password
# erwartet: 401
```
Versionsnummern müssen gestiegen sein (v6→v7, v78→v79, v39→v40) und Status `ACTIVE`.
Funktionaler Beweis folgt im Smoke (§12, Schritt 11) — **nicht** mit echten Kundendaten.

### 10.3 Vor dem Webroot-Austausch (am frischen Build)
```bash
grep -rl "vnschgjxkzzwzefqlrji.supabase.co" dist/assets/*.js | head -1     # muss treffen
grep -rl "hufmanager-staging\|huficloud" dist/ | wc -l                     # muss 0 sein
grep -rl "INVOICE_ITEMS_MISSING" dist/assets/*.js | head -1                # PDF-Fix enthalten
node scripts/scan-hufmanager-secrets.mjs dist                              # Secret-Scan
```

### 10.4 Nach dem Webroot-Austausch
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://app.hufmanager.de/        # 200
```
Im Browser: Hard-Reload (Service-Worker!), `/auth` lädt ohne weißen Screen, Konsole ohne `createClient`-Fehler.

---

## 11. Rollback-Plan

### 11.1 DATENBANK

| Feld | Inhalt |
|---|---|
| `TRIGGER_FOR_ROLLBACK` | Migration bricht ab; Kernflow (Kunde/Termin/Rechnung anlegen) schlägt nach Migration reproduzierbar fehl; Zeilenzahlen der Kerntabellen verändert |
| `ROLLBACK_ACTION` | **Keine improvisierten Down-Migrationen.** Die Migrationen sind additiv — bevorzugt **Forward-Fix** oder gezieltes `DROP FUNCTION`/`DROP TABLE` der neu angelegten Objekte. Nur wenn Daten beschädigt sind: **Restore aus dem Dump (§7 A) bzw. PITR** |
| `ROLLBACK_ARTIFACT` | `$RELDIR/db/hufmanager-prod-full-*.dump`, `$RELDIR/db/hufmanager-prod-schema-*.sql`, Supabase-PITR, `$RELDIR/meta/prod-migrations-before.txt` |
| `EXPECTED_RECOVERY` | Gezieltes DROP: Minuten, kein Datenverlust. Vollrestore: abhängig von der DB-Größe; Datenverlust ab Dump-Zeitpunkt — deshalb letzte Wahl |

Gezielter, nicht-destruktiver Teil-Rollback (verändert keine Nutzdaten):
```sql
drop function if exists public.create_invited_customer_with_contact(uuid,uuid,jsonb,jsonb);
drop function if exists public.bind_pending_client_invite_v1(uuid,uuid,uuid);
drop function if exists public.invalidate_pending_client_invite_v1(uuid,uuid,text,boolean);
drop function if exists public.create_pending_client_invite_v1(uuid,text,text,integer);
drop function if exists public.create_invoice_with_items_for_provider(uuid,uuid,jsonb,jsonb);
drop function if exists public.create_customer_with_contact(jsonb,jsonb);
-- handle_new_user auf die Vorfassung zurücksetzen: aus dem Schema-Dump (§7 B) entnehmen
```
⚠️ `hm_pending_client_invites` erst löschen, wenn die alte Edge-Function-Version wieder aktiv ist.

### 11.2 EDGE FUNCTIONS

| Feld | Inhalt |
|---|---|
| `TRIGGER_FOR_ROLLBACK` | Einladung liefert reproduzierbar 5xx; Rechnungserzeugung über Autoflow/Hufi bricht; Function-Status ≠ `ACTIVE` |
| `ROLLBACK_ACTION` | Redeploy der gesicherten Vorversion je Function einzeln: `supabase functions deploy <name> --project-ref vnschgjxkzzwzefqlrji` aus `$RELDIR/functions/<name>-prod-before` — alternativ Version-Rollback im Supabase-Dashboard |
| `ROLLBACK_ARTIFACT` | `$RELDIR/functions/*-prod-before/`, Zielversionen `invite-client-with-password=v6`, `autoflow-auto-invoice=v78`, `hufi-agent=v39` |
| `EXPECTED_RECOVERY` | < 5 Minuten pro Function, kein Datenverlust. **Achtung:** Mit der alten `invite-client-with-password` ist der Cross-Provider-Ghost-Schutz wieder offen — nur als Notfallmaßnahme, dann Forward-Fix priorisieren |

### 11.3 FRONTEND

| Feld | Inhalt |
|---|---|
| `TRIGGER_FOR_ROLLBACK` | Weißer Screen, `/auth` lädt nicht, `createClient`-Fehler, PDF/Rechnung im Browser fehlerhaft |
| `ROLLBACK_ACTION` | `./deploy.sh hufmanager --rollback` — schaltet `current` atomar auf `previous` zurück. Danach Hard-Reload, ggf. Service-Worker-Cache invalidieren. Bei Smoke-Test-Fehlschlag passiert das bereits automatisch |
| `ROLLBACK_ARTIFACT` | `previous`-Symlink → beim ersten Deploy `releases/legacy-app-<ts>/` (der heutige Webroot, 17 MB, Stand 2026-09-12 11:39), danach jeweils das vorherige Release. Zusätzlich die unabhängige Kopie `$RELDIR/webroot/app-before/` aus §7 E |
| `EXPECTED_RECOVERY` | Sekunden (ein `rename()`), kein Datenverlust. Frontend-Rollback ist von DB und Functions unabhängig durchführbar |

**Reihenfolge im Ernstfall:** zuerst Frontend (schnellster sichtbarer Effekt), dann Functions, DB nur wenn Daten betroffen sind.

---

## 12. Production-Smoke (kurz, nach dem Deploy)

Mit einem **dedizierten Production-Testkonto**. Keine bestehenden Kundendaten verändern. Keine Cross-Provider-Security-Tests mit echten Kunden.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | Login `app.hufmanager.de` | Landet auf „Heute", kein weißer Screen |
| 2 | Testkunde anlegen | Toast „Kunde angelegt", Kunde erscheint in der Liste |
| 3 | Pferd anlegen | Pferd korrekt dem Testkunden zugeordnet |
| 4 | Termin anlegen | Termin in „Heute"/Kalender auffindbar |
| 5 | Termin abschließen | Status „Erledigt" |
| 6 | Dokumentation speichern | Notiz nach Reload vorhanden |
| 7 | Rechnung mit **2 Positionen** (z. B. 65,00 € + 25,00 €) | Gesamt 90,00 €, Rechnungsnummer vergeben |
| 8 | PDF öffnen/herunterladen | **beide** Positionen mit Menge/Einzelpreis/Zeilensumme, Gesamt 90,00 €, richtiger Kunde + Kundennummer, keine Sammelzeile |
| 9 | Status auf „Bezahlt" setzen | Toast + Statuswechsel |
| 10 | Reload | Status „Bezahlt", Kunde, Pferd, Termin unverändert |
| 11 | Einladung an eine **Testadresse** senden | `200`, Einmalpasswort wird angezeigt, Kundendatensatz bleibt beim Testprovider |

Abschließend Testdaten des Testkontos wieder entfernen (nur eigene, nur Testkonto).

---

## 13. Monitoring nach dem Release (erste 24 h)

- Supabase → Logs → Edge Functions: Fehlerquote von `invite-client-with-password`, `autoflow-auto-invoice`, `hufi-agent`
- Postgres-Logs auf `RAISE WARNING autoflow_on_appointment_*` (erwartet, solange Vault leer ist)
- `select count(*) from public.hm_pending_client_invites where consumed_at is null and invalidated_at is null and expires_at > now();` — Dauerhaft hohe Werte deuten auf abbrechende Einladungen
- Verwaiste Profile beobachten (bekannter P1, §14)
- nginx `access.log` für `app.hufmanager.de` auf 4xx/5xx-Anstieg

---

## 14. Bekannte technische Schuld (deferred, kein Release-Blocker)

**Orphan `public.profiles`-Zeilen nach abgewiesenem Cross-Provider-Invite**

Ein fail-closed abgewiesener Cross-Provider-Invite hinterlässt eine verwaiste Profilzeile: gleiche E-Mail, `created_by_provider_id = NULL`, kein Auth-User, keine Pferde, keine Grants. Ursache: `handle_new_user()` legt die Profilzeile innerhalb der Auth-Trigger-Transaktion an; beim Rollback wird der Auth-User gelöscht, `public.profiles` hat aber keinen Fremdschlüssel auf `auth.users`. Mehrere Fehlversuche erzeugen mehrere Zeilen.

Bewertung: für keinen Provider sichtbar, schwächt den Tenant-Guard nicht (Wiederholversuch bleibt fail-closed, verifiziert), kein Datenverlust. **Nach dem Release separat bereinigen und ursächlich beheben.**

Erkennungsabfrage (read-only, nach dem Release):
```sql
select count(*) from public.profiles p
 where p.created_by_provider_id is null
   and p.deleted_at is null
   and not exists (select 1 from auth.users u where u.id = p.id)
   and not exists (select 1 from public.horses h where h.owner_id = p.id)
   and not exists (select 1 from public.access_grants g where g.client_id = p.id);
```

Weitere bekannte, nicht release-blockierende Funde aus dem Browser-E2E (Parkplatz): Quick-Setup-Wizard schaltet beim Schritt „Business-Name" nicht weiter (Ausweg „Überspringen"), Doppelklick auf „Pferd anlegen" erzeugt eine Dublette, Invite-Fehlermeldungen zeigen technischen Text statt Klartext, Kunden-E-Mail wird nicht validiert, Finanz-KPI „Offen" zeigt 0,00 €.

---

## 15. STOP-Bedingungen

Das Deployment wird sofort abgebrochen, wenn:

1. ein Gate aus §8 auf FAIL steht,
2. das DB-Backup fehlt, leer oder nicht lesbar ist,
3. der Migrationsstand vor dem Release **nicht** `20260911191418` ist (dann hat jemand anderes deployt — Lage erst klären),
4. eine Migration mit Fehler abbricht,
5. die Verifikation aus §10.1 ein fehlendes Objekt oder `guard_aktiv = false` meldet,
6. nach dem Function-Deploy ein 5xx auftritt,
7. der Build `HUFMANAGER_BUILD=FAIL` liefert oder der Secret-Scan anschlägt,
8. im Production-Bundle eine Staging-URL auftaucht,
9. der Production-Smoke bei Schritt 7, 8 oder 9 (Rechnung/PDF/Zahlung) scheitert,
10. sich Zeilenzahlen der Kerntabellen unerwartet verändern.

In allen Fällen: **kein Weiterdeployen**, Rollback nach §11, Befund dokumentieren.

---

## 16. Zusammenfassung

| Bereich | Erforderlich |
|---|---|
| Migrationen | 9 (alle offen) |
| Edge Functions | 3 (alle übrigen unverändert) |
| Frontend | ja — kompletter Webroot-Austausch |
| Vault-Secrets | optional (Autoflow bleibt sonst inaktiv) |
| Production verändert durch diese Vorbereitung | **NEIN** |
