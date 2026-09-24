# HufManager Slim — Release Gates

**Stand:** 24.09.2026 abends · Frontend `992f9117` · Trial-Migration `20260924120000` · Production `vnschgjxkzzwzefqlrji`
Status nur: TESTED / PARTIAL / BLOCKED / UNKNOWN. Quelle der Wahrheit: `docs/CURRENT_STATE.md`.

| Gate | Status | Evidenz / was fehlt |
|---|---|---|
| SOURCE_OF_TRUTH | TESTED | Repo/Branch/Ledger/Edge/Webroot/DNS live 24.09.; Doku gepusht |
| MIGRATION_LEDGER | TESTED | Prod-Ledger bis `20260924120000` (Trial), keine neue Drift; Legacy-Drift dokumentiert |
| BUILD | TESTED | `./deploy.sh` Frontend `992f9117` inkl. Bundle-Gates, Deploy-Smoke 0 Errors |
| TYPECHECK | PARTIAL | 131 TS-Diagnosen = Baseline, 0 neue |
| UNIT_TESTS | TESTED | vitest 309/309; copecart Laufzeit-Check 10/10 |
| DB_TESTS | PARTIAL | Trial-Migration 17/17 lokal + Negativkontrollen; Invite-RPCs N4–N13; keine CI-Suite |
| AUTH | PARTIAL | Signup/Login/Token-Pfade live (QA), 401/403/410 geprüft; Password-Recovery nicht getestet |
| FIRST_LOGIN | PARTIAL | Trial live: frische Registrierung → TRIAL_ACTIVE 14 T.; UI-Durchlauf (Onboarding-Wizard, Mobile) nicht getestet |
| TENANT_ISOLATION | TESTED | Prod QA A↔B mit echten Kunden: 36/36 Adversarial-Checks (2× gelaufen), 0 fremde Grants |
| CLIENT_INVITE | TESTED | Prod: Invite A/B, Grant/Kontakt/Invite korrekt, kein Fallback; Resend 8/8; kein Passwort im Browser |
| PARTNER_INVITE | UNKNOWN | nicht geprüft |
| INTAKE_IMPORT | UNKNOWN | nicht geprüft |
| CUSTOMER_HORSE | PARTIAL | Kunde anlegen/verwalten (QA) live; Pferd-CRUD + Doppelklick-Dublette nicht getestet |
| APPOINTMENT | UNKNOWN | kein E2E |
| TOUR | UNKNOWN | kein E2E |
| DOCUMENTATION | UNKNOWN | kein E2E |
| MATERIAL | PARTIAL | Cross-Tenant-Inventory (N4.7); Flow ungetestet |
| INVOICE_PDF | PARTIAL | Rechnungs-RPC Money/Atomicity PASS; PDF im Frontend live, nicht E2E getestet |
| BILLING | PARTIAL | Slim-Wahrheit einzig `hufi-data-core`→Lifecycle→Entitlements; Trial-Producer live; kein echter Zahlungs-E2E |
| COPECART_ROUTING | PARTIAL | IPN → copecart-webhook (ack-only v165) + hufi-data-core; Verifikation nach Rotation offen |
| LIFECYCLE | PARTIAL | Writer + Guard + Trial live, 0 offene Issues; Step 2 nicht angewendet |
| MOBILE | UNKNOWN | keine Viewport-E2E |
| DRAFT_RESUME | UNKNOWN | nicht geprüft |
| SECURITY | PARTIAL | Invite-P0, PII-Log, Allowlist, Demo-Endpoints, Demo-Passwörter erledigt; offen: CopeCart-Secret-Rotation, P1 Provider darf Client-`email`/`created_by_provider_id` via RLS ändern, P2 fremde `profile_id` in Kontakt, Auto-Confirm Signup |
| MONITORING | PARTIAL | Cron-Health-Checks; kein Alerting-Nachweis |
| BACKUP | PARTIAL | Prod-Dump 24.09. verifiziert; kein Storage-Backup, kein Offsite |
| RESTORE | PARTIAL | letzter Drill 11.09.; Rollback-SQL Trial lokal getestet |
| ROLLBACK | PARTIAL | Frontend previous=`b15b6133`; Edge-Vorfassungen gesichert; Trial-Rollback lokal getestet; Prod-Rollback nicht geübt |
| STAGING_SMOKE | PARTIAL | lokal Trial/Webhook; kein Staging-Browser-E2E |
| PRODUCTION_SMOKE | TESTED | Final-Smoke 24.09.: Tenant 36/36, Resend 8/8, Trial, 410/401-Pfade, App 200, DB-Invarianten |
| SUPPORT_RECOVERY | UNKNOWN | nicht geprüft |
| SALE_READY | BLOCKED | fehlt: Kernflow-E2E (Termin/Tour/Doku/Material/Rechnung-PDF), Mobile, Secret-Rotation, Billing-Zahlungs-E2E |

## Blocker

1. **CopeCart-Secret-Rotation** — nur Pascal (Runbook `docs/HUFMANAGER_SECRET_ROTATION_RUNBOOK.md`).
2. **Kernflow-E2E fehlt** (Termin → Tour → Doku → Material → Rechnung/PDF, Mobile 360/390/430).
3. **P1 RLS:** verbundene Provider können `profiles.email` / `created_by_provider_id` / `has_logged_in` ihrer Kunden ändern.

## Next 3

1. Rotation nach Runbook + Test-IPN → Logs verifizieren (beide Endpoints 200, keine Mutation durch copecart-webhook).
2. Kernflow-E2E im Browser mit QA A (Kunde → Pferd → Termin → Tour → Doku → Material → Rechnung/PDF), Mobile-Viewports.
3. P1-RLS-Härtung `profiles` (BEFORE-UPDATE-Trigger gegen Fremdänderung von email/created_by_provider_id/has_logged_in) mit Tests.

## Safe tasks für günstigere Agents

- Viewport-Screenshots/Smoke der bestehenden Staging-URL (read-only)
- Parkplatz-UX-Fixes (E-Mail-Validierung Kunde, Klartext statt 403/409, Doppelklick-Guard „Pferd anlegen", KPI „Offen") mit Unit-Tests, ohne DB-Änderung
- Restore-Drill des 20.09.-Dumps in eine lokale Wegwerf-DB

## Strong-model-only

- Billing-Canonical-Writer-Nachweis (`hufi-data-core` ↔ `copecart-webhook` ↔ `product_entitlements`)
- Ledger-Sanierung Weg B (falls je gewünscht)
- Ghost-/Orphan-Profil-Bereinigung (P1 aus Manifest)
- Abbau der Legacy-SECURITY-DEFINER-Exposition
