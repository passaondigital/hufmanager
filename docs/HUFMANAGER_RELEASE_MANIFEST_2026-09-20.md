# HufManager — Release Manifest 2026-09-20

```
RELEASE_BRANCH=release/hufmanager-lifecycle-2026-09-11
RELEASE_HEAD=110dffc5e41461a332f9574f9decf014259faadb
RELEASE_HEAD_PARENT=2f3b2a123ddce8495488460fbb1a7f669553ead7
RELEASE_HEAD_NOTE=RC eingefroren am 2026-09-20 20:30:39 +0200; 52 Dateien, 6611 Insertions, 760 Deletions; Worktree danach sauber (nur untracked supabase/.branches/)
RELEASE_DATE=2026-09-20
RELEASE_STATUS=RC_COMMITTED_NOT_DEPLOYED
PRODUCTION_PROJECT=vnschgjxkzzwzefqlrji
PRODUCTION_FRONTEND=app.hufmanager.de -> /srv/hufi/business/hufmanager/app
PROD_MIGRATION_STATE_BEFORE=20260911191418
```

## MIGRATIONS_PENDING
Reihenfolge ist bindend (9 von 9 offen, keine in Production vorhanden).

```
1  supabase/migrations/20260917120000_add_create_customer_with_contact_v1.sql
2  supabase/migrations/20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql
3  supabase/migrations/20260917130000_add_create_invoice_with_items_for_provider_v1.sql
4  supabase/migrations/20260917140000_fix_autoflow_trigger_auth_vault_v1.sql
5  supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql
6  supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql
7  supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql
8  supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql
9  supabase/migrations/20260920190000_fix_cross_provider_ghost_takeover_v1.sql
```

```
MIGRATIONS_ALREADY_APPLIED_IN_PROD=none
MIGRATIONS_BACKWARD_COMPATIBLE=YES   (additiv; keine Policy/Spalte entfernt; alte Edge Functions bleiben lauffähig)
```

## EDGE_FUNCTIONS_TO_DEPLOY

```
invite-client-with-password   prod=v6   verify_jwt_prod=false  verify_jwt_deploy=true(config-default)  PFLICHT (Blocker 1)
autoflow-auto-invoice         prod=v78  verify_jwt_prod=false  verify_jwt_deploy=false(config.toml)    PFLICHT (Migration 2/3)
hufi-agent                    prod=v39  verify_jwt_prod=false  verify_jwt_deploy=true(config-default)  PFLICHT-MIT-VORBEHALT -> --no-verify-jwt empfohlen, nicht im Smoke getestet
```

```
EDGE_FUNCTIONS_UNCHANGED=alle uebrigen Production-Functions
EDGE_DEPLOY_RULE=nur namentlich, niemals pauschal alle Functions deployen
EDGE_DEPLOY_DEPENDENCY=Migrationen 1..9 muessen vor dem Function-Deploy abgeschlossen sein
```

## FRONTEND_BUILD_COMMAND

```
./deploy.sh hufmanager --dry-run     # baut + prueft vollstaendig, schaltet nicht um
./deploy.sh hufmanager               # Deploy des aktuellen HEAD (= RC-Commit)
./deploy.sh hufmanager --ref <commit>
./deploy.sh hufmanager --list
./deploy.sh hufmanager --rollback    # current -> previous, atomar
```

```
FRONTEND_DEPLOY_DECISION=./deploy.sh hufmanager (Pascal, 2026-09-20): Build des eingefrorenen RC -> releases/<commit>/ -> pruefen -> current-Symlink atomar umschalten; Rollback = Symlink zurueck
FRONTEND_DEPLOY_SCRIPT=scripts/deploy-hufmanager.sh
FRONTEND_ENV_FILE=.env.hufmanager (gitignored, enthaelt VITE_APP_FLAVOR/URL/PUBLISHABLE_KEY der Produktion)
FRONTEND_STRUCTURE=releases/<commit>/ + current -> releases/<commit> + previous -> releases/<commit> + app -> current
FRONTEND_NGINX_CHANGE_REQUIRED=NO   (root bleibt /srv/hufi/business/hufmanager/app, app wird zum Symlink)
FRONTEND_FIRST_RUN_MIGRATION=bisheriges app/ wird nach releases/legacy-app-<ts>/ verschoben und als previous verlinkt
FRONTEND_BUILD_PRECONDITION=erfuellt — Build laeuft aus einem sauberen git-Worktree des Ziel-Commits
FRONTEND_RELEASE_REQUIRED=YES
PRODUCTION_BUILD_PRECHECK=PASS
PRODUCTION_BUILD_PRECHECK_NOTE=separater lokaler Build mit Prod-Env erfolgreich; 0 Treffer Staging-URL, Prod-Supabase-URL in 7 Chunks, PDF-Fix (INVOICE_ITEMS_MISSING) enthalten
```

## RC_QUALITY_STATE (gemessen am 2026-09-20, unveraendertes Produktcode-Set)

```
TESTS=PASS                       # vitest: 20 Dateien, 273 Tests gruen
SCOPED_LINT=PASS                 # HUFMANAGER_SCOPED_LINT=PASS files=23 existing_errors=42 existing_warnings=6
SCOPED_LINT_BASE=dd7d7faaddc6d10dc6b15d08449986ecaf93d56f
REAL_TYPECHECK_EXIT=2
REAL_TYPECHECK_DIAGNOSTICS=131   # entspricht exakt der bekannten Baseline
NEW_TS_REGRESSIONS=NO
DIFF_CHECK=PASS
```

## RELEASE_FILES

```
# Frontend - Rechnung/PDF (Blocker 2)
src/lib/invoicePdfGenerator.ts
src/lib/invoiceLineItems.ts
src/lib/invoiceLineItems.test.ts
src/lib/invoiceTax.ts
src/lib/invoiceTax.test.ts
src/lib/invoiceStatus.ts
src/lib/invoiceStatus.test.ts
src/lib/invoiceRpc.ts
src/components/invoices/CreateInvoiceModal.tsx
src/components/invoices/ClientInvoicesSection.tsx
src/components/dashboard/widgets/content/OpenInvoicesContent.tsx
src/components/slim/SlimFinanceScreen.tsx
src/pages/Rechnungen.tsx
src/pages/ClientInvoices.tsx

# Frontend - Kunde/Pferd/Einladung (Blocker 1)
src/components/customers/InviteByEmailModal.tsx
src/components/customers/AddCustomerModal.tsx
src/components/customers/AddHorseModal.tsx
src/components/customers/ClientDocumentsTab.tsx
src/components/slim/SlimCustomerHorseWorkspace.tsx
src/pages/Kunden.tsx

# Frontend - Termin/Tour/Heute
src/components/calendar/AppointmentFormModal.tsx
src/components/slim/SlimAppointmentModal.tsx
src/components/slim/TodayScreen.tsx
src/components/slim/SlimTourScreen.tsx
src/components/slim/TourLiveEditControl.tsx
src/components/onboarding/ProviderSetupWizard.tsx
src/lib/appointmentFormGuards.ts
src/lib/appointmentFormGuards.test.ts
src/pages/Kalender.tsx

# Frontend - Hufi-Agent-Anbindung an die neuen RPCs
src/lib/hufi-actions.ts
src/lib/hufi-agent-tasks.ts
src/lib/hufi-task-engine.ts
src/lib/hufi-tool-definitions.ts
src/lib/hufiActionTypes.ts
src/lib/hufiAgentMutatingTools.test.ts
src/lib/inviteTenantBinding.test.ts
src/integrations/supabase/types.ts

# Datenbank
supabase/migrations/20260917120000_add_create_customer_with_contact_v1.sql
supabase/migrations/20260917125000_add_autoflow_invoice_appointment_idempotency_v1.sql
supabase/migrations/20260917130000_add_create_invoice_with_items_for_provider_v1.sql
supabase/migrations/20260917140000_fix_autoflow_trigger_auth_vault_v1.sql
supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql
supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql
supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql
supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql
supabase/migrations/20260920190000_fix_cross_provider_ghost_takeover_v1.sql

# Edge Functions
supabase/functions/invite-client-with-password/index.ts
supabase/functions/autoflow-auto-invoice/index.ts
supabase/functions/hufi-agent/index.ts

# Dokumentation
docs/HUFMANAGER_STAGING_ACTIVATION_2026-09-20.md
docs/HUFMANAGER_PRODUCTION_RELEASE_PLAN_2026-09-20.md
docs/HUFMANAGER_RELEASE_MANIFEST_2026-09-20.md
```

```
RELEASE_FILES_COUNT=52
RELEASE_FILES_IDENTIFIED=YES
```

## EXCLUDED_FILES

```
supabase/.branches/_current_branch      # lokales Supabase-CLI-Artefakt, kein Produktcode
dist/                                   # Build-Output, gitignored, wird neu erzeugt
/tmp/hm_browser_driver.py               # temporaeres Browser-Testwerkzeug (Codex), kein Produktcode
/tmp/claude-*/scratchpad/**             # Test-, Screenshot-, Backup-Artefakte der Testsessions
hufmanager-staging-edge:pinned-20260920 # Docker-Image, reines Staging-Betriebsartefakt
```

```
UNRELATED_FILES_EXCLUDED=YES
UNRELATED_PROJECTS_IN_SCOPE=none
SHARED_FLAVOR_NOTE=mehrere src/components und src/lib Dateien werden auch von HufiApp genutzt; dieser Release tauscht ausschliesslich den HufManager-Webroot. HufiApp erhaelt die Aenderungen erst bei ihrem eigenen naechsten Deploy und ist dort separat zu testen.
```

## VAULT / ENV

```
PROD_VAULT_AUTOFLOW_FUNCTIONS_BASE_URL=MISSING
PROD_VAULT_AUTOFLOW_SERVICE_KEY=MISSING
PROD_VAULT_TOTAL_SECRETS=0
VAULT_IS_DEPLOY_BLOCKER=NO
VAULT_CONSEQUENCE=Autoflow-Auto-Invoice bleibt in Production inaktiv (Trigger loggt WARNING und ueberspringt den Aufruf); manueller Rechnungsweg unberuehrt
VAULT_NOTE=nur Namen geprueft, keine Secret-Werte gelesen, ausgegeben oder gespeichert
```

## KNOWN_DEFERRED_ISSUES

```
P1  orphan public.profiles rows after rejected cross-provider invite
    - kein Auth-User, created_by_provider_id NULL, keine Pferde, keine Grants
    - fuer keinen Provider sichtbar, Tenant-Guard bleibt fail-closed
    - nach dem Release separat bereinigen und ursaechlich beheben

PARKPLATZ  Quick-Setup-Wizard schaltet bei "Business-Name" nicht weiter (Ausweg: Ueberspringen)
PARKPLATZ  Doppelklick auf "Pferd anlegen" erzeugt eine Dublette; Pferde nicht editier-/loeschbar
PARKPLATZ  Invite-Fehler zeigen technischen Text statt Klartext (403/409)
PARKPLATZ  Kunden-E-Mail wird nicht validiert
PARKPLATZ  Finanz-KPI "Offen" zeigt 0,00 EUR trotz offener Rechnung
```

## SECURITY_PREFLIGHT (2026-09-20, read-only, Release-Scope)

```
SECURITY_PREFLIGHT=PASS
RELEASE_SCOPE_SECURITY=PASS
RELEASE_RPC_PERMISSIONS=PASS     # alle Release-RPCs SECURITY DEFINER + fixer search_path;
                                 # nur create_customer_with_contact ist authenticated-aufrufbar
                                 # (auth.uid()-Pflicht, provider-Rolle, Tenant aus auth.uid())
RELEASE_EDGE_AUTH=PASS           # alle drei Functions authentisieren sich selbst
TENANT_ISOLATION=PASS
SERVICE_ROLE_EXPOSURE=NO
CLIENT_SECRET_EXPOSURE=NO
ADVISOR_ERROR_LEVEL_FINDINGS=0

RLS_NO_POLICY_FINDINGS=INTENTIONAL_SERVICE_ONLY=YES fuer alle vier Tabellen
  (RLS an, 0 Policies, KEINE Tabellenrechte fuer anon/authenticated -> doppelt fail-closed)
SECURITY_DEFINER_ADVISOR_FINDINGS=deferred legacy (149 anon / 155 authenticated, pre-existing);
  Release fuegt 0 anon- und genau 1 authenticated-aufrufbare Funktion hinzu
PG_NET_PUBLIC=DEFERRED_HARDENING  # PostgREST exponiert nur public, graphql_public -> net nicht erreichbar
LEAKED_PASSWORD_PROTECTION=DEFERRED_HARDENING
NEW_P0_FINDINGS=none
NEW_P1_FINDINGS=none

EDGE_DEPLOY_VERIFY_JWT_NOTE=invite-client-with-password und hufi-agent mit --no-verify-jwt
  deployen, um den bestehenden Custom-Auth-Vertrag (prod=false) zu erhalten;
  autoflow-auto-invoice braucht false zwingend (Service-Key ist kein User-JWT)
```

## ROLLBACK_ARTIFACTS_REQUIRED

```
RELDIR=/srv/hufi/backups/hufmanager-release-2026-09-20

$RELDIR/db/hufmanager-prod-full-<ts>.dump        # pg_dump -Fc, Vollrestore
$RELDIR/db/hufmanager-prod-schema-<ts>.sql       # Schema-only, Quelle fuer handle_new_user-Vorfassung
$RELDIR/meta/prod-migrations-before.txt          # erwartet zuletzt 20260911191418
$RELDIR/functions/invite-client-with-password-prod-before/   # Ziel v6
$RELDIR/functions/autoflow-auto-invoice-prod-before/         # Ziel v78
$RELDIR/functions/hufi-agent-prod-before/                    # Ziel v39
$RELDIR/webroot/app-before/                      # 17 MB, Stand 2026-09-12 11:39
$RELDIR/meta/git-state-before.txt                # HEAD, Branch, Worktree-Status
$RELDIR/meta/prod-vault-names-before.txt         # nur Namen, keine Werte
SUPABASE_PITR                                    # Zeitpunkt vor dem Release notieren
```

```
BACKUP_PLAN_READY=YES
ROLLBACK_PLAN_READY=YES
ROLLBACK_ORDER=Frontend -> Edge Functions -> Datenbank (DB nur bei Datenschaden)
```

## GATES

```
GATE_0_WORKTREE_COMMITTED=PASS      # RC-Commit 110dffc5e41461a332f9574f9decf014259faadb, Worktree sauber
GATE_1_BACKUP=OPEN                  # beim Deploy
GATE_2_PROJECT_ID=PASS              # extern verifiziert: HufManager / vnschgjxkzzwzefqlrji / org lizhktkyzcthvflwydnm / eu-central-1 / ACTIVE_HEALTHY
GATE_3_NO_STAGING_URL=PASS          # 0 Treffer im Precheck-Bundle
GATE_4_VAULT_PRECONDITIONS=PASS     # bewusste Entscheidung dokumentiert
GATE_5_MIGRATIONS_IDENTIFIED=PASS   # 9 Migrationen, Reihenfolge fixiert
GATE_6_RELEASE_FILES_IDENTIFIED=PASS
GATE_7_ROLLBACK_ARTIFACTS=OPEN      # beim Deploy; Frontend zusaetzlich durch previous-Symlink abgedeckt
GATE_8_NO_UNKNOWN_FILES=OPEN        # beim Deploy
```

## STATUS

```
PRODUCTION_DEPLOYED=NO
PRODUCTION_CHANGED=NO
PRODUCTION_READ_ONLY_CHECKS_ONLY=YES
```
