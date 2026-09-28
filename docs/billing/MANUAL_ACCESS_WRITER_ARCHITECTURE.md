# HufManager Slim — Manual-Access-Writer: Architektur + Rollback

Status: **LIVE auf PROD seit 28.09.2026 ~20:45** (Ledger 20260929090000 + 20260929100000, admin-create-user v135, Frontend c8bbd096). Owner-Matrix freigegeben 28.09.2026.

## Fluss
```
Mission Control (Anlage)  ──► admin-create-user (Edge, service_role) ──┐
Mission Control (Bearbeiten) ─► hm_admin_set_hufmanager_manual_access_v1 (authenticated, Akteur = auth.uid())
                                                                        ▼
                         hm_set_hufmanager_manual_access_v1 (SECURITY DEFINER, nur service_role)
                           1. validiert Grant-Art, Akteur=Admin, kein Self-Grant, Ziel=Provider, Enddatum, Grund
                           2. INSERT hm_lifecycle_events (manual_access_granted | manual_access_revoked, source=admin)
                           3. UPSERT product_entitlements (ACTIVE|LOCKED, billing_status=NONE, billing_provider='manual')
                                                                        ▼
            _hm_has_hufmanager_access_v1 · has_hufmanager_access_v1() (RLS) · get_hufmanager_access_context_v1()
            → manual: Zugang nur solange current_period_end IS NULL oder > now()
```

## Grant-Arten (Owner-Matrix)
| Mission Control | planOverride | Grant | Enddatum | Trial |
|---|---|---|---|---|
| HufManager Slim – 14 Tage testen, danach 19,95 €/Monat | NULL | – (Trial-Trigger) | – | ja, 14 Tage |
| Lifetime – manueller Dauerzugang | lifetime_grant | MANUAL_LIFETIME | verboten | nein |
| Barzahlung / manueller Zugang – Enddatum erforderlich | manual_cash_1y | MANUAL_FIXED_TERM | Pflicht, > jetzt, ≤ 5 J. | nein |
| Beta – kostenlos bis Enddatum | beta_tester | BETA_ACCESS | Pflicht, > jetzt, ≤ 5 J. | nein |
| (Bearbeiten: Grant-Plan → Standard) | NULL | REVOKE_MANUAL_ACCESS | – | – |

Nicht mehr wählbar: copecart_starter/pro/duo/team, copecart_anfaenger/fortgeschritten/profi, employee.
`admin-create-user` lehnt sie mit 400 ab, **bevor** ein Nutzer angelegt wird. Bestehende Legacy-Werte werden im
Bearbeiten-Dialog nur noch als „[Legacy] … – nicht mehr wählbar“ angezeigt.

## Garantien
- Nie `VERIFIED_PAID` (billing_status bleibt NONE); Zahlungen ausschließlich CopeCart → Lifecycle → Projektor.
- Bezahlte Zeilen: Grant → `skipped_paid_entitlement`, Revoke → `skipped_not_manual` (byte-identisch, T13).
- Trial-Zeilen: Revoke → `skipped_not_manual` (T15). Grant auf Trial → manuell ACTIVE (bewusste Admin-Aktion).
- Idempotent: gleicher Grant auf gleichem Zustand → `unchanged`, kein Event (T3). UNIQUE(user, product, plan).
- Revoke → `LOCKED`, Events + Metadaten bleiben, Re-Grant möglich (T14).
- Audit: producer, grant_type, valid_from/until, reason (≤ 200, ohne E-Mail), actor_id, previous_status/source.
- Projektor/Reconciler unverändert: neue Event-Namen sind dort No-Op.
- Enddatum-Semantik (Owner-Regel 28.09.2026, ersetzt die frühere 00:00-UTC-Regel):
  - ausgewähltes Datum = **letzter gültiger Kalendertag**, Zeitzone **Europe/Berlin**
  - interne Grenze `current_period_end` = Beginn des Folgetages Europe/Berlin
    (`hm_manual_access_exclusive_end_v1(D)` = `(D + 1)::timestamp AT TIME ZONE 'Europe/Berlin'`, DST-sicher)
  - Zugang solange `now() < current_period_end`; keine generelle 23:59:59-UTC-Regel, kein +24h auf UTC-Timestamps
  - Beispiele: 15.01.2027 → Ende 16.01.2027 00:00 Europe/Berlin (= 2027-01-15 23:00 UTC);
    27.02.2027 → Ende 28.02.2027 00:00 Europe/Berlin (= 2027-02-27 23:00 UTC)
  - Legacy-Timestamps (`profiles.access_valid_until`) werden nicht übernommen; maßgeblich ist das fachliche Datum.

## Dateien
- `supabase/migrations/20260929090000_add_hufmanager_manual_access_writer_v1.sql` (Writer, Wrapper, Gates)
- `supabase/migrations/20260929100000_harden_profile_billing_fields_v1.sql` (P2, unabhängig)
- `supabase/functions/admin-create-user/index.ts` (Plan-Whitelist, Enddatum-Pflicht, Writer-Aufruf, `manualAccess` in Antwort)
- `src/lib/providerPlanGrants.ts` (+ Test), `src/components/admin/AdminProviderTab.tsx`, `src/pages/admin/MissionControl.tsx`,
  `src/hooks/useHufmanagerSlimAccess.tsx` (Reason `ACTIVE_MANUAL`)
- Tests: `scripts/hufmanager-manual-access-tests.sql` (59/59), `scripts/hufmanager-profile-billing-hardening-tests.sql` (7/7)

## PROD-Reihenfolge (erst nach Freigabe)
1. Pre-State sichern: `pg_get_functiondef` der 3 Gates + `prevent_billing_self_update` von PROD (md5 vorher = lokal geprüft:
   Gates identisch; prevent_billing_self_update inhaltsgleich, nur Kommentare/CRLF abweichend).
2. Migration 20260929090000 als eigene Transaktion + Ledger-Eintrag; danach 20260929100000.
3. `admin-create-user` deployen (Code gegen Repo prüfen).
4. Frontend über `./deploy.sh`.
5. PROD-Smoke: QA-Provider je Lifetime / Barzahlung (Enddatum) / Beta (Enddatum) anlegen → Entitlement + Event + Zugang;
   Standard-QA → weiterhin Trial; Revoke auf QA-Lifetime; Security-Smoke.
6. Bestandsmigration nur Einzelfälle laut Audit (SAFE_MANUAL_FIXED_TERM = 2), jeweils per Admin-Wrapper, Evidenz vorher.

## Rollback
- Gates: Pre-State-Definitionen zurückspielen (lokal: `docs/backups/mig20260929_manual_access_prestate_functions_LOCAL.sql`).
- Writer: `DROP FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(uuid,text,date,text);`
  `DROP FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid,text,date,text,uuid);` `DROP FUNCTION public.hm_manual_access_exclusive_end_v1(date);` (komplett: `docs/backups/mig20260929_rollback_PROD.sql`)
- Enum-Werte `manual_access_granted/revoked` bleiben (Postgres kann sie nicht entfernen; ungenutzt harmlos).
- Bereits geschriebene Manual-Entitlements bleiben ACTIVE; mit altem Gate laufen befristete dann **nicht** mehr ab →
  vor Gate-Rollback betroffene Zeilen prüfen (`billing_provider='manual'`).
- Härtung: `docs/backups/mig20260929_profile_hardening_prestate_LOCAL.sql` zurückspielen.
- Edge: `git show b7bb6abd:supabase/functions/admin-create-user/index.ts` (= v134 = e78f6c17) erneut deployen.
- Frontend: `./deploy.sh` Rollback auf vorheriges Release (`previous`-Symlink).

## PROD-Deploy 28.09.2026 (Nachweis)
- Vorzustand = Rollback-Doku; Apply über `docs/backups/mig20260929090000_apply_canonical.sql` / `…100000_apply_canonical.sql` (md5-Guard).
- Nachher: alle Writer-/Gate-/Härtungsfunktionen md5-gleich mit dem lokal getesteten Stand; 2 Bestands-Cash-Fälle kanonisch.
- Rollback-Reihenfolge: (1) Frontend `./deploy.sh hufmanager --rollback` (→ 84d7d45d), (2) Edge v134 aus `e78f6c17`,
  (3) `docs/backups/mig20260929_rollback_PROD.sql` + Gates aus Pre-State — vorher die 2 manual-Zeilen bewerten
  (mit altem Gate liefen sie ohne Ablauf weiter).

