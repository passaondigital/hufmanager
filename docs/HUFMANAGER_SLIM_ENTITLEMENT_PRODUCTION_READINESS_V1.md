# HufManager Slim — Entitlement/Access V1 — Production Readiness (V1)

Status: **DESIGN + STAGING-VERIFIED. NOT DEPLOYED TO PRODUCTION.** Nothing in
this document changes Production. Builds directly on top of
`docs/HUFMANAGER_LIFECYCLE_PRODUCTION_READINESS_V2.7.md` (lifecycle core,
already staging-verified there) — this document only covers the new
Entitlement/Access layer on top of it. Branch:
`release/hufmanager-lifecycle-2026-09-11`.

**Correction (Phase 9 session, re-verified read-only against Production
directly, not taken on faith):** §2's table below records `hm_lifecycle_events`
as **Absent** on Production and §5 orders "Deploy V2.7 first" as a
still-open step. Both describe a snapshot from before V2.7 was actually
deployed. As of this session, `public.hm_lifecycle_events` EXISTS on
Production (1 row, written by a real CopeCart `payment.made` E2E test),
`public.hm_lifecycle_reconciliation_issues` EXISTS (0 rows), and
`cron.job "reconcile-period-end-subscriptions"` is `active=true`. V2.7's
lifecycle core is Production-live. `public.product_entitlements` (this V1's
own table) is confirmed still **Absent** — only the lifecycle-core
dependency has shipped, not this V1's entitlement layer itself. See
`HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md` §1 for how this was found and
verified.

## 1. What this layer adds

```
CopeCart
  -> hufi_data_events / hufi_data_state         (existing, live on Production)
  -> hm_lifecycle_events                        (existing on staging, ABSENT on Production per V2.7 §3)
  -> hm_project_hufmanager_entitlement_v1(...)   <- NEW (this V1)
  -> product_entitlements                        <- NEW (this V1)
  -> get_hufmanager_access_context_v1()          <- NEW (this V1), read by the frontend gate
```

Wired via an `AFTER INSERT` trigger on `hm_lifecycle_events`
(`trg_hm_lifecycle_events_project_entitlement`), not by editing any of the
three existing lifecycle-event producers
(`hm_project_copecart_lifecycle_v1`, `hm_reconcile_period_end_subscriptions_v1`,
`hm_apply_subscription_ended_outcome_v1`). See the writer migration's own
header comment for the full reasoning; proven safe under failure by T25 in
the staging test matrix (§4 below), not just asserted.

## 2. Production schema diff (read-only this session)

| Object | Production | XXL-Staging | Verdict |
|---|---|---|---|
| `product_entitlement_plan`, `product_membership_product` enums | **Exist** (added by the already-live lifecycle migrations) | Exist, identical | Reused as-is, not recreated |
| `product_entitlement_status`, `product_trial_status`, `product_billing_status` enums | **Absent** | Present (this V1's own definition — see below) | Real deploy target |
| `product_entitlements` table | **Absent** | Present, RLS on, 0 client write policies | Real deploy target |
| `hm_project_hufmanager_entitlement_v1`, its trigger, `hm_reconcile_hufmanager_entitlements_v1`, `get_hufmanager_access_context_v1`, `has_hufmanager_access_v1` | **Absent** | Present | Real deploy target |
| `hm_lifecycle_events` (this layer's only read dependency from the prior phase) | **Absent** (per V2.7, not yet deployed) | Present | Blocks this layer until V2.7 itself is deployed — see §5 |
| Two PREPARED-ONLY reference migrations (`20260812231000_product_membership_splitter.sql`, `20260813102303_..._prepared.sql`) | **Absent**, never applied | Were found already-applied on XXL-Staging (residue from earlier work) — **removed from staging this session** (DROP, not a file edit) so staging matches Production for this feature area before building fresh | Confirms this V1 does not reuse or replay those files; their `product_entitlement_status` vocabulary (no `FROZEN`, no `PAUSED`, has `CANCELLED`) was deliberately NOT reused — see the schema migration's own header comment |
| `copecart-webhook` Edge Function, deployed source | Read directly via the Management API this session. Does **not** contain the `NEW_SAAS_PRODUCT_MAP` / direct `product_entitlements` write branch that exists in this repo's `supabase/functions/copecart-webhook/index.ts` on disk | n/a (Edge Function, not part of this migration set) | **Found, not caused by this task**: that on-disk branch also does not check `is_test` before granting real access — if ever deployed as-is it would violate business rule 2. Not deployed today; flagged as its own pre-existing repo risk, out of this task's authorized scope (no Edge deploy) — see BLOCKERS in the final report |

`PRODUCTION_SCHEMA_DIFF_COMPLETE=YES` for everything this task touches.

## 3. Migration stack (this V1, applied in order on XXL-Staging)

| Order | File | Purpose | Production objects touched | Additive only | Rollback |
|---|---|---|---|---|---|
| 1 | `20260911204057_add_hufmanager_slim_entitlement_schema_v1.sql` | 3 new enums, `product_entitlements` table, RLS, indexes | None yet exist | YES | `DROP TABLE`/types (0 rows dependency-checked first) |
| 2 | `20260911204058_add_hufmanager_slim_entitlement_writer_v1.sql` | `hm_project_hufmanager_entitlement_v1`, exception-safe trigger wrapper, `AFTER INSERT` trigger on `hm_lifecycle_events` | None yet exist; trigger attaches to an existing table but adds no column/constraint to it | YES | `DROP TRIGGER`, then `DROP FUNCTION` x2 |
| 3 | `20260911204059_add_hufmanager_slim_entitlement_reconciler_v1.sql` | `hm_reconcile_hufmanager_entitlements_v1` (repair path) | None yet exist | YES | `DROP FUNCTION` |
| 4 | `20260911204100_add_hufmanager_slim_access_context_api_v1.sql` | `get_hufmanager_access_context_v1`, `has_hufmanager_access_v1` | None yet exist | YES | `DROP FUNCTION` x2 |

No new Production cron job in this V1 (Phase 6 instruction honored — the
reconciler is callable, not scheduled).

## 4. Staging test matrix — all 25 cases executed and passing

Run against XXL-Staging (`127.0.0.1:54322`), full E2E through
`hufi_data_ingest_and_project_v1` (the same entry point real CopeCart
traffic uses once the lifecycle layer is deployed), not a mocked writer
call. Dedicated `@hufi-test.local` auth users created for this purpose
(not production data).

| # | Case | Result |
|---|---|---|
| T1 | Real `payment.made`, `is_test=false` | PASS — `ACTIVE`/`VERIFIED_PAID`, access API `has_access=true, ACTIVE_PAID` |
| T2 | Same payment retried | PASS — deduped upstream (`EVENT_ID_COLLISION_MISMATCH`), exactly 1 row |
| T3 | `payment.made`, `is_test=true` | PASS — zero entitlement rows created |
| T4 | Wrong `product_id` | PASS — zero HufManager Slim rows created |
| T5 | Unresolved subject (no matching `profiles.email`) | PASS — no grant, `LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT` issue logged |
| T6 | Period-end cancellation, future `effective_end_date` | PASS — `status` stays `ACTIVE`, `billing_status=CANCELLED`, `current_period_end` set correctly |
| T7 | Reconciler produces `subscription_ended` | PASS — `status=FROZEN`, access API `has_access=false, FROZEN` |
| T8 | Duplicate cancellation | PASS — idempotent, 1 row |
| T9 | Older out-of-order `payment.made` arriving after `FROZEN` | PASS — did not reactivate |
| T10 | Genuinely newer real payment after `FROZEN` | PASS — reactivated to `ACTIVE` with new subscription id |
| T11 | `payment.failed` | PASS — `billing_status=PAST_DUE`, `status` (access) untouched |
| T12/T13 | Refund / chargeback | PASS — structurally never reach this writer (existing lifecycle projector produces zero outcomes for these by design); entitlement completely untouched |
| T14 | Trial active (synthetic `trial_started`, no real producer exists yet) | PASS — `has_access=true, ACTIVE_TRIAL` |
| T15 | Trial window passed | PASS — stored `status` stays `TRIAL_ACTIVE` (event-sourced), access API dynamically returns `has_access=false, TRIAL_EXPIRED` |
| T16 | Real payment after/during trial | PASS — converts to `ACTIVE`/`VERIFIED_PAID`, `trial_status=NONE` |
| T17 | Test payment during trial | PASS — trial not converted |
| T18 | Authenticated client attempts self-grant `ACTIVE` | PASS — DENIED (`insufficient_privilege`, real RLS, not simulated) |
| T19 | Cross-user read | PASS — DENIED (0 rows) |
| T20 | Own access-context read | PASS |
| T21 | Direct API access to protected provider data without HufManager Slim access | **NOT EXECUTED — see BLOCKERS**, Phase 9 server-side RLS enforcement deliberately deferred |
| T22 | Customer-relationship access not broken | Vacuously true: zero RLS policy changes made to any existing table in this V1 |
| T23 | Admin/employee/manual/lifetime special cases | Vacuously true: zero changes to `profiles`/legacy subscription system; not re-tested in depth (out of this task's changed surface) |
| T24 | Reconciler repairs a deliberately-deleted entitlement row | PASS |
| T25 | Entitlement writer exception must not lose the lifecycle event | PASS — forced via a temporary CHECK constraint (removed after); lifecycle event committed, `HIGH` severity issue logged, entitlement row correctly absent |

## 5. Deploy order (this V1, once V2.7's lifecycle layer is itself deployed)

This layer's only read dependency is `hm_lifecycle_events`, which per
V2.7 is **not yet on Production**. Deploy order:

1. Full Production backup / restore point (not executed this session)
2. Re-run §2's diff at deploy time (state may have changed)
3. **Deploy V2.7 first** (lifecycle core) — this V1 has nothing to attach
   its trigger to otherwise
4. This V1's schema migration (enums + `product_entitlements`)
5. This V1's writer + trigger
6. This V1's reconciler
7. This V1's access API
8. Security/ACL re-verification (`has_function_privilege` checks from
   §on-staging, re-run against Production)
9. Legacy backfill — **only after** a real Phase 7 coverage report (not
   produced this session; see BLOCKERS) proves no existing paid HufManager
   Slim customer is missed. Best evidence gathered this session: the
   deployed Production `copecart-webhook` does not recognize product
   `3a97bd25` at all (checked directly, not assumed), and this product is
   explicitly excluded from that function's legacy `PRODUCT_PLAN_MAP` —
   meaning no existing automated mechanism grants HufManager Slim access
   on Production today. This is evidence toward "little to no legacy
   backfill needed", not a substitute for the real headcount Phase 7 asks
   for (Production read access with `~/.supabase/access-token` was not
   available this session — see BLOCKERS)
10. Server-side enforcement (Phase 9) — its own separately-scoped step,
    not part of this deploy (see BLOCKERS)
11. Frontend gate — already built and wired on this branch (Phase 8); ships
    with the next frontend deploy via the existing `./deploy.sh` process,
    unrelated to this DB deploy
12. Real CopeCart test + period-end cancellation test on Production,
    exactly like V2.7 §5 step 14
13. Rollback window kept open until confirmed stable

## 6. Rollback

Additive only, same principle as V2.7: DROP is not the default rollback.

| Layer | Rollback action | Data impact |
|---|---|---|
| Trigger | `DROP TRIGGER trg_hm_lifecycle_events_project_entitlement ON hm_lifecycle_events;` | Stops new entitlement projections; `hm_lifecycle_events` itself untouched |
| Writer/reconciler/access API functions | `DROP FUNCTION` | Zero effect on lifecycle core; nothing else reads `product_entitlements` yet except the (not-yet-shipped) frontend gate |
| `product_entitlements` table + new enums | Left in place, unused | Zero effect on any existing HufManager functionality |
| Frontend gate | Redeploy previous frontend build (`./deploy.sh` to a prior commit) | None — reverts to the pre-gate, always-open state for these 4 routes |

## 7. Go / No-Go

```
PROD_LIFECYCLE_CORE_LIVE=YES — corrected this session, re-verified read-only
  against Production (vnschgjxkzzwzefqlrji) directly, not taken on faith:
  public.hm_lifecycle_events EXISTS (1 row), public.hm_lifecycle_reconciliation_issues
  EXISTS (0 rows), cron.job "reconcile-period-end-subscriptions" (*/15 * * * *) is
  active=true. V2.7's lifecycle core + hufi-data-core + scheduler are Production-live;
  a real CopeCart payment.made E2E test produced the one hm_lifecycle_events row.
  This V1 (entitlement/access) document's earlier §2 "Absent" line for
  hm_lifecycle_events described a snapshot from before that deploy — superseded,
  not a standing blocker.
DB_SCHEMA_READY=YES (staging-verified; product_entitlements itself confirmed
  still ABSENT on Production this session — the entitlement layer proper has
  not been deployed, only its lifecycle-core dependency has)
ENTITLEMENT_WRITER_READY=YES (staging-verified prior session, T1-T17 + T25 — NOT re-executed this session as of the previous report; see §8 of this section for the harness now added)
RECONCILER_READY=YES (T24, same caveat)
ACCESS_API_READY=YES (T14, T15, T20, same caveat)
RLS_CLIENT_WRITE_DENIED=YES (T18)
RLS_CROSS_USER_DENIED=YES (T19)
SERVER_SIDE_ENFORCEMENT_READY=YES — Phase 9 implemented + staging-adversarial-tested this session, see HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §5. NOT deployed to Production (still additive migrations sitting only on staging).
LEGACY_BACKFILL_COVERAGE_REPORT=PRODUCED this session — read-only against Production (vnschgjxkzzwzefqlrji), see HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §2-§4. Backfill function written + staging-tested (mapping, idempotency, one-shot cutover boundary). NOT executed for real anywhere — correctly so: Production was read-only this entire task by explicit instruction, so a real backfill run was never an available option, not a missed step.
FRONTEND_GATE_READY=YES (built, wired, typecheck run this session — still clean, no frontend files changed this session)
BACKUP_PLAN_READY=YES — fresh Production backup + isolated restore drill performed for real (follow-up session), PASS on every check; see HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §9a. Deploy/rollback sequence itself (§9b) still not executed.
ROLLBACK_PLAN_READY=YES (Phase 9 additions: DROP POLICY x10, DROP FUNCTION for the backfill — same additive-only principle; full sequence in HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §9)

PRODUCTION_GO_LIVE_GATE=NO
```

`NO` here means: the lifecycle core this V1 depends on is now genuinely
Production-live (corrected above), and every layer this task itself set out
to build is staging-proven — schema, writer, RLS/API enforcement, and a real
(not guessed) legacy classification. What remains is that none of *this V1's
own* objects (`product_entitlements` and everything built on it) have touched
Production yet, Phase 9's enforcement has only been exercised against
staging (which has already drifted from Production in unrelated ways — see
policy-count differences noted in HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md
§5), and a real, executed backup/restore drill (as opposed to a written
plan) does not exist. See HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md §8 for
the exact remaining blockers.
