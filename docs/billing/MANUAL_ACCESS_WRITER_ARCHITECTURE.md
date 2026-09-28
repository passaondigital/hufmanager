# HufManager Slim — Manual-Access-Writer: Architektur + Rollback

Status: **lokal gebaut und getestet, NICHT auf PROD** (Stand 28.09.2026). Owner-Matrix freigegeben 28.09.2026.

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
- Enddatum = `new Date("YYYY-MM-DD")` = 00:00 UTC des Tages; `profiles.access_valid_until` spiegelt denselben Wert (Anzeige).

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
- Writer: `DROP FUNCTION public.hm_admin_set_hufmanager_manual_access_v1(uuid,text,timestamptz,text);`
  `DROP FUNCTION public.hm_set_hufmanager_manual_access_v1(uuid,text,timestamptz,text,uuid);`
- Enum-Werte `manual_access_granted/revoked` bleiben (Postgres kann sie nicht entfernen; ungenutzt harmlos).
- Bereits geschriebene Manual-Entitlements bleiben ACTIVE; mit altem Gate laufen befristete dann **nicht** mehr ab →
  vor Gate-Rollback betroffene Zeilen prüfen (`billing_provider='manual'`).
- Härtung: `docs/backups/mig20260929_profile_hardening_prestate_LOCAL.sql` zurückspielen.
- Edge: `git show b7bb6abd:supabase/functions/admin-create-user/index.ts` (= v134 = e78f6c17) erneut deployen.
- Frontend: `./deploy.sh` Rollback auf vorheriges Release (`previous`-Symlink).
