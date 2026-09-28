# HufManager Slim — Final Release & Stability Sprint (28.09.2026, ~21:00–00:30)

PROD Supabase `vnschgjxkzzwzefqlrji` · Web `app.hufmanager.de` · Branch `release/hufmanager-lifecycle-2026-09-11`

## 1. PROD-Stand (verifiziert)
| Komponente | Stand | Vorher (Rollback) |
|---|---|---|
| Frontend | `ceacdcb4` (releases/ceacdcb4abff) | `4dd8f1c3` → … → `5fb801d3` (`./deploy.sh hufmanager --rollback`) |
| admin-create-user | v136 (Repo `d1322f89`+) | v135 (`ae2c7861`-Stand), v134 (`e78f6c17`) |
| Migration-Head | `20260929120000` | Rollback-Skripte je Migration (s. §5) |

Heute auf PROD gebracht: account_class (Migration `20260929110000` + Backfill 25 IDs), Tab-/Auth-Lock-Fix `8f35838b`,
Kleinunternehmer-Rechnung (Migration `20260929120000`), Termin-Status-Fix, Membership-404-Fix, Dunkel-Modus-Farbfix,
Rechnungs-Pflichtdaten-Hinweis, Slim-Trial-Banner, Slim-Abo-Karte, Einladungsmail mit `support@hufmanager.de`.

## 2. Gefundene und behobene Fehler
| # | Prio | Befund (reproduziert) | Fix | Verifikation |
|---|---|---|---|---|
| 1 | P1 | Mission Control: `functions.invoke` hing ohne Request (Auth-Web-Lock origin-weit, Session pro Tab) | `8f35838b` tab-eigener Auth-Schlüssel | lokal 5 Browser-Szenarien; PROD live |
| 2 | P1 | QA/Test-Konten in Business-KPIs, „28 Grandfather“ falsch | `profiles.account_class` + Backfill | PROD: real 28 Provider, qa 11, test_fixture 8, demo 2; real Grandfather 19 |
| 3 | P1 | Termine mit Status `scheduled` (Kundenbuchung, Tour-Notfall, Schnell-Termin) vom DB-Trigger abgelehnt | → `planned` | SQL 6/6, PROD-Kernlauf 19/19, Vertragstest |
| 4 | P1 | Rechnung „Kleinunternehmer (§19)“ nicht speicherbar (CHECK nur privat/gewerbe) | Migration `20260929120000` | PROD: Rechnung + PDF mit §19-Hinweis |
| 5 | P1 | Dunkel-Modus: `text-foreground` fest #1A1510 (aktive `tailwind.config.js`) → Nummern/Beträge/Überschriften unlesbar, weiße Filter/Modals | neutrale Tokens → Theme-Variablen | Screenshots vorher/nachher hell+dunkel |
| 6 | P1 | Kein Trial-Hinweis/CTA während der Testphase; Abo-Seite zeigte Legacy „Starter Paket/Upgrade“ | Slim-Trial-Banner + Slim-Abo-Karte (CTA → PricingModal mit Widerrufs-Zustimmung) | PROD live mit QA-Trial |
| 7 | P2 | `get_product_membership_context` 404 auf jeder geschützten Route | HufManager fragt den nie angewendeten Splitter nicht mehr | PROD: 0 HTTP≥400 im Sweep |
| 8 | P2 | Rechnungen ohne Anbieter-Pflichtdaten (nur 2/28 echte Provider mit St.-Nr.) | nicht blockierender Hinweis mit Link (Blockieren = Owner-Entscheidung) | PROD live |
| 9 | P2 | Provider-Einladungsmail nannte `support@hufiapp.de` | `support@hufmanager.de` (admin-create-user v136) | Rücklese v136 |
| 10 | P3 | Assistent-Rechnungspfad `customer_type 'client'` | `privat` | Vertragstest |

## 3. Gates (frisch geprüft, nicht aus alten Berichten übernommen)
| Gate | Status | Evidenz |
|---|---|---|
| SECURITY | PASS | PROD `prod_security_smoke.py` 38/38, `prod_billing_access_smoke.py` 11/11, Kernlauf Fremdzugriff 6/6; alter P0 `services`-Leak: 0 fremde Leistungen für 3 Provider → behoben |
| DATABASE | PASS | Migrationen mit md5-Guard + Ledger; Funktionen md5 = lokal getestet; 0 verwaiste Rollen/Entitlements/Grants/Termine |
| AUTH | PARTIAL | Login/Logout/Reload/Multi-Tab PASS (Desktop+Mobil-Emulation); **Confirm Email AUS** (`mailer_autoconfirm=true`), Site-URL/Template nur im Dashboard änderbar (kein Mgmt-Token) |
| INVITE_EMAIL | PARTIAL | Branding korrigiert; DMARC `p=none`, Spam-Platzierung `info@` offen (DNS/Owner) |
| TRIAL | PASS | 14 Tage exakt, Banner ab Tag 1, CTA 19,95 €, Paid ohne Banner |
| MANUAL_ACCESS | PASS | Writer/Wrapper/Härtung live, 72/72 lokal, PROD-Smoke 11/11, 2 Cash-Bestände kanonisch |
| COPECART | BLOCKED (Owner) | Slim im alten Webhook hart gesperrt, Wahrheit hufi-data-core; echter Kauf-E2E braucht echte Zahlung |
| MISSION_CONTROL | PASS | KPIs nur real; Filter; Kontoart bei Anlage; Standard-Anlage auf Android PASS |
| CUSTOMER / HORSE / APPOINTMENT | PASS | PROD-Kernlauf 19/19 (anlegen, ändern, abschließen, Folgetermin, Neu-Login) |
| INVOICE / PDF | PASS | Nummer, Datum, Kunde+Anschrift, Positionen, Betrag, §19, Fälligkeit, Zahlart im PDF; Anbieterdaten erscheinen, sofern gepflegt |
| EMPLOYEE | PARTIAL | Einladung E2E PASS am 28.09. mittags; heute nicht erneut ausgeführt |
| MOBILE | PARTIAL | Mobil-Emulation (390×780, Touch) PASS inkl. PDF; echtes Android: Standard-Anlage PASS, voller Flow offen |
| DESKTOP | PASS | Chromium Desktop-Sweep: 6 Seiten, Reload, Logout/Login, 0 HTTP≥400, 0 Konsolenfehler |
| OFFLINE_CACHE | PARTIAL | Loginwechsel/Reload/Multi-Tab ok; Offline→Online nicht getestet |
| UI_UX | GOOD_ENOUGH_FOR_RELEASE | Dunkel-Modus lesbar, Trial/Abo klar |
| DATA_INTEGRITY | PASS | Entitlements byte-identisch vor/nach; nur QA-Zuwachs (+2 Kunden/Pferde/Termine, +1 Rechnung, als qa markiert) |
| PERFORMANCE | NOT_MEASURED | DB 204 MB, keine Auffälligkeiten |
| CRON_RETENTION | PASS | 9 003 job_run_details (ältester 4 Tage), 0 Fehlläufe/24 h |
| ROLLBACK | PASS | Rollback-Skripte je Migration, account_class-Rollback lokal durchgespielt (exakter Vorzustand), Frontend previous-Symlink, Edge-Vorversionen |

## 4. Offene Punkte
**P0: 0**

**P1 (nicht durch Code lösbar, Owner/Dashboard):**
1. Confirm Email aktivieren + Site URL `https://app.hufmanager.de` + Template „Confirm signup“ prüfen (Supabase-Dashboard → Authentication).
2. Echter CopeCart-Kauf-E2E (Trial-Konto → Checkout → hufi-data-core → PAID, kein Doppelabo).
3. Mail-Zustellung `info@hufmanager.de` (Spam): DMARC von `p=none` schrittweise verschärfen, Absender vereinheitlichen (Reset über `team@` landet im Posteingang).

**P2:** 22 Alt-Termine mit fremder Leistung (Guard verhindert neue); Partner-Einladung verweist auf HufiApp-Route; 9 weitere Edge Functions mit `support@hufiapp.de`;
God-Mode-Planliste (ohne Zugangswirkung); `copecart_pro`-VERIFIED_PAID nur Testzahlung (MANUAL_REVIEW); Blockieren der Rechnung ohne Anbieterdaten (Owner-Entscheidung); 1 Kundenprofil ohne Login mit Demo-Adresse.

**P3:** 1 Alt-Rechnung (01.01.2026, ohne Positionen) mit gelöschtem Provider; 54 ambiguous Alt-Termine (dokumentiert, nicht verändert); Assistent weiterhin per Feature-Flag aus.

## 5. Rollback
- Frontend: `./deploy.sh hufmanager --rollback` (previous-Symlink).
- `20260929120000`: `ALTER TABLE invoices DROP CONSTRAINT invoices_customer_type_check; ADD … ('privat','gewerbe')` — nur ohne Kleinunternehmer-Rechnungen.
- `20260929110000`: `docs/backups/mig20260929110000_rollback_PROD.sql` (vorher Frontend/Edge zurück).
- `20260929090000/100000`: `docs/backups/mig20260929_rollback_PROD.sql`.
- Edge admin-create-user: v135-Inhalt = `git show 5fb801d3:supabase/functions/admin-create-user/index.ts`.
- Backup: Prod-Dump `20260924-094320-post-mig9-pre-invite-deploy`; heutige Migrationen sind additiv, keine Daten gelöscht.

## 6. Tests (frisch)
vitest 392/392 · SQL: Manual-Access 72/72, Härtung 7/7, account_class 14/14, Trial 19/19, Release-Fixes 6/6 ·
PROD: Security 38/38, Billing/Access 11/11, Kernlauf 19/19, UI-Sweep Desktop+Mobil (0 HTTP≥400, 0 Konsolenfehler, PDF) ·
deno check admin-create-user · tsc: 0 Fehler in geänderten Dateien (131 Alt-Diagnosen Baseline).

## 7. Konto-Klassifizierung
real 107 Profile (28 Provider) · qa 13 (11 Provider + 2 QA-Testkunden) · test_fixture 8 · demo 6 (2 Provider).
Business-KPIs, Umsatz, Grandfather-Auswertung zählen nur `real`. `account_class` gewährt/entzieht keinen Zugang.

## 8. Einschätzung
Release-Vollständigkeit ≈ **88 %**. Code-seitig keine bekannten P0/P1 mehr offen; die verbleibenden P1 brauchen
Dashboard-/DNS-Zugriff bzw. eine echte Zahlung. SALE_READY erst nach P1 1–2.
