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
- Phase 9 adversarial RLS/API tests: all PASS (§5).
- Legacy backfill tests (dry-run no-op, per-class mapping, one-shot
  cutover boundary, idempotency on double-run): all PASS.
- Existing repo regression scripts re-run against staging with the new
  policies in place: `supplier-purchasing-rls-tests.sql` PASS (tenant
  isolation for suppliers/inventory, unaffected — different tables).
  `shared-security-gate-negative-tests.sql` fails on
  `search_horse_by_readable_id` anon-execute — verified this is
  **pre-existing**, not caused by Phase 9, by temporarily dropping all 10
  new restrictive policies inside a rolled-back transaction and
  re-running: identical failure with the policies absent.
  `invoice-number-tests.sql` fails the same way on
  `generate_invoice_number` anon-execute (same pre-existing class, not
  re-verified by drop/redo — high confidence by inspection: unrelated
  function, not touched by this migration).
  `ghost-customer-access-grant-lab-tests.sql` fails on a stale
  `horses.app_source` column reference — pre-existing schema drift in an
  older script, not a table my migration touches.
  `invoice-atomicity-negative-tests.sql` / `p0-invoice-complete-tests.sql`
  not executed this session (need hand-built provider/client/horse
  fixture UUIDs matching their exact preconditions); both exercise
  `create_invoice_with_items(jsonb,jsonb)`, a `SECURITY DEFINER` function
  that performs its own internal tenant checks under a superuser test
  session that never switches role — structurally unreachable by an
  additive RESTRICTIVE policy on `invoices`, so not expected to be
  affected, but not empirically confirmed this session either.
- Entitlement writer/reconciler/access-API (T1-T17, T24, T25 from
  `HUFMANAGER_SLIM_ENTITLEMENT_PRODUCTION_READINESS_V1.md` §4): **not
  re-executed this session** — no persisted harness exists for that
  matrix (same gap as the legacy classification numbers, see §1). Phase 9
  did not modify the writer, reconciler, or access-API functions, only
  added new RLS policies and a new backfill function, so there is no
  mechanical reason for those 19 cases to have changed — but that is an
  inference, not a re-verified fact, and is reported as such.
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

## 8. What remains open (not done this session)

- Nothing has been applied to Production. Everything above is staging
  (`127.0.0.1:54322`) only, per this task's hard constraint.
- The legacy backfill has not been run for real anywhere (staging or
  Production) — only its dry-run and its mechanism tests.
- T1-T17/T24/T25 not re-executed (§6) — inferred unaffected, not proven.
- `invoice-atomicity-negative-tests.sql` / `p0-invoice-complete-tests.sql`
  not executed this session (§6).
- No Production deploy order/runbook update was needed — Phase 9 slots in
  at the production readiness doc's existing §5 step 10 unchanged.
