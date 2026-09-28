# Admin-angelegte Provider ↔ Slim-Trial — Fix LIVE (28.09.2026)

Status: **LIVE auf PROD, E2E PASS** — `admin-create-user` **v134** (= Commit `e78f6c17`), deployt 28.09. ~14:02 UTC nach
ausdrücklicher Owner-Freigabe. Standard-Admin-Provider-P1 = **DONE**. Override-Entitlement-P1 bleibt **OFFEN** (siehe unten).

## Root Cause (PROD read-only verifiziert)
- `auth.users` AFTER INSERT → `handle_new_user`: schreibt `profiles` inkl. `signup_app := raw_user_meta_data->>'signup_app'`,
  **danach** `user_roles(provider)`.
- `user_roles` AFTER INSERT (`provider`) → `trg_user_roles_start_slim_trial` → `hm_start_hufmanager_slim_trial_v1` **nur wenn**
  `profiles.signup_app = 'hufmanager'`.
- `admin-create-user` (≤ v133) übergibt `user_metadata = {full_name, role}` ohne `signup_app` → Trigger greift nicht.
  Das spätere `profiles`-Update der Function kommt zu spät (Rolle existiert schon, Trigger feuert nicht erneut).
- Beleg PROD: QA-Provider `+qa-prov-0928` → `signup_app NULL`, kein `product_entitlements`-Eintrag,
  `_hm_has_hufmanager_access_v1 = false`; `profiles.subscription_*`/`trial_ends_at` sind nur Spalten-Defaults (Legacy).

## Fix
`supabase/functions/admin-create-user/index.ts`: bei Standard-Anlage (`planOverride` leer; UI-Wert „standard“)
`user_metadata.signup_app = 'hufmanager'` in **beiden** `createUser`-Pfaden (mit/ohne Passwort). Der Trial läuft damit über den
**bestehenden** Trigger + `hm_start_hufmanager_slim_trial_v1` im selben Auth-Insert. Kein zweiter Writer, keine Migration.
Zusätzlich read-only Kontrolle nach Anlage: Antwortfeld `slimTrial = active | missing | not_applicable`, bei `missing` Log
`Slim trial missing … <userId>` (keine PII außer UUID).

## Plan-Override-Matrix (Admin-UI `AdminProviderTab.tsx`)

| UI-Wert | planOverride | SHOULD_START_SLIM_TRIAL | nach Fix |
|---|---|---|---|
| standard | NULL | **YES** | 14-Tage-Trial über kanonischen Writer |
| copecart_starter / _pro / _duo / _team | gesetzt | **NO** (Zahlung/CopeCart ist Wahrheit) | kein Trial |
| copecart_anfaenger / _fortgeschritten / _profi (Legacy) | gesetzt | **NO** | kein Trial |
| lifetime_grant | gesetzt | **NO** (darf nicht verschlechtert werden) | kein Trial |
| manual_cash_1y | gesetzt | **NO** | kein Trial |
| beta_tester | gesetzt | **BUSINESS_DECISION_REQUIRED** | kein Trial (konservativ) |
| employee | gesetzt | **NO** (kein eigener Provider-Tarif) | kein Trial |

**Offene Lücke (P1, Business-Entscheidung):** Für Override-Pläne legt `admin-create-user` heute **gar kein** Entitlement an →
`_hm_has_hufmanager_access_v1 = false`. Bestehende Override-Kunden (lifetime 1, manual_cash_1y 2, copecart_pro 1) haben ihr
ACTIVE-Entitlement nur aus dem Legacy-Backfill; `copecart_starter` (1) hat keines. Lösung braucht einen kanonischen
Manual-Grant-Writer (Lifecycle-Event) — **nicht Teil dieses Fixes**.

## Tests
- DB: `scripts/hufmanager-admin-provider-trial-tests.sql` (simuliert `createUser` + Profil-Update der Function exakt), lokaler
  Supabase-Stack mit PROD-identischen Funktionen (md5 von `handle_new_user`, `hm_start_hufmanager_slim_trial_v1`,
  `hm_user_roles_start_slim_trial_trigger_v1`, Projektor, `_hm_reconciliation_issue_upsert_v1` = PROD):
  **19/19 PASS**; Negativkontrolle `-v legacy=1` (alter Code) **9/19** (T1, T2a/b, T7, T8a/c FAIL wie erwartet).
  T1 Standard neu → `signup_app=hufmanager`, genau 1 HUFMANAGER_SLIM, TRIAL_ACTIVE, exakt 14 Tage, Zugang true ·
  T2 erneuter Aufruf/gleiche E-Mail/Rollen-Reinsert/Writer erneut → kein 2. Trial; nach Entitlement-Löschung
  `skipped_trial_already_used` · T3 Paid-Entitlement unverändert (md5) · T4 lifetime/manual/beta/copecart → 0 Entitlements ·
  T5 employee-Override + echter Mitarbeiter → kein Trial · T6 Passwort setzen + Login → derselbe Trial · T7 Passwort direkt →
  identisch T1 · T8 erzwungener Trial-Fehler → Nutzer/Profil/Rolle angelegt, kein Entitlement, kein Zugang,
  `TRIAL_START_UNEXPECTED_ERROR` protokolliert.
- Edge: `src/lib/adminCreateUserTrialGuard.test.ts` 4/4, Negativkontrolle mit Altcode 2/4 FAIL; `deno check` sauber;
  vitest gesamt 347/347.

## Security Review
- `signup_app` ist serverseitige Konstante, kein Client-Input; Aufruf nur mit Admin-Rolle (401/403 unverändert).
- Keine neue Rechte-/RLS-/SQL-Änderung; Trial-Writer bleibt `service_role`-only und wird nur vom bestehenden Trigger aufgerufen.
- Doppel-Trial ausgeschlossen durch Writer-Guards (bestehendes Entitlement / `trial_started` pro Identität / Event-Key).
- Bezahlte/manuelle Entitlements werden nie überschrieben (Writer-Guard, T3).
- Fehlerfall fail-closed: kein Entitlement ⇒ kein Zugang; Issue protokolliert; Admin sieht `slimTrial: missing`.
- Neues Log enthält nur die User-UUID. Keine Findings.

## Nicht Teil des Fixes
- Kein Backfill für `+qa-prov-0928` (vor dem Fix angelegt, bleibt ohne Entitlement).
- `profiles.subscription_plan/subscription_status/trial_ends_at` bleiben Legacy/nicht kanonisch (Mission Control zeigt sie noch, P1).
- UI-Label „Standard (wartet auf Copecart)“ passt nach Fix nicht mehr (P2, Text).

## Deploy (nach Freigabe)
Nur `admin-create-user` per Supabase-MCP, `verify_jwt=true`; danach Live-Code gegen Repo prüfen; Smoke: Admin legt QA-Provider
„standard“ ohne Passwort an → `product_entitlements` TRIAL_ACTIVE 14 Tage, Antwort `slimTrial: active`.
Rollback: v133 = `git show 0d030bda:supabase/functions/admin-create-user/index.ts`.

## Nebenbefund lokal (kein PROD)
Beim Hash-Abgleich am 28.09. wurden die Migrationen 20260924120000/20260925080000 im **lokalen** Docker-Stack
`supabase_db_vnschgjxkzzwzefqlrji` versehentlich committet (Dateien enthalten eigenes `COMMIT`). Keine Daten erzeugt; lokale
Funktionen jetzt md5-identisch mit PROD; lokaler Ledger unverändert (`20260920120000`). Rückbau bei Bedarf:
`docs/backups/mig13_…prestate_rollback…sql`, `mig10_…prestate_rollback…sql`.

## PROD-Verifikation (28.09.2026)

**Deploy:** `admin-create-user` v133 → **v134** per Supabase-MCP, `verify_jwt=true`. Live-Code zurückgelesen und gegen
`e78f6c17:supabase/functions/admin-create-user/index.ts` abgeglichen (identisch; `signup_app`-Zweig + `slimTrial` vorhanden).
Smoke: OPTIONS 200, POST ohne JWT 401.

**Pre-Fix-Beleg (unverändert, NICHT repariert):** `barhufserviceschmid+qa-trial-admin-0928@gmail.com`
(`e77daad8-…`, angelegt 11:22 UTC mit v133, Standard, ohne Passwort) → `signup_app NULL`, 0 Entitlements, 0 Lifecycle-Events,
`_hm_has_hufmanager_access_v1 = false`, nie eingeloggt. Bleibt dauerhaft als Beleg des alten Zustands.
(`+qa-trial-admin-0928b` existiert in PROD nicht — Anlage kam nicht zustande.)

**Post-Fix-QA:** `barhufserviceschmid+qa-trial-admin-0928c@gmail.com` (`63e95b6f-…`, angelegt 14:04:58 UTC via Mission Control,
Standard, ohne Passwort, kein planOverride; Function-Log ohne „Slim trial missing“):

| Prüfung | Ergebnis |
|---|---|
| `auth.users.raw_user_meta_data.signup_app` / `profiles.signup_app` | `hufmanager` / `hufmanager` |
| `product_entitlements` | genau 1 · HUFMANAGER · HUFMANAGER_SLIM · TRIAL_ACTIVE · trial_status ACTIVE · billing_status NONE · source SYSTEM |
| Trial | 2026-09-28 14:04:58.279479Z → 2026-10-12 14:04:58.279479Z = exakt **14 days** |
| Lifecycle | genau 1 Event `trial_started` (source admin, producer `hm_start_hufmanager_slim_trial_v1`, reason `provider_role_assigned`, domain_event_key `hm-slim-trial-started:<uid>`) |
| `_hm_has_hufmanager_access_v1` | true |
| Passwortsetzung (Recovery-Link aus Gmail → `/update-password`) | PASS, kein neuer Trial |
| Login (frischer Browser) / Reload | `/home`, kein Kein-Zugang-Screen, Onboarding-Wizard, 0 Page-Errors / identisch |
| Nach Login: Entitlement-Count / Lifecycle-Count / `trial_ends_at` / `updated_at` | 1 / 1 / unverändert / unverändert |

QA-Zugangsdaten nur in `~/.config/hufmanager-qa/credentials.env` (`QA_TRIAL_ADMIN_0928C_*`).

**Nebenbefund (P1, offen):** Die Provider-Einladungsmail von `admin-create-user` (Absender `info@hufmanager.de`, Resend-ID
jeweils vorhanden, `error: null`) ist für `+0928` (11:22) und `+0928c` (14:04) **nicht im Gmail-Postfach angekommen**
(auch nicht Spam/Papierkorb). Auth-Mails von `team@hufmanager.de` (Recovery) kommen an. Login daher über „Passwort vergessen“
verifiziert. Ursache (Resend-Zustellstatus/Domain `info@`) noch zu prüfen.
