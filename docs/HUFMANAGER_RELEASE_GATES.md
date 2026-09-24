# HufManager Slim — Release Gates

**Stand:** 24.09.2026 nach Deploy · Edge `9f82803e` · Frontend `b15b6133` · Production `vnschgjxkzzwzefqlrji`
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
| FIRST_LOGIN | BLOCKED | frische Registrierung (QA A/B + echter Neukunde 23.09.) erhält kein Slim-Entitlement → Access-Gate „Kein aktiver Zugang“, keine Testphase; vorbestehend seit ≥12.09. |
| TENANT_ISOLATION | PARTIAL | QA A↔B: fremde Profile/Grants/Kontakte unsichtbar, Pending-Invites 403, gefälschter Grant 403; Tenants noch ohne Daten → befüllter Test offen |
| CLIENT_INVITE | PARTIAL | Fix live (v8/v9/v118 + Frontend b15b6133); Negativpfade mit echten QA-JWTs PASS; positiver Invite-E2E offen, weil QA-Tenants weder Pro noch Slim-Entitlement haben |
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
| SECURITY | PARTIAL | Invite-P0 + PII-Logging + Allowlist live geschlossen; offen: Rotation COPECART_IPN_PASSWORD/DATACORE_SECRET, Demo-Konto-Passwort, Löschung create-demo-business-user/-stallbetreiber-user |
| MONITORING | PARTIAL | `system-health-check`, `anomaly-detection`, `validate-backup` laufen per Cron; kein Alerting-Nachweis |
| BACKUP | PARTIAL | Prod-Dump 24.09. post-#9 verifiziert; Edge-Backup 24.09.; kein Storage-Backup, kein Offsite-Nachweis |
| RESTORE | PARTIAL | letzter Drill 11.09.; kein Restore-Test des 20.09.-Dumps |
| ROLLBACK | PARTIAL | Frontend: previous → legacy-app-20260924T075848Z bereit; Edge: Vorfassungen gesichert; Rollback selbst nicht geübt |
| STAGING_SMOKE | PARTIAL | RC 20.09. auf Staging getestet (Staging-Activation-Doku); Invite-Fix `7a13d19b` nicht auf Staging E2E-getestet |
| PRODUCTION_SMOKE | PARTIAL | Deploy-Smoke 0 Errors, Bundle-Inhalt verifiziert, Auth-/410-/403-Pfade live; positiver Invite + Kunden-CRUD offen (QA-Provisionierung) |
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
