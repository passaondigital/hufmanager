# HufManager Lifecycle Stack — Production Readiness Runbook (V2.7)

Status: **DESIGN + STAGING-VERIFIED. NOT DEPLOYED TO PRODUCTION.** Nothing
in this document changes Production. It records what was found read-only,
what was built and proven on XXL-Staging, and the exact plan for a later,
separately-authorized Production deploy. HEAD at time of writing: `8e35a3df`
(HufManager local `main`), then this V2.7 commit.

## 1. Scheduler — what already exists, what this session added

**XXL-Staging** (`127.0.0.1:54322`): `pg_cron` 1.6.4, `cron` schema present.
9 pre-existing jobs before this session, 8 inactive mirrors of Edge
Function URLs (`net.http_post`), 1 active — `downgrade-expired-trials`,
which runs a **direct SQL `UPDATE`**, no HTTP hop. That is the real,
already-live precedent this session's own scheduler job follows.

**Production** (`vnschgjxkzzwzefqlrji`, read-only): same `pg_cron` 1.6.4.
**15 active jobs**, including an active `downgrade-expired-trials` using
the identical direct-SQL pattern. `pg_cron` is confirmed, real, in daily
production use — not something that would need to be introduced.

**Added this session (XXL-Staging only):**
- `public.hm_reconciler_runs` — small run-log table (counts only, no PII,
  no payload). No existing table fit this purpose (`hm_activity_log` is
  staff/admin activity audit — a different domain — checked before
  deciding a new table was warranted).
- `public.hm_reconcile_period_end_subscriptions_scheduled_v1()` — thin
  wrapper: calls the reconciler, records the run. The reconciler itself
  stays scheduler-agnostic.
- `cron.schedule('reconcile-period-end-subscriptions', '*/15 * * * *', ...)`
  — **XXL-Staging only**, live and active as of this session.

**Staging automation test — real pg_cron execution, not a manual call**
(schedule temporarily sped up to `* * * * *` for the test window, restored
to `*/15 * * * *` immediately after):

| Step | Result |
|---|---|
| Future-effective-date cancellation created | subscription_cancelled exists |
| Before due | 0 ended |
| Due candidate + poison candidate (blank identity) present together | — |
| First automatic tick (no manual reconciler call) | `scanned=2, applied=1, blocked_insufficient_identity=1` |
| Exactly one `subscription_ended` | confirmed |
| Second automatic tick | `scanned=0, applied=0` — no duplicate, poison candidate correctly excluded (not reprocessed) |
| Poison candidate | did not block the valid candidate in the same run |
| Issue handling | `RECONCILIATION_BLOCKED_INSUFFICIENT_IDENTITY` recorded correctly |

All synthetic rows removed after the test (events/state/lifecycle/issues/
reconciler_runs all back to 0). The `*/15 * * * *` job itself **remains
active on staging** — that is the intended lasting result of Part A, not
test residue.

## 2. Temporary refund / chargeback policy (explicit, until Pascal decides otherwise)

```
payment.refunded:
  - Provider Event/State erhalten
  - KEIN subscription_ended
  - KEIN automatischer Access-Entzug
  - BILLING_REVIEW_REQUIRED

payment.charged_back:
  - Provider Event/State erhalten
  - KEIN subscription_ended
  - KEIN automatischer Access-Entzug
  - BILLING_REVIEW_REQUIRED
```

Already the real, implemented behavior of `hm_project_copecart_lifecycle_v1`
(V2.6) — this section documents it as explicit product policy, not new
code. Never touches Kunden/Pferde/Termine/offene Arbeit/Dokumentation/
Rechnungen/Touren. No entitlement automation is built from this.

## 3. Production schema diff (read-only, this session)

| Object | Production | XXL-Staging | Verdict |
|---|---|---|---|
| `hufi_data_events` / `hufi_data_state` tables | **Exist**, 1 row / 1 row | Exist (mirrored in V2.4.1), 0 rows | Tables already present — foundation migration is a **SKIP/NO-OP for Production**, not re-runnable as-is (`CREATE TABLE` would fail) |
| Column definitions | 21 / 19 columns | Identical | Match |
| Constraint names + defs | 5 / 2 | Identical names and defs | Match |
| **Index names** | `hufi_data_events_customer_idx`, `_received_idx`, `_source_type_received_idx`, `_subscription_idx`, `_transaction_idx`; `hufi_data_state_customer_idx`, `_source_updated_idx`, `_subscription_idx` | `hufi_data_events_source_email_received_idx`, `_received_at_idx`, `_source_event_type_received_idx`, `_source_subscription_received_idx`, `_source_transaction_idx`; `hufi_data_state_source_email_idx`, `_source_received_idx`, `_source_subscription_idx` | **Names differ** (same columns/WHERE/order). Cosmetic only — no function/app references an index by name. Noted, not blocking. |
| `hufi_data_apply_state` function body | `pg_get_functiondef` md5 `5933380a7b2640971c511333c55e286a` | Same md5 | **Byte-identical** |
| RLS state | enabled, 0 policies, FORCE=false, both tables | Identical | Match |
| Grants | postgres + service_role only, both tables | Identical | Match |
| Extensions | pg_cron 1.6.4, pgcrypto 1.3, pg_net, uuid-ossp, supabase_vault, pg_stat_statements | pg_cron 1.6.4 confirmed; pgcrypto-equivalent (`gen_random_uuid()`) confirmed working | Sufficient |
| `hm_lifecycle_events` | **Absent** | Present | Real deploy target |
| `hm_lifecycle_reconciliation_issues` | **Absent** | Present | Real deploy target |
| `hm_reconciler_runs` | **Absent** | Present | Real deploy target |
| All `hm_*`/`hufi_data_ingest_and_project_v1`/`hm_project_copecart_lifecycle_v1`/reconciler functions | **Absent** (checked by name, all 9) | Present | Real deploy target |
| CopeCart IPN routing | `hufi-data-core` v3, confirmed via CopeCart dashboard (product `3a97bd25`) | n/a | Unchanged this session |

**PRODUCTION_SCHEMA_DIFF_COMPLETE=YES.** No STOPP condition: the only hard
conflict (tables already exist) resolves to SKIP, not a destructive
choice, and it was found, not assumed.

## 4. Migration stack (from real `git log`, oldest first)

| ORDER | FILE | PURPOSE | PRODUCTION_OBJECTS_TOUCHED | ADDITIVE_ONLY | EXISTING_OBJECT_CONFLICT_RISK | ROLLBACK_STRATEGY | PRECHECK | POSTCHECK |
|---|---|---|---|---|---|---|---|---|
| 1 | `20260910150140_add_hm_lifecycle_events.sql` | `hm_lifecycle_events` table + 3 enum types | None yet exist | YES | None (new object) | `DROP TABLE`/types if truly unused (verify 0 dependents first) | Confirm table/types absent | Confirm table exists, 0 rows, RLS on, 0 policies |
| 2 | `20260910210509_fix_hm_lifecycle_event_domain_idempotency.sql` | Fan-out-safe UNIQUE key | `hm_lifecycle_events` | YES | None | Revert constraint to prior 2-col form | Confirm current constraint | Confirm 3-col UNIQUE |
| 3 | `20260910213951_add_hm_lifecycle_events_domain_identity.sql` | `provider_subscription_id`, `domain_event_key`, `derived_from_observed` | `hm_lifecycle_events` | YES | None | Drop columns/index (only if 0 rows use them) | — | Columns/index present |
| 4 | `20260910221922_add_hm_lifecycle_events_effective_end_date.sql` | `effective_end_date` | `hm_lifecycle_events` | YES | None | Drop column (0 rows) | — | Column present |
| 5 | `20260910221923_add_hm_lifecycle_reconciliation_issues.sql` | Issues table | None yet exists | YES | None | Drop table (0 rows) | Confirm absent | Table + indexes present, RLS on, 0 policies |
| 6 | `20260910221924_add_hm_subscription_ended_domain_event_key_v1.sql` | Domain key helper | None yet exists | YES | None | `DROP FUNCTION` | Confirm absent | EXECUTE: anon/auth blocked, service_role only |
| 7 | `20260910221925_add_hm_billing_effective_end_at_v1.sql` | Effective-end helper | None yet exists | YES | None | `DROP FUNCTION` | Confirm absent | Same ACL check |
| 8 | `20260910223627_add_hm_apply_subscription_ended_outcome_v1.sql` | Shared ended-write primitive | None yet exists | YES | None | `DROP FUNCTION` + type | Confirm absent | ACL check + idempotency smoke test |
| 9 | `20260910224049_restrict_lifecycle_helper_function_execute.sql` | Explicit per-role REVOKE on the two Group-1 helpers | Grants only | YES | None | Re-grant (only if truly needed) | Confirm current (over-broad default) grants | anon/authenticated EXECUTE=false |
| 10 | `20260911055452_add_hm_lifecycle_cancellation_and_pause_foundation.sql` | `cancellation_mode`, `pause_until`, 3 new event_name values | `hm_lifecycle_events` | YES | None (0 rows on Production) | Columns droppable; **enum values cannot be removed** (Postgres limitation) — document as permanent, harmless if unused | Confirm 0 rows | New columns/enum values present |
| 11 | `20260911061736_add_hufi_data_staging_foundation.sql` | **SKIP on Production** — mirrors tables that already exist there | `hufi_data_events`/`state`/`apply_state` (already live, real data) | N/A | **HIGH if blindly applied** (`CREATE TABLE` fails / could shadow real data) | N/A — do not run | **Full diff first (done, section 3)** | Confirm still SKIP at deploy time (re-diff) |
| 12 | `20260911062904_add_hufi_data_ingest_and_project_v1.sql` | Atomic ingest primitive | None yet exists | YES | None | `DROP FUNCTION` + type | Confirm absent | ACL + 17-case test subset |
| 13 | `20260911064450_add_hm_reconcile_period_end_subscriptions_v1.sql` | Reconciler + 2 issue helpers | None yet exist | YES | None | `DROP FUNCTION` x3 | Confirm absent | ACL + 22-case test subset |
| 14 | `20260911070339_add_hm_project_copecart_lifecycle_v1.sql` | Lifecycle writer + `ALTER TYPE ADD ATTRIBUTE` on ingest result + `CREATE OR REPLACE` on ingest function | `hufi_data_ingest_and_project_v1` (Production's live function gets a new body) | YES (additive fields; body replaced) | **MEDIUM** — this is the one migration that changes an *already-live-on-Production* function's behavior, not just adds new objects | `CREATE OR REPLACE` back to the pre-V2.6 body (kept in git history at commit `3c53fc23`) | Read live function body first, diff against expected pre-V2.6 state | New result fields present; real webhook traffic (once Edge is cut over) still returns 200 for unmapped/blocked cases |
| 15 | `20260911072233_add_hm_reconciler_scheduler.sql` | `hm_reconciler_runs`, scheduled wrapper, **`cron.schedule` call — XXL-Staging only, must be split out for Production** | None yet exist (table/function part) | YES (table/function); scheduler line is its own step | None (table/function); scheduler creation is Part A's own deploy step | `DROP TABLE`/`FUNCTION`; `cron.unschedule` | Confirm absent | Table/function present; job created only at deploy step 10, not earlier |

**Only migration #14 touches an object Production already runs live**
(`hufi_data_ingest_and_project_v1`) — everything else is a pure new
object. #11's table/index/constraint DDL must be **skipped** on Production
(objects already exist); its purpose there is already satisfied.

## 5. Deploy order — validated against the real dependency chain, not copied blindly

The brief's suggested 15-step list was checked against actual `CREATE
FUNCTION` dependencies (what calls what) before being adopted:

1. **Full Production backup / restore point** (this session does not execute it — see §7)
2. **Production read-only prechecks** — re-run section 3's diff at deploy time (state may have changed since this report)
3. **Foundation DDL** (migrations #1–#10): `hm_lifecycle_events`,
   `hm_lifecycle_reconciliation_issues`, cancellation/pause columns —
   depends on nothing else in this stack
4. **Helper functions** (#6, #7 — domain key, effective-end) — depend on
   #1's enum types only
5. **Shared write primitive** (#8, #9) — depends on #4's helpers + #1's table
6. **Atomic ingest DB function** (#12) — depends on `hufi_data_events`/
   `hufi_data_state`/`hufi_data_apply_state` (already live on Production,
   confirmed identical in §3) — no dependency on steps 3–5 yet
7. **Lifecycle writer + ingest `CREATE OR REPLACE`** (#14) — depends on
   step 6 (the function it modifies) AND step 3 (`hm_lifecycle_events`)
   AND the `profiles` table (already live) — **this is the step that
   first makes the live `hufi_data_ingest_and_project_v1` write to
   `hm_lifecycle_events`; before this step, real CopeCart traffic through
   the (not-yet-deployed) new Edge Function would only touch
   `hufi_data_events`/`state`, exactly like today**
8. **Reconciler** (#13) — depends on steps 3–5 (reads `hm_lifecycle_events`,
   calls the shared primitive) — has **no dependency on step 6 or 7** and
   could technically go earlier, but reading real `subscription_cancelled`
   rows before step 7 exists would mean scanning zero candidates forever,
   so ordering it after 7 is operationally sensible, not a hard requirement
9. **Security/ACL verification** — re-run the `has_function_privilege`
   checks from every staging migration against Production after each
   group above, not only once at the end
10. **DB-only synthetic verification on Production** — the same kind of
    isolated INSERT/rollback smoke test already used repeatedly on
    staging this session (real data untouched, wrapped in a transaction
    that is rolled back, never committed)
11. **Scheduler activation** (Production `cron.schedule`, `*/15 * * * *`)
    — only after step 10 passes; this is a **separate, explicit action**,
    never implied by deploying migration #15's table/function
12. **`hufi-data-core` Edge Function deploy — LAST**, per the explicit
    DB-FIRST/EDGE-LAST rule below
13. **CopeCart routing re-confirmed** (dashboard, read-only, no change)
14. **Controlled E2E** with a real, low-value or test-mode CopeCart event
    if available, otherwise the first real webhook after cutover watched
    closely
15. **Monitoring** — watch `hm_reconciler_runs.fatal_error`,
    `hm_lifecycle_reconciliation_issues` OPEN count, and the Edge
    Function's own logs for the first 24–48h
16. **Rollback window** kept open (see §6) until the above is confirmed stable

## 6. DB-first / Edge-last (explicit rule, confirmed structurally sound)

The new `hufi-data-core` source (recovered + patched locally, V2.4.3
rewire) calls `hufi_data_ingest_and_project_v1` via `supabase.rpc(...)`.
If that Edge Function version were deployed **before** step 6/7 above
exist on Production, every real CopeCart webhook would fail at the RPC
call (function not found) — a hard outage for billing ingestion, worse
than the current state. **DB_FIRST_EDGE_LAST=CONFIRMED**, not just
asserted: verified by reading the actual `index.ts` call site (V2.4.3)
this session already built and tested.

## 7. Rollback plan

Migrations here are additive (schema/functions), so **DROP is not the
default rollback** — matches the explicit instruction and this stack's
own established principle.

| Layer | Rollback action | Data impact |
|---|---|---|
| Edge Function | Redeploy the **previous** `hufi-data-core` version (pre-V2.4.3: no lifecycle RPC call, only the two-step upsert+conditional-state flow) | None — `hufi_data_events`/`state` already-committed rows are untouched by a function code rollback |
| Scheduler | `SELECT cron.unschedule('reconcile-period-end-subscriptions');` | None — stops new `subscription_ended` writes; existing rows untouched |
| Lifecycle writer wiring | `CREATE OR REPLACE FUNCTION hufi_data_ingest_and_project_v1` back to the pre-V2.6 body (git commit `3c53fc23`) | Stops new `hm_lifecycle_events` writes; existing rows untouched |
| New DB objects (`hm_lifecycle_events`, issues table, reconciler, helpers, `hm_reconciler_runs`) | Left in place, unused | Zero effect on any existing HufManager functionality — nothing else reads from them (same reasoning already documented in the original 2026-09-10 implementation plan) |
| Absolute last resort | `DROP` only after confirming 0 rows depend on the object and no other migration references it | Only ever a manual, explicit, separately-authorized action |

Rollback order is the **exact reverse** of deploy order: Edge → Scheduler
→ Writer wiring → (DB objects stay).

## 8. Backup requirement (plan only — not executed this session)

- Full Production DB backup / restore point, taken immediately before step 1 of §5
- Current `hufi-data-core` v3 source + bundle hash already captured this
  session (`1cfe0fd65b3bdd8cc9b1fc959506ea24291baef1cd91c6bdb0f93ef600bfa1cd`,
  recovered into `supabase/functions/hufi-data-core/index.ts` at commit
  `eb3242ef`) — this **is** the "previous Edge Function version" §7 rolls
  back to
- Current Production state (this document, §3) serves as the documented
  before-state
- A real restore drill (not just a backup existing) is a precondition
  before this plan is executed for real — not performed in this
  DESIGN/STAGING session

## 9. CopeCart routing — read-only reconfirmed, unchanged

`HufManager Slim` product `3a97bd25` — CopeCart's account-wide IPN URL
confirmed (prior session, dashboard-verified) as
`hufi-data-core`. No dashboard change made or needed this session.

## 10. Hostinger / frontend boundary

Untouched. No DNS, no frontend deploy, no Hostinger change — this whole
track is billing/lifecycle DB + one Edge Function, operationally separate
from the Hostinger emergency-mirror work.

## 11. Go / No-Go matrix

```
DB_SCHEMA_READY=YES (staging-verified; Production diff complete, deploy order defined)
ATOMIC_INGEST_READY=YES
LIFECYCLE_WRITER_READY=YES
RECONCILER_READY=YES
SCHEDULER_READY=YES (staging-proven; Production job is its own deploy step)
EDGE_READY=YES (local source recovered + patched + rewired + tested; NOT deployed)
COPE_CART_ROUTING_CONFIRMED=YES
REFUND_POLICY_DEFINED=YES (temporary, explicit, documented above)
CHARGEBACK_POLICY_DEFINED=YES (temporary, explicit, documented above)
BACKUP_PLAN_READY=YES (plan documented; actual backup/restore drill NOT executed this session)
ROLLBACK_PLAN_READY=YES
MONITORING_READY=YES (plan documented; real dashboards/alerts NOT built this session)

PRODUCTION_GO_LIVE_GATE=PASS
```

**PASS here means: a technically executable, dependency-checked Go-Live
plan exists and every component behind it is staging-proven.** It does
**not** mean deploy now — the actual backup drill, the real Production
migration run, and the Edge deploy are separate, explicitly-authorized
future actions, not implied by this report.
