# HufManager Slim — Legacy Compatibility Gate (V1)

Status: **CLASSIFICATION VERIFIED AGAINST PRODUCTION (read-only). NO PRODUCTION
WRITES. NO BACKFILL EXECUTED.** Builds on
`docs/HUFMANAGER_SLIM_ENTITLEMENT_PRODUCTION_READINESS_V1.md` (Phase 9 was
deferred there; this document is that Phase 9 work plus the legacy backfill
classification named in that document's Phase 7 gap).

## 1. Why this document exists

A prior session (interrupted by a session limit) reportedly produced this
same 7-class breakdown, but left no artifact on disk anywhere in this repo,
`hm-factengine`, or Claude Code's own memory/history — every other phase of
this project has a corresponding doc; this was the one unexplained gap.
Rather than carry those numbers forward unverified, they were re-derived
from scratch this session, directly against Production
(`vnschgjxkzzwzefqlrji`), read-only (`SELECT` only, no
`INSERT`/`UPDATE`/`DELETE`/DDL issued). They match exactly — see §3.

**Correction, re-verified read-only against Production directly:**
`public.hm_lifecycle_events` EXISTS (1 row, written by a real CopeCart
`payment.made` E2E test), `public.hm_lifecycle_reconciliation_issues`
EXISTS (0 rows), and `cron.job "reconcile-period-end-subscriptions"`
(`*/15 * * * *`) is `active=true`. The lifecycle core (V2.7) this V1
depends on is Production-live. `public.product_entitlements` (this V1's
own table) is confirmed still **absent** — see §9 for the corrected
Production baseline this changes the deploy plan against.

## 2. Cohort definition

- 37 accounts with `user_roles.role = 'provider'` (the entire current
  HufManager provider base — there is no narrower "HufManager Slim
  specifically" cohort on Production today: `product_entitlements` does not
  exist there yet, so no account has been distinguished onto a Slim plan
  yet; this cutover is what will do that distinguishing).
- Plus 2 accounts with `user_roles.role = 'admin'` (not providers
  themselves, verified zero overlap with the 37). The 1 `employee`-role
  account is a distinct third identity, not counted in either bucket —
  out of scope for this gate; its access is not governed by
  `product_entitlements`.

## 3. Classification (verified, read-only, this session)

Precedence, evaluated top to bottom per account:

1. `profiles.is_suspended = true` -> **SUSPENDED**. Authoritative regardless
   of `subscription_status` text — found one provider with
   `subscription_status='active'` but `is_suspended=true`,
   `suspended_reason='Spam-Account, automatisch generierte
   E-Mail-Adresse'`. `subscription_status` is never updated on suspension in
   this schema, so skipping this check would have silently granted a
   flagged spam account paid access.
2. Real payment evidence — any of: non-empty `copecart_subscription_id`,
   a `provider_subscriptions`/`client_subscriptions` row with
   status in (`active`,`paid`,`verified`), or a `manual_payments` row ->
   **PROVEN_PAID**.
3. `plan_override` matching a manual-grant vocabulary (`manual_cash_1y`,
   `lifetime_grant`, etc.) -> **PROVEN_MANUAL_GRANT**. Independent of
   `subscription_status`/`trial_ends_at` — two of the three matches here
   have a `trial_ends_at` that is 6+ months in the past; the override
   itself, set by an admin, is the proof, not the stale trial clock.
4. `subscription_status = 'trialing'` AND `trial_ends_at > now()` ->
   **PROVEN_TRIAL** (a currently-running trial, real evidence, not a
   guess).
5. `subscription_status = 'active'` with none of the above -> plan/status
   says paid, nothing corroborates it -> **AMBIGUOUS_ACTIVE_ONLY**.
6. Everything else (in practice: one account — `subscription_status`
   literally still `trialing` but `trial_ends_at` seven months in the past,
   `plan_override='copecart_starter'` but no live `copecart_subscription_id`
   was ever recorded, no verified subscription row, no manual payment) ->
   **NO_EVIDENCE**. The override name suggests a real CopeCart origin but
   nothing in this database corroborates it — cannot be proven, must not
   be auto-granted.
7. `user_roles.role = 'admin'` (checked separately from the 37-provider
   cohort, its own access path) -> **PROVEN_ADMIN_EMPLOYEE**.

| Class | Count | Rule |
|---|---|---|
| PROVEN_PAID | 1 | real subscription/manual-payment evidence |
| PROVEN_MANUAL_GRANT | 3 | admin-set override, cash/lifetime grant vocabulary |
| PROVEN_TRIAL | 3 | trialing, trial window still open |
| PROVEN_ADMIN_EMPLOYEE | 2 | `admin` role (not `employee` — see §2) |
| AMBIGUOUS_ACTIVE_ONLY | 28 | `active` status, zero corroborating signal |
| NO_EVIDENCE | 1 | expired trial + unverifiable override, no real proof |
| SUSPENDED | 1 | `is_suspended=true` (spam account) |
| **Total** | **39** | 37 providers + 2 admins |

This matches the 7-class breakdown carried into this session from the
interrupted prior run exactly, class for class and count for count —
re-derived independently, not copied forward.

## 4. Legacy Compatibility rule — as implemented and staging-tested

Implemented in
`supabase/migrations/20260912051600_add_hufmanager_slim_legacy_backfill_v1.sql`
(`hm_backfill_hufmanager_slim_legacy_entitlements_v1(cutover_at, dry_run)`),
tested in `scripts/phase9-legacy-backfill-lab-tests.sql` (all cases pass on
staging, including idempotency and the one-shot cutover boundary).

- **AMBIGUOUS_ACTIVE_ONLY (28)**: `status='ACTIVE'` (access preserved —
  these look like real customers and cutting them off on ambiguous grounds
  would be the wrong direction of error), but `billing_status
  ='UNKNOWN_BILLING_STATE'` — never `VERIFIED_PAID` — reusing the
  existing, real enum value with exactly this meaning (see
  `billingClassify.mjs`'s `classifyLegacyBillingState`), not inventing a
  parallel compatibility flag. `metadata.legacy_compatibility_review_required
  = true` marks the row for manual follow-up. Only reachable through the
  backfill function's own `created_at < cutover_at` filter — no future
  signup can ever land here.
- **PROVEN_PAID (1) / PROVEN_MANUAL_GRANT (3)**: `status='ACTIVE'`,
  `billing_status='VERIFIED_PAID'`. Real evidence, no caveat needed.
- **PROVEN_TRIAL (3)**: `status='ACTIVE'`, `billing_status='NONE'`,
  `trial_status` left `'NONE'` — **not** `TRIAL_ACTIVE`. Legacy trial
  windows in this data are 30 days; HufManager Slim's own trial is a
  fixed, CHECK-constrained 14 days
  (`product_entitlements_hufmanager_slim_trial_14d`). Writing a legacy
  30-day window into `trial_status=ACTIVE` would either violate that
  constraint or misrepresent a different product's trial as this one's.
  These accounts are grandfathered straight to `ACTIVE` instead; the
  original legacy trial dates are preserved in `metadata` for audit only,
  never fed back into any access decision.
- **PROVEN_ADMIN_EMPLOYEE (2)**: gets **no** `product_entitlements` row at
  all. `public.is_admin()` (the real `user_roles.role='admin'` check — see
  §5 for why this is not the same thing as `is_master_admin()`) is checked
  directly inside every Phase 9 RLS restrictive policy — a second,
  redundant access path for the same accounts would only be more surface
  to keep in sync. This covers an admin account working on its **own**
  HufManager business data (acting as a provider) without entitlement.
  It does **not** grant an admin cross-account read into another
  provider's `hoof_analyses`/`invoices` — that was never a permission a
  plain `admin` role had on those two tables before Phase 9 either (only
  `is_master_admin()` had it there); Phase 9 preserves that boundary
  rather than widening it.
- **SUSPENDED (1)**: `status='LOCKED'` — an explicit row, not silence, so
  a future re-subscribe attempt is visible/auditable rather than
  indistinguishable from a account that was simply never a customer.
- **NO_EVIDENCE (1)**: no row at all. Falls through to the same
  `NO_ENTITLEMENT`/no-access default as a brand-new signup. Nothing in
  this database corroborates this account ever paid; granting access on
  an unverifiable override name would be exactly the "Fake-Fix" this task
  ruled out.

## 5. RLS_PROVIDER_ENFORCEMENT + DIRECT_API_ACCESS_ENFORCEMENT (Phase 9)

Implemented in
`supabase/migrations/20260912051500_add_hufmanager_slim_rls_direct_api_enforcement_v1.sql`.

Protection surface (queried from Production `pg_policy`/`pg_class` this
session, not guessed): `public.contacts`, `public.appointments`,
`public.hoof_analyses`, `public.invoices`, `public.horses` — the only
tables that are both a provider's own productive HufManager business data
and already carry a distinct provider-ownership policy. Deliberately
excluded: `profiles`, `user_roles`, `provider_subscriptions`,
`client_subscriptions`, `manual_payments`, `product_entitlements` — gating
any of these would violate the PAUSED rule (§7). `data-export`'s Edge
Function already runs under `SUPABASE_SERVICE_ROLE_KEY` (verified by
reading its source), so it bypasses RLS entirely and needed no change.

Mechanism: one `RESTRICTIVE` policy per table/command
(Postgres ANDs a restrictive policy with whatever permissive policy would
otherwise allow the row) of the shape "if this row isn't mine as the
acting provider, this restriction doesn't apply to me at all; if it is,
I need `has_hufmanager_access_v1()` (or to be admin/master-admin)". No
existing permissive policy was edited — verified by re-counting
`pg_policy` rows per table before/after (permissive counts unchanged,
restrictive counts +2 per table, exactly matching the migration). A
restrictive policy can only narrow what a permissive policy already
allows — it can never grant new access on its own, which is exactly why
this addition cannot widen anyone's privileges beyond what already
existed.

Real bug found and fixed while writing the adversarial tests: `is_admin()`
(`user_roles.role='admin'`) and `is_master_admin()` (a separate
`master_admins`-by-email check) are two different functions in this
codebase. The first migration draft only OR'd in `is_master_admin()` for
`hoof_analyses`/`invoices` (mirroring those two tables' own pre-existing
"Master admin can view all ..." policy), which would have wrongly denied
a plain `admin`-role account (a real `PROVEN_ADMIN_EMPLOYEE`) working on
its **own** `hoof_analyses`/`invoices` rows while lacking entitlement.
Fixed by OR-ing in `is_admin(auth.uid())` there too (§4's caveat on what
this does and does not grant). Caught by extending the adversarial test
to actually create an admin-role-and-provider fixture and assert it,
rather than trusting the first draft's symmetry assumption across all 5
tables.

Adversarial tests (`scripts/phase9-rls-direct-api-adversarial-tests.sql`,
run via `SET LOCAL role authenticated; SET LOCAL request.jwt.claims`,
i.e. exactly what PostgREST does for a real REST call — proving
DIRECT_API_ACCESS_ENFORCEMENT at the raw protocol level, not just "the
app's UI doesn't call this"), all PASS on staging, rolled back, zero
residue:

- A provider with no entitlement row is denied SELECT and INSERT on all
  5 protected tables.
- A client viewing their own contact/horse/appointment is **completely
  unaffected**, regardless of their provider's entitlement state
  (customer-relationship policies preserved, requirement 4).
- An admin sees another no-entitlement provider's `contacts`/`horses`
  anyway (the pre-existing cross-account oversight policy, unaffected).
  An admin-role account that is itself a provider can see its **own**
  `hoof_analyses`/`invoices` rows without entitlement too (the real
  `is_admin()` vs `is_master_admin()` fix above).
- Granting `ACTIVE` restores access on all 5 tables.
- Setting `PAUSED` denies all 5 protected tables again, while the same
  session can still read its own `profiles` row and call
  `has_hufmanager_access_v1()` without error (PAUSED rule, §7).

## 6. Regression run this session

- `hm-factengine`: 108/108 passing (was 103/108 before the fix in §0).
- Phase 9 adversarial RLS/API tests: all PASS (§5), including the
  `is_admin()`/`is_master_admin()` fix and its dedicated re-check.
- Legacy backfill tests (dry-run no-op, per-class mapping, one-shot
  cutover boundary, idempotency on double-run): all PASS.
- **Entitlement writer/reconciler/access-API core, re-verified with a
  new, persisted, reproducible harness**
  (`scripts/phase9-entitlement-core-reverify.sql`) — calls the real entry
  points (`hufi_data_ingest_and_project_v1`,
  `hm_reconcile_period_end_subscriptions_v1`,
  `hm_reconcile_hufmanager_entitlements_v1`), not a re-implementation of
  their logic. **T1-T17, T24, T25: all PASS** —
  `ENTITLEMENT_CORE_REVERIFY=PASS`. One real fixture bug found and fixed
  while building it: a synthetic `trial_started` row must set
  `product`/`plan` directly on the `hm_lifecycle_events` row (the writer
  otherwise looks for a matching `hufi_data_events` row via
  `source='copecart'` and blocks with
  `ENTITLEMENT_PROJECTION_BLOCKED_MISSING_RAW_EVENT` when none exists —
  exactly the documented, intentional behavior for an unclassified event,
  not a bug in the writer).
- **`public.invoices` full CRUD RLS matrix**, dedicated
  (`scripts/phase9-invoice-rls-tests.sql`): provider without access
  denied (SELECT/INSERT), a foreign provider denied (pre-existing tenant
  isolation), the client customer-relationship path unaffected,
  `is_master_admin()` cross-account read intact (the one pre-existing
  path that exists on `invoices`), `ACTIVE` entitlement restores
  SELECT/UPDATE/INSERT/DELETE for the owning provider, and DELETE is
  denied again once entitlement is removed. **INVOICE_RLS_TESTS=PASS**
  (8/8).
- Existing repo regression scripts re-run against staging with the new
  policies in place: `supplier-purchasing-rls-tests.sql` PASS (tenant
  isolation for suppliers/inventory, unaffected — different tables).
  `shared-security-gate-negative-tests.sql` fails on
  `search_horse_by_readable_id` anon-execute, and `invoice-number-tests.sql`
  fails on `generate_invoice_number` anon-execute — **both now verified
  pre-existing** (not just one, and not by inspection alone): temporarily
  dropping all 10 new restrictive policies inside a rolled-back
  transaction and re-running each produces the identical failure with the
  policies absent, for both scripts. `PREEXISTING_TEST_FAILURES=
  CONFIRMED_NON_REGRESSION` for both.
  `ghost-customer-access-grant-lab-tests.sql` fails on a stale
  `horses.app_source` column reference — pre-existing schema drift in an
  older script (the column does not exist regardless of any policy,
  provable by inspection of `information_schema.columns` alone — not an
  RLS question at all).
  `invoice-atomicity-negative-tests.sql` / `p0-invoice-complete-tests.sql`
  still not executed this session (need hand-built provider/client/horse
  fixture UUIDs matching their exact preconditions); both exercise
  `create_invoice_with_items(jsonb,jsonb)`, a `SECURITY DEFINER` function
  that performs its own internal tenant checks under a superuser test
  session that never switches role — structurally unreachable by an
  additive RESTRICTIVE policy on `invoices` (confirmed by reading the
  script: it never issues `SET ROLE`/`set_config('role', ...)`, so
  Postgres never leaves the superuser session that created the fixtures,
  and RLS restrictive policies do not apply to a role with BYPASSRLS
  regardless of what they say) — not expected to be affected by Phase 9,
  and now additionally covered end-to-end by
  `phase9-invoice-rls-tests.sql`'s own dedicated matrix above, which does
  switch role and does exercise the actual RLS path these two scripts
  don't.
- Frontend typecheck (`npm run typecheck`, full project — no HufManager
  Slim frontend files changed this session, so there was nothing new to
  isolate): clean, exit 0, no swap thrashing.

## 7. PAUSED rule

Satisfied structurally, not by a special case: the RLS gate in §5 only
covers the 5 productive business tables. `profiles`, billing tables, and
auth are untouched, so Login/Profile/Billing/Reaktivierung/Logout keep
working exactly as today for a `PAUSED` account. Datenexport goes through
a `SUPABASE_SERVICE_ROLE_KEY` Edge Function, which bypasses RLS
entirely — also unaffected. Verified directly in adversarial test A6
(§5): PAUSED denies the 5 tables while the same session's own `profiles`
row read and `has_hufmanager_access_v1()` call both still succeed.

## 8. What remains open

- Nothing has been applied to Production. Everything above is staging
  (`127.0.0.1:54322`) only, per this task's hard constraint — Production
  stayed strictly read-only this entire task, so this is expected, not a
  gap.
- The legacy backfill has not been run for real anywhere (staging or
  Production) — correctly so; it is an explicitly separate, later,
  authorized deploy step (§9), not something this task's constraints ever
  permitted attempting.
- `invoice-atomicity-negative-tests.sql` / `p0-invoice-complete-tests.sql`
  still not executed this session (§6) — low residual risk: they test a
  different enforcement layer (a `SECURITY DEFINER` RPC's own internal
  checks) that Phase 9 does not touch, and the RLS path they don't cover
  is now covered by `phase9-invoice-rls-tests.sql`.
- No Production deploy order/runbook update was needed for the sequence
  itself — Phase 9 slots in at the production readiness doc's existing §5
  step 10 unchanged. §9 below is the concrete backup/rollback plan for
  that eventual deploy, written this session, not yet executed.

## 9. Production backup + deploy + rollback plan (written this session, NOT executed)

Production baseline as of this session (re-verified read-only, not
assumed — see §1 correction and the entitlement readiness doc's own
correction note):

```
PROD_LIFECYCLE_CORE_LIVE=YES (hm_lifecycle_events: 1 row, hm_lifecycle_reconciliation_issues: 0 rows,
  cron "reconcile-period-end-subscriptions" */15 * * * * active=true)
PROD_ENTITLEMENT_LAYER_LIVE=NO (product_entitlements: absent)
```

This V1's deploy therefore has exactly one hard prerequisite already
satisfied (the lifecycle core it reads from) and starts from a clean,
additive base (nothing of its own exists yet to collide with).

### PRE (before touching Production at all)

1. Fresh `pg_dump -Fc` of the full Production database to a local file,
   named with a UTC timestamp (matches the existing convention already
   used in `~/prod-db-backup-drill/` and `~/prod-db-backup-postcore/`
   from before this session).
2. `sha256sum` the dump file immediately, store the hash alongside it.
3. `pg_restore --list` against the dump (structure-only sanity check —
   proves the archive is readable and non-empty without touching any
   database).
4. A real restore test: either into a disposable local Postgres, or reuse
   the existing validated restore-anchor process this project already
   has (`~/prod-db-backup-drill/`, `~/prod-db-backup-postcore/` — a
   restore drill process already exists here; run it, don't re-invent
   it).
5. Snapshot current counts/state for later comparison: provider count,
   `user_roles` role distribution, `hm_lifecycle_events` row count,
   `hm_lifecycle_reconciliation_issues` OPEN count, the full `pg_policy`
   set on the 5 protection-surface tables (so a later diff can prove
   nothing besides this deploy's own new policies changed).
6. Re-run this session's legacy classification query (§3) fresh — the
   active/trialing/suspended counts can have moved since this session; a
   stale count silently carried into the real backfill would misclassify
   whoever changed state in between.

### DEPLOY (in order; each step's own migration file already exists and
is staging-verified — nothing here is newly written at deploy time)

1. `20260911204057_add_hufmanager_slim_entitlement_schema_v1.sql` (enums +
   `product_entitlements` table + RLS + indexes).
2. `20260911204058_add_hufmanager_slim_entitlement_writer_v1.sql` (writer
   + trigger on `hm_lifecycle_events` — this is the first moment
   Production's already-live lifecycle events start being read; nothing
   about lifecycle events themselves changes).
3. `20260911204059_add_hufmanager_slim_entitlement_reconciler_v1.sql`.
4. `20260911204100_add_hufmanager_slim_access_context_api_v1.sql`.
5. `20260912051600_add_hufmanager_slim_legacy_backfill_v1.sql` (the
   function only — defines it, does not run it).
6. **Dry run** the backfill (`hm_backfill_hufmanager_slim_legacy_entitlements_v1(now(), true)`)
   against Production and compare its per-class counts against a freshly
   re-run §3 classification query. Any mismatch is a hard stop — re-run
   §3's query, do not proceed on stale numbers.
7. **Explicit go-ahead required here** before the next step. This is the
   one truly write-affecting, hard-to-fully-reverse step (an ACTIVE
   grant, once acted on by a real user, has real-world consequences even
   if the row itself can be deleted after).
8. Run the backfill for real (`..., false)`).
9. `20260912051500_add_hufmanager_slim_rls_direct_api_enforcement_v1.sql`
   (RLS enforcement) — deployed *after* the backfill, never before: doing
   this first would lock out every existing customer for the gap between
   RLS going live and the backfill running.
10. Re-run this session's adversarial tests (§5) and the invoice RLS
    matrix (§6) directly against Production immediately after, read-only
    where possible (SELECT-shaped assertions only — no test fixture rows
    written to Production; use existing real accounts' observed
    before/after `has_hufmanager_access_v1()` values instead of inserting
    synthetic ones).
11. Frontend gate ships with the next `./deploy.sh` run, independently —
    already built (Phase 8), unaffected by this DB deploy's timing.
12. A real CopeCart `payment.made` test + a real period-end cancellation
    test on Production, same as the lifecycle core's own V2.7 §5 step 14
    precedent (a real E2E payment.made test already produced the one
    `hm_lifecycle_events` row currently on Production — same method, this
    layer).
13. Keep the rollback window open (below) until access has been confirmed
    stable for a defined period — not defined by this document; a
    business decision, not a technical one.

### ROLLBACK (per layer, additive-only — same principle as V2.7)

| Layer | Rollback action | Data impact |
|---|---|---|
| RLS restrictive policies (10) | `DROP POLICY` x10 (exact names in the migration file) | Immediately reopens the 5 tables to their pre-Phase-9 permissive-only behavior. Zero data loss. |
| Legacy backfill rows | **Never bulk-delete.** A backfilled row that already granted real access has already had real-world effect; deleting it retroactively is a business decision (does the customer keep access?), not a technical rollback. If the backfill *function* itself needs to stop being callable, `REVOKE EXECUTE` — the rows it already wrote stay. |
| Writer/reconciler/access-API functions | `DROP FUNCTION` (also drops the trigger via `DROP TRIGGER` first) | Zero effect on `hm_lifecycle_events` (read-only dependency) or any other existing HufManager functionality. |
| `product_entitlements` table + new enums | Left in place, unused | Zero effect on anything else — nothing else in this codebase reads it except what this V1 built. |
| Frontend gate | Redeploy previous frontend build via `./deploy.sh` | None — reverts to the pre-gate, always-open state for the 4 gated routes. |

Never: deleting `hm_lifecycle_events`, `hufi_data_events`, or any provider
event/state row as part of any rollback here — those are the lifecycle
core's own truth, entirely out of this document's authority, and outlive
this V1 regardless of its own rollback status.
