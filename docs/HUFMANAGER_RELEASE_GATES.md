# HufManager Slim — Release Gates

**Stand:** 24.09.2026 · Code-HEAD `bcc3342d` · Production `vnschgjxkzzwzefqlrji`
Status nur: TESTED / PARTIAL / BLOCKED / UNKNOWN. Quelle der Wahrheit: `docs/CURRENT_STATE.md`.

| Gate | Status | Evidenz / was fehlt |
|---|---|---|
| SOURCE_OF_TRUTH | TESTED | Repo, Branch, Ledger, Edge-Versionen, Webroot, DNS live geprüft 24.09. |
| MIGRATION_LEDGER | TESTED | Release-Migrationen #1–#9 + Hardening im Prod-Ledger; Legacy-Drift klassifiziert und bewusst belassen |
| BUILD | TESTED | `./deploy.sh hufmanager --ref 7a13d19b --dry-run` inkl. Bundle-Gates (URL, Key, keine Staging-URL, Secret-Scan) |
| TYPECHECK | PARTIAL | 131 TS-Diagnosen = Baseline, 0 neue; Baseline selbst nicht abgebaut |
| UNIT_TESTS | TESTED | vitest 300/300 |
| DB_TESTS | PARTIAL | Funktions-/Negativtests je Migration in Prod (Ledger-Doku N3–N13); keine automatisierte SQL-Suite im CI |
| AUTH | PARTIAL | Edge-Auth statisch geprüft; kein frischer Browser-Login-Test gegen Production |
| FIRST_LOGIN | UNKNOWN | kein E2E mit frischer Identität in diesem Lauf; Parkplatz „Quick-Setup-Wizard hängt bei Business-Name" |
| TENANT_ISOLATION | PARTIAL | RPC-Cross-Tenant-Tests PASS (N4.7); **Invite-Pfad live offen bis Edge-Deploy**; kein 2-Tenant-UI-Red-Team |
| CLIENT_INVITE | BLOCKED | Fix im Repo, nicht deployt; Freigabe Pascal nötig |
| PARTNER_INVITE | UNKNOWN | nicht geprüft |
| INTAKE_IMPORT | UNKNOWN | nicht geprüft |
| CUSTOMER_HORSE | PARTIAL | RPC `create_customer_with_contact` in Prod; bekannte Dublette bei Doppelklick „Pferd anlegen" |
| APPOINTMENT | PARTIAL | Guards unit-getestet; kein E2E in diesem Lauf |
| TOUR | UNKNOWN | kein E2E |
| DOCUMENTATION | UNKNOWN | kein E2E |
| MATERIAL | PARTIAL | Cross-Tenant-Inventory-Test PASS (N4.7); Bestand/Verbrauch-Flow ungetestet |
| INVOICE_PDF | PARTIAL | Rechnungs-RPC Money/Atomicity/Idempotenz PASS in Prod; PDF-Fix im RC, aber Frontend nicht deployt |
| BILLING | BLOCKED | deployte copecart-webhook v164 weist echte IPNs ab (401) und loggt PII; Fix im Repo, Doppel-Writer-Entscheidung offen |
| COPECART_ROUTING | PARTIAL | Pascal: IPN → copecart-webhook; Logs 11.09.: dieselbe IPN auch an hufi-data-core (200) → zwei Ziele konfiguriert |
| LIFECYCLE | PARTIAL | Step 1 + Reconciler in Prod, 0 offene Issues; Step 2 nicht angewendet |
| MOBILE | UNKNOWN | keine Viewport-E2E in diesem Lauf |
| DRAFT_RESUME | UNKNOWN | nicht geprüft |
| SECURITY | BLOCKED | live: Invite-P0, create-demo-business-user mit öffentlichen Credentials, PII-Logging copecart-webhook; Fixes in bcc3342d nicht deployt; Rotationen offen |
| MONITORING | PARTIAL | `system-health-check`, `anomaly-detection`, `validate-backup` laufen per Cron; kein Alerting-Nachweis |
| BACKUP | PARTIAL | DB-Dump 20.09. (vor #1–#9), Edge-Backup 24.09.; kein aktueller DB-Dump nach #9, kein Storage-Backup, kein Offsite-Nachweis |
| RESTORE | PARTIAL | letzter Drill 11.09.; kein Restore-Test des 20.09.-Dumps |
| ROLLBACK | PARTIAL | Edge: wörtliche Vorfassungen gesichert; Frontend: Symlink-Rollback im Skript, erst nach erstem echten Deploy nutzbar |
| STAGING_SMOKE | PARTIAL | RC 20.09. auf Staging getestet (Staging-Activation-Doku); Invite-Fix `7a13d19b` nicht auf Staging E2E-getestet |
| PRODUCTION_SMOKE | UNKNOWN | kein Post-Deploy-Smoke, da nichts deployt |
| SUPPORT_RECOVERY | UNKNOWN | nicht geprüft |
| SALE_READY | BLOCKED | Security-P0 offen, Kernflow-E2E fehlt, Billing unbelegt |

## Blocker

1. **Invite-P0 live** — Deploy von `invite-client`, `invite-client-with-password`, `admin-create-client` + Frontend benötigt Pascals GO.
2. **Billing-Routing unbelegt** — CopeCart-Dashboard-Konfiguration (Produkt-ID → `hufi-data-core`-URL) muss Pascal bestätigen oder Zugang geben.
3. **Supabase CLI ohne Access-Token** — Edge-Deploy nur via MCP/Dashboard; CLI-Login (`! supabase login`) würde den dokumentierten Deploy-Pfad wieder öffnen.

## Next 3

1. Nach GO: frischen DB-Dump (Post-#9) ziehen → Edge-Functions namentlich deployen → `./deploy.sh hufmanager` → Invite-E2E aus zwei Providersichten + Negativtest „fremder Provider".
2. Kernflow-E2E (Login → Kunde → Pferd → Termin → Tour → Doku → Material → Rechnung/PDF) mit zwei befüllten Test-Tenants auf Staging, danach Read-only-Smoke in Production; Viewports 360/390/430 + Desktop.
3. Billing: CopeCart-Routing belegen, Contract-Tests (Duplicate/Out-of-order/Cancel/Ended) gegen lokale Supabase.

## Safe tasks für günstigere Agents

- Viewport-Screenshots/Smoke der bestehenden Staging-URL (read-only)
- Parkplatz-UX-Fixes (E-Mail-Validierung Kunde, Klartext statt 403/409, Doppelklick-Guard „Pferd anlegen", KPI „Offen") mit Unit-Tests, ohne DB-Änderung
- Restore-Drill des 20.09.-Dumps in eine lokale Wegwerf-DB

## Strong-model-only

- Billing-Canonical-Writer-Nachweis (`hufi-data-core` ↔ `copecart-webhook` ↔ `product_entitlements`)
- Ledger-Sanierung Weg B (falls je gewünscht)
- Ghost-/Orphan-Profil-Bereinigung (P1 aus Manifest)
- Abbau der Legacy-SECURITY-DEFINER-Exposition
