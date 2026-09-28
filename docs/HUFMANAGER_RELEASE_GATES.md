# HufManager Slim — Release Gates

**Stand:** 28.09.2026 spät (Final-Release-Sprint) · Frontend `ceacdcb4` · letzte Migration `20260929120000` · Production `vnschgjxkzzwzefqlrji` · Bericht `docs/release/HUFMANAGER_FINAL_RELEASE_REPORT_2026-09-28.md`

> 28.09. ~20:45: Manual-Access-Writer + Profil-Härtung LIVE (Ledger 20260929100000), admin-create-user v135, Frontend c8bbd096. 2 Barzahlungs-Bestände kanonisch (letzter Tag 15.01./27.02.2027, Grenze Folgetag 00:00 Berlin). Pre-Tests 72/72+7/7+19/19+vitest 363/363. Offen: Admin-E2E Mission Control (Standard/Lifetime/Cash/Beta/Legacy-400/Non-Admin/Härtung per JWT).
> 28.09. nachts: Owner-Matrix umgesetzt (LOKAL): admin-create-user + Mission Control an Manual-Writer angebunden, Beta mit Pflicht-Enddatum, Legacy-CopeCart/Employee aus Neuanlage entfernt, P2-Härtung Profil-Billing-Felder (20260929100000). Tests 59/59 + 7/7 + 19/19 + vitest 358/358. NICHT PROD — wartet auf Freigabe. Architektur/Rollback docs/billing/MANUAL_ACCESS_WRITER_ARCHITECTURE.md.
> 28.09. spätabends: Override-/Manual-Access-Audit fertig, Writer-Fix LOKAL (Migration 20260929090000, 50/50), NICHT PROD. Offen P1: befristete Grants laufen nie ab (Gate ohne Enddatum), Manual-Grants als VERIFIED_PAID, copecart_pro-Paid ohne Live-Zahlung, 28 AMBIGUOUS_ACTIVE_ONLY. Owner-Entscheidungen nötig. Bericht docs/billing/OVERRIDE_ENTITLEMENTS_AUDIT_2026-09-28.md.
> 28.09. abends: Admin-Provider-Trial-Fix LIVE (`admin-create-user` v134 = e78f6c17). PROD-E2E `+qa-trial-admin-0928c` PASS (1 Slim-Trial 14 T., 1 trial_started, Zugang, Login/Reload, kein Doppel-Trial). P1 Standard-Admin-Provider = DONE. Offen P1: Override-Pläne ohne Entitlement; Provider-Einladungsmail (info@hufmanager.de) kommt nicht in Gmail an; Mission-Control-Legacy-Anzeige; support@hufiapp.de.
> 28.09. nachm.: Auth-Routing-Fix LIVE (admin-create-user v133, send-provider-invitation v111, send-employee-invitation v95; Admin- + Employee-Invite E2E PASS; send-provider-invitation ohne UI-Aufrufer). HufiApp = eigenes Supabase-Projekt `oortmejcefbiewaceccc`. Neu P1: Admin-angelegte Provider ohne Slim-Entitlement; Mission Control zeigt Legacy-Plan/Service-Preis; support@hufiapp.de in Provider-Mails.
> 28.09.: net-Retention, Ghost-Grant-Fix und Termin-Guard-Admin-Nachbesserung LIVE (Ledger 20260928100000); Security-/Production-Smoke 38/38. Offen: Assistent (Anthropic-Guthaben), Confirm Email, Auth-Routing-Redirects, Billing-Zahlungs-E2E.
> 27.09.: Termin-DB-Guard LIVE (Ledger 20260927120000, PROD 9/9+7/7); hufi-agent-BOLA behoben, v41 LIVE (PROD 19/19). KI-Assistent live funktionslos (Anthropic-Guthaben). Details `docs/HUFMANAGER_SECURITY_FOLLOWUP_2026-09-27.md`.
> 25.09. abends: Auth-Routing-Audit — hufiapp.de live nutzt ANDERES Supabase-Projekt; ConnectForm-Redirect-Fix `1d1d33fe` (nicht deployt); Termin-DB-Guard offen. Gesamtbericht `docs/HUFMANAGER_SLIM_GESAMTBERICHT_2026-09-25.md`.
> 25.09.: Trial-Begrenzung live; P0 Cross-User-Cache behoben + PROD-verifiziert; offen: E-Mail-Bestätigung (Dashboard), P1 Termin-Schreibguard, Mobile-Realgerät, CopeCart-Testkauf, UX-Konsolidierung. Details `docs/CURRENT_STATE.md` (25.09.).
Status nur: TESTED / PARTIAL / BLOCKED / UNKNOWN. Quelle der Wahrheit: `docs/CURRENT_STATE.md`.

| Gate | Status | Evidenz / was fehlt |
|---|---|---|
| SOURCE_OF_TRUTH | TESTED | Repo/Branch/Ledger/Edge/Webroot live 28.09. spät; gepusht |
| MIGRATION_LEDGER | TESTED | PROD-Ledger bis `20260929120000`, jede Migration mit md5-Guard + Rollback-Skript |
| BUILD | TESTED | `./deploy.sh hufmanager` Frontend `ceacdcb4`, Bundle-Gates + Smoke 0 Errors |
| TYPECHECK | PARTIAL | 131 TS-Diagnosen = Baseline, 0 in geänderten Dateien |
| UNIT_TESTS | TESTED | vitest 392/392 (28.09. spät) |
| DB_TESTS | TESTED | Manual-Access 72/72, Härtung 7/7, account_class 14/14, Trial 19/19, Release-Fixes 6/6 (lokal, frisch) |
| AUTH | PARTIAL | Login/Logout/Reload/Multi-Tab PASS; Tab-Lock-Fix live; **Confirm Email AUS**, Site-URL/Template nur per Dashboard (Owner) |
| FIRST_LOGIN | PARTIAL | Wizard-Hänger behoben (2668a344, Browser-verifiziert); Trial live; Mobile nicht getestet. Vorher: | Trial live: frische Registrierung → TRIAL_ACTIVE 14 T.; UI-Durchlauf (Onboarding-Wizard, Mobile) nicht getestet |
| TENANT_ISOLATION | TESTED | PROD 38/38 + Kernlauf-Fremdzugriff 6/6; `services`-Leak behoben (0 fremde Leistungen) |
| CLIENT_INVITE | TESTED | Prod: Invite A/B, Grant/Kontakt/Invite korrekt, kein Fallback; Resend 8/8; kein Passwort im Browser |
| PARTNER_INVITE | UNKNOWN | nicht geprüft |
| INTAKE_IMPORT | UNKNOWN | nicht geprüft |
| CUSTOMER_HORSE | TESTED | PROD-Kernlauf 19/19 + UI Desktop/Mobil |
| APPOINTMENT | TESTED | Anlage/Änderung/Abschluss/Folgetermin PROD; Status-Bug `scheduled` behoben; 22 Alt-Termine mit fremder Leistung = P2-Daten |
| TOUR | UNKNOWN | kein E2E |
| DOCUMENTATION | UNKNOWN | kein E2E |
| MATERIAL | PARTIAL | Cross-Tenant-Inventory (N4.7); Flow ungetestet |
| INVOICE_PDF | TESTED | Rechnung atomar + PDF (Pflichtfelder, §19) PROD; Kleinunternehmer-Fix; Hinweis bei fehlenden Anbieterdaten |
| BILLING | PARTIAL | Trial/Manual/account_class live und getestet; echter CopeCart-Kauf-E2E offen (Owner) |
| COPECART_ROUTING | PARTIAL | IPN → copecart-webhook (ack-only v165) + hufi-data-core; Verifikation nach Rotation offen |
| LIFECYCLE | PARTIAL | Writer + Guard + Trial live, 0 offene Issues; Step 2 nicht angewendet |
| MOBILE | PARTIAL | Mobil-Emulation voll PASS; echtes Android nur Standard-Anlage |
| DRAFT_RESUME | UNKNOWN | nicht geprüft |
| SECURITY | TESTED | PROD 38/38 + Billing/Access 11/11; Self-Grant/Non-Admin/Entitlement-Schreiben/account_class blockiert |
| MONITORING | PARTIAL | Cron-Health-Checks; kein Alerting-Nachweis |
| BACKUP | PARTIAL | Prod-Dump 24.09. verifiziert; kein Storage-Backup, kein Offsite |
| RESTORE | PARTIAL | letzter Drill 11.09.; Rollback-SQL Trial lokal getestet |
| ROLLBACK | TESTED | previous-Symlink, Edge-Vorversionen, Rollback-SQL je Migration; account_class-Rollback lokal durchgespielt |
| STAGING_SMOKE | PARTIAL | lokal Trial/Webhook; kein Staging-Browser-E2E |
| PRODUCTION_SMOKE | TESTED | 28.09. spät: Security 38/38, Billing 11/11, Kernlauf 19/19, UI-Sweep 0 HTTP≥400 |
| SUPPORT_RECOVERY | UNKNOWN | nicht geprüft |
| SALE_READY | BLOCKED | P0 = 0. Offen P1 (Owner): Confirm Email/Site URL, echter Kauf-E2E, Mail-Zustellung info@ |

## Blocker

1. Confirm Email + Site URL + Template „Confirm signup“ (Supabase-Dashboard, Owner).
2. Echter CopeCart-Kauf-E2E (Owner, echte Zahlung).
3. Zustellung `info@hufmanager.de` (DMARC/Absender, DNS-Zugriff).

## Next 3

1. P1 1–3 oben erledigen, danach SALE_READY neu bewerten.
2. Echter Android-Durchlauf (Kunde → Termin → Rechnung → PDF) durch Pascal.
3. QA-Cleanup-Dry-Run (SAFE_DELETE / KEEP_AS_QA_FIXTURE / MANUAL_REVIEW), keine Löschung ohne Freigabe.

## Safe tasks für günstigere Agents

- Viewport-Screenshots/Smoke der bestehenden Staging-URL (read-only)
- Parkplatz-UX-Fixes (E-Mail-Validierung Kunde, Klartext statt 403/409, Doppelklick-Guard „Pferd anlegen", KPI „Offen") mit Unit-Tests, ohne DB-Änderung
- Restore-Drill des 20.09.-Dumps in eine lokale Wegwerf-DB

## Strong-model-only

- Billing-Canonical-Writer-Nachweis (`hufi-data-core` ↔ `copecart-webhook` ↔ `product_entitlements`)
- Ledger-Sanierung Weg B (falls je gewünscht)
- Ghost-/Orphan-Profil-Bereinigung (P1 aus Manifest)
- Abbau der Legacy-SECURITY-DEFINER-Exposition
