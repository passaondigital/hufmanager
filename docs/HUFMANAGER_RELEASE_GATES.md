# HufManager Slim — Release Gates

**Stand:** 25.09.2026 · Frontend `25d88773` · letzte Migration `20260925080000` · Production `vnschgjxkzzwzefqlrji`

> 25.09.: Trial-Begrenzung live; P0 Cross-User-Cache behoben + PROD-verifiziert; offen: E-Mail-Bestätigung (Dashboard), P1 Termin-Schreibguard, Mobile-Realgerät, CopeCart-Testkauf, UX-Konsolidierung. Details `docs/CURRENT_STATE.md` (25.09.).
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
| FIRST_LOGIN | PARTIAL | Wizard-Hänger behoben (2668a344, Browser-verifiziert); Trial live; Mobile nicht getestet. Vorher: | Trial live: frische Registrierung → TRIAL_ACTIVE 14 T.; UI-Durchlauf (Onboarding-Wizard, Mobile) nicht getestet |
| TENANT_ISOLATION | BLOCKED | Kunden/Grants/Kontakte/Invites isoliert (36/36), ABER Leistungskatalog (`services`) Cross-Tenant lesbar und in Terminen referenziert. Vorher: | Prod QA A↔B mit echten Kunden: 36/36 Adversarial-Checks (2× gelaufen), 0 fremde Grants |
| CLIENT_INVITE | TESTED | Prod: Invite A/B, Grant/Kontakt/Invite korrekt, kein Fallback; Resend 8/8; kein Passwort im Browser |
| PARTNER_INVITE | UNKNOWN | nicht geprüft |
| INTAKE_IMPORT | UNKNOWN | nicht geprüft |
| CUSTOMER_HORSE | TESTED | Prod-Browser: Kunde + Pferd anlegen, Reload, erneut öffnen; Doppelklick-Dublette gefunden und behoben (lokal+Prod verifiziert) |
| APPOINTMENT | BLOCKED | Anlage funktioniert (Doppelklick-sicher seit 76679463), aber Leistungsauswahl zeigt fremde Provider-Leistungen (P0) |
| TOUR | UNKNOWN | kein E2E |
| DOCUMENTATION | UNKNOWN | kein E2E |
| MATERIAL | PARTIAL | Cross-Tenant-Inventory (N4.7); Flow ungetestet |
| INVOICE_PDF | PARTIAL | Rechnungs-RPC Money/Atomicity PASS; PDF im Frontend live, nicht E2E getestet |
| BILLING | PARTIAL | Slim-Wahrheit einzig `hufi-data-core`→Lifecycle→Entitlements; Trial-Producer live; kein echter Zahlungs-E2E |
| COPECART_ROUTING | PARTIAL | IPN → copecart-webhook (ack-only v165) + hufi-data-core; Verifikation nach Rotation offen |
| LIFECYCLE | PARTIAL | Writer + Guard + Trial live, 0 offene Issues; Step 2 nicht angewendet |
| MOBILE | UNKNOWN | NOT_TESTED — E2E vor Mobile-Phase wegen P0 gestoppt |
| DRAFT_RESUME | UNKNOWN | nicht geprüft |
| SECURITY | BLOCKED | P0 vorbestehend: `services` für alle Authentifizierten lesbar, 22 echte Termine mit fremden Leistungen; SECRET_ROTATION = DEFERRED/RISK_ACCEPTED_BY_OWNER (kein Blocker). Vorher: | Invite-P0, PII-Log, Allowlist, Demo-Endpoints, Demo-Passwörter erledigt; offen: CopeCart-Secret-Rotation, P1 Provider darf Client-`email`/`created_by_provider_id` via RLS ändern, P2 fremde `profile_id` in Kontakt, Auto-Confirm Signup |
| MONITORING | PARTIAL | Cron-Health-Checks; kein Alerting-Nachweis |
| BACKUP | PARTIAL | Prod-Dump 24.09. verifiziert; kein Storage-Backup, kein Offsite |
| RESTORE | PARTIAL | letzter Drill 11.09.; Rollback-SQL Trial lokal getestet |
| ROLLBACK | PARTIAL | Frontend previous=`b15b6133`; Edge-Vorfassungen gesichert; Trial-Rollback lokal getestet; Prod-Rollback nicht geübt |
| STAGING_SMOKE | PARTIAL | lokal Trial/Webhook; kein Staging-Browser-E2E |
| PRODUCTION_SMOKE | TESTED | Final-Smoke 24.09.: Tenant 36/36, Resend 8/8, Trial, 410/401-Pfade, App 200, DB-Invarianten |
| SUPPORT_RECOVERY | UNKNOWN | nicht geprüft |
| SALE_READY | BLOCKED | P0 `services`-Leak; Kernflow ab Termin, Mobile, Billing-Zahlungs-E2E nicht belegt. Secret-Rotation ist KEIN Blocker (Owner-Risikoakzeptanz) |

## Blocker

1. **P0 Tenant-Leak `services`** — RLS-Policy + ungefilterte Provider-Formulare; 22 echte Termine mit fremden Leistungen.
2. **Kernflow ab Termin nicht E2E belegt** (Tour, Doku, Material, Rechnung/PDF) + Mobile NOT_TESTED — wegen STOP.
3. **Billing-Zahlungs-E2E** (Kauf → Paid Entitlement → Login) nicht belegt.

Nicht mehr blockierend: CopeCart-Secret-Rotation (`DEFERRED / RISK_ACCEPTED_BY_OWNER`, 24.09.2026).

## Next 3

1. Folgeauftrag P0 `services`: Provider-Formulare auf eigene Leistungen filtern + RLS so einschränken, dass Kunden nur Leistungen ihrer Provider (Grant) und Landing/Widget nur die eines Providers sehen; Bestandsaufnahme der 22 betroffenen Termine.
2. Kernflow-E2E fortsetzen (Termin → Tour → Doku → Material → Rechnung/PDF) + Mobile 360/390/430.
3. Billing-Zahlungs-E2E mit Pascal (Testkauf) nach Freigabe.

## Safe tasks für günstigere Agents

- Viewport-Screenshots/Smoke der bestehenden Staging-URL (read-only)
- Parkplatz-UX-Fixes (E-Mail-Validierung Kunde, Klartext statt 403/409, Doppelklick-Guard „Pferd anlegen", KPI „Offen") mit Unit-Tests, ohne DB-Änderung
- Restore-Drill des 20.09.-Dumps in eine lokale Wegwerf-DB

## Strong-model-only

- Billing-Canonical-Writer-Nachweis (`hufi-data-core` ↔ `copecart-webhook` ↔ `product_entitlements`)
- Ledger-Sanierung Weg B (falls je gewünscht)
- Ghost-/Orphan-Profil-Bereinigung (P1 aus Manifest)
- Abbau der Legacy-SECURITY-DEFINER-Exposition
