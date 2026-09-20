# HufManager — Staging Activation of the 2026-09-17 Backend Set (2026-09-20)

Status: **STAGING MIGRATED AND VERIFIED — BUT ONE P0 BLOCKER FOUND.**
Production schema and Production Edge Functions were **not** changed.
Branch: `release/hufmanager-lifecycle-2026-09-11`.

## 1. Staging target (verified before any write)

| Fact | Value |
|---|---|
| Staging = | "XXL-Staging", the local Supabase stack (`docs/HUFMANAGER_SLIM_ENTITLEMENT_PRODUCTION_READINESS_V1.md` §4 names it `127.0.0.1:54322`) |
| DB host/port | `127.0.0.1:54322` (docker container `supabase_db_vnschgjxkzzwzefqlrji`, internal IP `172.20.0.2`) |
| Staging API / Functions | `http://127.0.0.1:54321` — from inside the DB container `http://kong:8000` |
| Supabase CLI link state | `linked_project: null` — the CLI cannot push to any remote project |
| Production (untouched) | remote project `vnschgjxkzzwzefqlrji`, host `db.vnschgjxkzzwzefqlrji.supabase.co` |

The container name contains the Production project ref only because
`supabase start` derives container names from `supabase/config.toml`'s
`project_id`. It is a local stack; it is not the remote Production database.

## 2. Precheck findings (staging drift vs. Production)

Four gaps were found before applying the authorized set. All four are staging
environment drift, not defects in the frozen code.

| # | Gap | Resolution |
|---|---|---|
| 1 | `pg_net` extension absent (Production has it). Migration 140000's trigger bodies call `net.http_post`. | `CREATE EXTENSION pg_net WITH SCHEMA extensions` — see the incident in §6, this install had a side effect. |
| 2 | `public._hm_has_hufmanager_access_v1(uuid)` absent, although migration 130000 calls it. Staging carried an older revision of `20260911204100`. | Re-applied `20260911204100_add_hufmanager_slim_access_context_api_v1.sql` (CREATE OR REPLACE only, idempotent). |
| 3 | `20260912051700_fix_create_invoice_with_items_entitlement_gate_v1.sql` never applied on staging. | Applied (CREATE OR REPLACE only). |
| 4 | `auth.users` had **no** `on_auth_user_created` trigger; Production has it ENABLED. Without it the whole invite path cannot be exercised. | Recreated verbatim from the Production definition. `handle_new_user()` itself unchanged. |

`supabase_migrations.schema_migrations` was completely empty on staging (0
rows) despite a fully built schema — earlier sessions applied SQL without
registering it. Only what this session applied was registered.

## 3. Vault (staging values only)

Both secrets created in the staging Vault. No value is recorded here, in git,
or in any log.

| Secret | State | Points at |
|---|---|---|
| `autoflow_functions_base_url` | SET | `http://kong:8000/functions/v1` — docker-internal staging gateway, not resolvable to any external host |
| `autoflow_service_key` | SET | staging service-role key |

`public._autoflow_trigger_endpoint()` resolves to
`http://kong:8000/functions/v1/autoflow-auto-invoice`.

## 4. Migrations applied (in the authorized order)

Each applied in its own transaction with `ON_ERROR_STOP=1`, exit code checked,
ledger entry verified before continuing.

| Order | Version | Result |
|---|---|---|
| 1 | `20260917120000_add_create_customer_with_contact_v1` | PASS |
| 2 | `20260917125000_add_autoflow_invoice_appointment_idempotency_v1` | PASS |
| 3 | `20260917130000_add_create_invoice_with_items_for_provider_v1` | PASS |
| 4 | `20260917140000_fix_autoflow_trigger_auth_vault_v1` | PASS |
| 5 | `20260917155000_fix_invite_tenant_auto_assign_v1` | PASS |
| 6 | `20260917160000_add_create_invited_customer_with_contact_v1` | PASS |

## 5. Edge Functions on staging

The staging stack serves Edge Functions straight from the bind-mounted
worktree (`supabase/functions` → container, read-only), so the current
worktree code *is* the staging deployment. Nothing was deployed to Production.

| Function | Needed for | Staging state |
|---|---|---|
| `invite-client-with-password` | sets the `app_metadata.invited_by_provider_id` marker for 155000/160000 | boots, returns its own `401 Ungültiger Token` |
| `autoflow-auto-invoice` | calls `create_invoice_with_items_for_provider`, writes `source='autoflow'` | boots, returns `401 Unauthorized` for non-service tokens |
| `hufi-agent` | calls `create_customer_with_contact` / `create_invoice_with_items` | boots, returns `401 Nicht angemeldet` |

`invite-client-with-password` initially crashed at module load
(`new Resend(...)` at line 5 with no `RESEND_API_KEY`). Fixed by a
**gitignored, staging-only** `supabase/functions/.env` holding a placeholder
key, served via `supabase functions serve`. Mail delivery fails and is caught
by the function's own handler (`emailSent:false`); no mail is sent from
staging.

## 6. Incident: three calls reached Production

**What happened.** Installing `pg_net` (§2 gap 1) reactivated a dormant
staging cron job. `cron.job` id 1 `routines-runner` (every minute, active)
contains a hardcoded Production URL,
`https://<prod-ref>.supabase.co/functions/v1/hufi-routines-runner`. While
`pg_net` was missing that job had been failing every minute for a long time.
Once the extension existed it succeeded three times — 10:50, 10:51 and
10:52 UTC — each an HTTP 200 POST to the **Production** Edge Function.

**Impact: none to Production data.** Read-only check of Production:
`hufi_routines` has `enabled = 0` rows, so the runner's due-routine query
returned empty and it wrote nothing (`{executed:0, errors:0, skipped:0}`).
`max(last_triggered_at)` is NULL.

**Contained.** Cron job 1 was disabled (`cron.alter_job(1, active := false)`)
at ~10:52:30 UTC. `net._http_response` has stayed at exactly 3 rows since.

**Residual state, audited.** Staging now has:
- 0 active cron jobs containing the Production ref
- 0 **enabled** triggers whose function body contains the Production ref

Three function bodies still hardcode the Production URL —
`autoflow_on_new_lead`, `notify_admin_on_profile_change`,
`notify_new_registration`. All three of their triggers are **DISABLED** on
staging (they are ENABLED on Production). They were deliberately left
unmodified: they are outside the frozen set, and their triggers are the guard.
**Anyone re-enabling them on staging would send staging data to Production.**

The two autoflow appointment triggers were DISABLED on staging and are ENABLED
on Production. Because migration 140000 now routes them through the staging
Vault, they were enabled to match Production. They resolve to `kong:8000`.

## 7. P0 — found, and closed by the pending-invite contract (Variante 3)

> **Resolution status: CLOSED.** §7 below documents the defect as found. §7a
> documents the fix that was then implemented and verified against real GoTrue.

`INVITE_TENANT_ISOLATION=PASS` / `TEMPORARY_TENANT_EXPOSURE_POSSIBLE=NO` from
the final backend acceptance **could not be reproduced** against a real
GoTrue admin call on staging.

### The contract

`20260917155000` suppresses the generic "oldest provider in the system"
fallback in `auto_assign_client_to_provider()` when
`auth.users.raw_app_meta_data->>'invited_by_provider_id'` is present.
`invite-client-with-password` sets that marker via
`auth.admin.createUser({ app_metadata: { invited_by_provider_id } })`.

### What actually happens

GoTrue (v2.196.0) does **not** write `app_metadata` in the same statement that
inserts the `auth.users` row. It applies it afterwards. The trigger chain
(`on_auth_user_created` → `handle_new_user()` → `INSERT public.user_roles` →
`auto_assign_client_to_provider()`) therefore runs **before** the marker
exists, the suppression condition is false, and the foreign grant is created
anyway.

### Evidence

A temporary probe trigger on `public.user_roles` recorded the value of
`auth.users.raw_app_meta_data` at the exact moment the trigger fires, for a
user created through the real admin API **with** `app_metadata` set:

```
seen by user_roles AFTER INSERT trigger:
  {"provider": "email", "providers": ["email"]}        <- marker ABSENT
```

The same user's row, read after the call returns, does contain the marker:

```
{"provider": "email", "providers": ["email"],
 "invited_by_provider_id": "8e62aacc-…"}
```

Control: a single-statement `INSERT INTO auth.users (… raw_app_meta_data …)`
that already contains the marker **is** suppressed correctly — grants for the
invited client come back `(none)`. The migration's SQL logic is right; its
assumption about when GoTrue writes `app_metadata` is not.

### Test matrix run on staging

| # | Case | Result |
|---|---|---|
| T1 | Grants immediately after the real admin `createUser` (marker set) | **FAIL** — foreign provider `36382054-…` already holds an active grant with `can_view_medical = true` |
| T2 | `create_invited_customer_with_contact(A, client)` | PASS — returns profile/contact |
| T3 | Grants after the RPC | **FAIL** — *two* grants: the foreign provider **and** Provider A |
| T4 | Retry the same RPC | PASS — idempotent, still 1 contact, no new grant |
| T5 | Provider B tries to claim the same invited user | PASS — `Invited user is not marked for this provider` |
| T6 | Normal signup, no marker | PASS — fallback still applies, no regression |
| T7 | Atomic SQL insert with marker present at INSERT time | PASS — fallback correctly suppressed |

So the wrong-provider *grant path* (T5) is closed, and normal signup (T6) is
unaffected — but the **temporary foreign grant the fix exists to prevent is
still created, and it is not temporary: it persists.**

All test users, grants, contacts and the probe were removed afterwards;
`access_grants` is back to 0 rows.

### What this meant

The set could not go to Production as-is: every invited customer would still
be exposed to a foreign provider, including medical data. The fix needed a
mechanism visible to the trigger at INSERT time.

## 7a. The fix — DB-backed pending-invite contract (Variante 3)

Chosen deliberately over the two alternatives: **no** `raw_user_meta_data` as
a security source (client-settable on a normal `/signup`) and **no** GoTrue
`before-user-created` hook.

### Anchor

`auth.users.email` is a core column written in the same statement as the row
insert, so it **is** visible to the trigger — unlike `app_metadata`. The whole
contract hangs off the normalized email.

### Pieces

| File | Role |
|---|---|
| `20260917150000_add_pending_client_invite_contract_v1.sql` (new) | `public.hm_pending_client_invites` + `create_pending_client_invite_v1` / `bind_pending_client_invite_v1` / `invalidate_pending_client_invite_v1` / `_hm_has_active_pending_client_invite` |
| `20260917155000_…` (rebuilt in place, never production-live) | suppression now reads the contract by email, not `raw_app_meta_data` |
| `20260917160000_…` (rebuilt in place) | requires a **bound** invite of the same provider, grants exactly once, consumes the invite in the same transaction |
| `supabase/functions/invite-client-with-password/index.ts` | creates the invite **before** `createUser`, binds it **after**, invalidates it on every failure path |

### Sequence

```
1. authorize caller as provider with Pro          (unchanged)
2. create_pending_client_invite_v1(provider, email, request_id, ttl=15min)
3. auth.admin.createUser(...)      <- trigger sees the open invite by email
                                      => suppresses the first-provider fallback
                                      => creates NO grant at all
4. bind_pending_client_invite_v1(invite, provider, user_id)
5. create_invited_customer_with_contact(provider, user_id, ...)
                                   => the ONE intended grant + consume invite
```

### Why binding is required

The trigger only knows the email. Without step 4 a provider could open an
invite on an address and then harvest a **foreign self-signup** of the same
address — a wrong grant. The canonical RPC therefore accepts only invites
bound to that exact `user_id`. A self-signup is never bound; during the window
it merely gets no fallback provider ("no grant"), never a wrong one.

### Safety properties

- The table is RLS-enabled with **zero policies** and `REVOKE ALL … FROM
  PUBLIC, anon, authenticated` — unreachable from the browser.
- The invite **never** grants access. Its only trigger-side effect is
  suppression, so even a forged invite could only cause "no grant".
- `_hm_has_active_pending_client_invite` returns `boolean`, so the trigger
  cannot even learn which provider invited.
- Partial unique index → at most one open invite per address; DB-level
  serialization instead of application-level checks.
- `(provider_id, request_id)` unique → retry never creates a second invite.
- 15-minute TTL; `create_pending_client_invite_v1` expires stale rows for the
  address first, so an expired invite can neither block a new invitation nor
  permanently suppress a normal signup.
- The canonical RPC additionally aborts if **any** foreign active grant exists
  on the invited customer — last line of defence, rollback instead of silent
  acceptance.

### Real-GoTrue test matrix on staging (re-run after the fix)

Driven through the actual `invite-client-with-password` Edge Function with a
real provider JWT, not a SQL simulation.

| # | Case | Result |
|---|---|---|
| T1 | Provider A invites via the real Edge Function | **PASS** — grants after the full flow: exactly Provider A. Audit for any grant to a provider ≠ A: `(none)`. No temporary foreign grant at any point. |
| T2 | Provider B tries to claim A's invite (invite artificially re-opened to give B the best possible chance) | **PASS** — `Invited user is not marked for this provider`; grants unchanged |
| T3 | `createUser` fails (email already registered) | **PASS** — invite invalidated (`createUser failed`), open-invite count before = after = 0, no stale pending state |
| T4 | canonical RPC fails after `createUser` (whitespace `full_name`) | **PASS** — auth user removed, no grant anywhere, invite invalidated with `cleanup_required = true` |
| T5 | Retry of the whole invite | **PASS** — 1 user, 1 contact, 1 grant; canonical RPC retry returns `already_completed` |
| T6 | Normal signup, no pending invite | **PASS** — unchanged first-provider fallback |
| T7 | Genuinely expired invite (both timestamps aged) | **PASS** — suppression off, normal signup **not** blocked and gets the normal fallback, `bind` → `Pending invite has expired`, canonical RPC → `No valid pending invite for this user`, a fresh invite for the same address works again |
| T7b | Same, with a provider that is **not** the current fallback, to remove ambiguity | **PASS** — that provider ends with 0 grants |

Note on reading T6/T7: `user_roles.id` is a **uuid**, so the "oldest provider"
fallback (`ORDER BY ur.id LIMIT 1`) is effectively "lowest uuid", not "oldest".
In these runs the freshly created Provider A happened to hold the lowest uuid
and therefore legitimately *became* the fallback target. The expected value is
computed at assertion time for that reason. This ordering quirk is
pre-existing behaviour and was deliberately left untouched.

All test users, invites, grants and contacts were removed afterwards:
`access_grants = 0`, `hm_pending_client_invites = 0`.

`PRODUCTION_CALLS_DURING_THIS_RUN = 0` — `net._http_response` stayed at the
same 3 rows from the earlier incident throughout.

## 7b. Second P0 — ghost merge bypassed the contract (Codex narrow review)

The pending-invite contract of §7a was correct but incomplete. A narrow review
found that `handle_new_user()` reaches the same outcome by a different route.

### The defect

`handle_new_user()` runs three things in the `auth.users` INSERT transaction:

1. `INSERT public.profiles`
2. `INSERT public.user_roles` → `auto_assign_client_to_provider()` — the §7a
   suppression works correctly here, no fallback grant
3. a **ghost-merge loop** over every profile with the same email and no auth
   user, containing:
   `UPDATE public.access_grants SET client_id = NEW.id WHERE ag.client_id = ghost.id`

Step 3 knows nothing about the invite contract and re-points **any** provider's
active grant at the new auth user:

```
Provider A owns ghost X with an active grant
Provider B invites the same email
  => during the auth.users INSERT, A's grant moves onto B's new customer
  => a foreign grant exists before create_invited_customer_with_contact runs
```

The §7a suppression does not help: it prevents a **new** fallback grant, not
the **re-pointing of an existing** one.

### The fix — `20260920120000_fix_pending_invite_ghost_merge_v1.sql`

A follow-up migration (the three earlier files were already applied to
staging, so they were not rewritten again). `CREATE OR REPLACE` on three
functions, no table, index, policy or grant change — cleanly applicable to an
already-migrated staging.

1. **`handle_new_user()`** — when a valid open pending invite exists for
   `NEW.email`, the ghost-merge loop is skipped **entirely**. Not just the
   grant transfer: horses, appointments, contacts and the ghost soft-delete
   too. Moving the data while leaving the grant behind would blind the
   rightful ghost owner to exactly that data — damage, not protection.
   Nothing is deleted afterwards; the grant is never transferred in the first
   place.

2. **Ghost finalization moves into `create_invited_customer_with_contact()`**,
   where the inviting provider is known and validated, so CASE A and CASE B
   can be told apart:

   | Case | Behaviour |
   |---|---|
   | **A** — Provider A owns ghost X, Provider A invites X | safe takeover: horses/appointments/contacts move to the new auth user, A's grant is carried over, the ghost is soft-deleted |
   | **B** — Provider A owns ghost X, Provider B invites the same email | **fail closed**: exception, full rollback, no grant, no merge, ghost A byte-for-byte unchanged. Multi-provider ghost merging is deliberately not redesigned here. |

   The conflict check runs **before** any write to the ghost, and covers both
   foreign active grants and foreign contacts on the ghost.

3. **Email contract (P1)** — the RPC now compares all three normalized:
   `pending_invite.normalized_email` == `auth.users.email` ==
   `p_profile->>'email'`, through the same `_hm_normalize_email` helper.
   `p_profile` comes from the request and is checked, never trusted.

4. **TTL (P1)** — `create_pending_client_invite_v1` sets
   `expires_at = now() + interval '15 minutes'` from a constant.
   `p_ttl_minutes` is kept for signature compatibility but is no longer a
   security input; a caller cannot widen or narrow the suppression window.

### Real-GoTrue verification on staging

| # | Case | Result |
|---|---|---|
| T-GHOST-2 | A owns ghost (+grant, horse, contact), B invites the same email. Observed at three points. | **PASS** — (A) right after `createUser`: 0 grants on the new user, ghost intact; (B) after binding: still 0; (C) canonical finalization: `An existing customer record for this email belongs to another provider`, ghost unchanged (grant, horse, contact, not soft-deleted) |
| T-GHOST-2-E2E | Same case through the **real Edge Function** | **PASS** — auth user removed, no grant for B, invite invalidated with `cleanup_required=true`, 0 open invites, ghost untouched |
| T-GHOST-1 | A owns ghost, A invites the same email, real Edge Function | **PASS** — exactly A's grant, no foreign grant, ghost soft-deleted, horse moved, contact present |
| T-GHOST-3 | Ghost with active grants from **two** providers, A invites | **PASS** — nothing transferred during the auth insert, canonical call fails closed, ghost keeps both grants |
| T-EMAIL-1 | invite email ≠ auth email | **PASS** — rejected at `bind`; inviting provider ends with 0 grants |
| T-EMAIL-2 | `p_profile.email` ≠ auth email | **PASS** — `Customer email does not match the invited user`, no grant |
| T-EMAIL-2b | correct address in uppercase with surrounding spaces | **PASS** — accepted, normalization is consistent |
| T-TTL | caller requests 60 min, then 1 min | **PASS** — both stored as exactly 15 minutes |
| T-RETRY | unchanged from §7a | **PASS** |

A first run of this suite produced vacuous passes: the ghost fixture silently
rolled back because `validate_access_grant_roles()` requires the client to
have a `user_roles` row, so the "ghost" had no grant and CASE B was never
actually exercised. The fixture was fixed (`ON_ERROR_STOP` plus the missing
role row) and the suite re-run — the results above are from that run.

All test data removed afterwards: `access_grants = 0`,
`hm_pending_client_invites = 0`, no leftover test profiles or auth users.

## 8. Gates

| Gate | Result |
|---|---|
| `npm test` | PASS — 20 files, 240 tests |
| `VITE_APP_FLAVOR=hufmanager npm run build -- --outDir /tmp/hufmanager-staging-activation` | PASS — built in 26.44s, PWA precache 715 entries |
| `npm run lint:hufmanager` | PASS — `files=23 existing_errors=42 existing_warnings=6`, baseline unchanged |
| `git diff --check` | PASS |
| `tsc -p tsconfig.app.json --noEmit` | exit 2, **131 pre-existing baseline errors, unchanged**. None in `src/integrations/supabase/types.ts`; none at any `create_customer_with_contact` call site (`hufi-actions.ts:469`, `AddCustomerModal.tsx:84`, `ProviderSetupWizard.tsx:151` are all clean). The one repo edit reorders two properties inside a type literal, which is semantically inert in TypeScript. NEW_TS_REGRESSIONS=NO. |

## 8a. Staging runtime note

The staging Edge Functions are served by a foreground `supabase functions serve`
process (needed to inject `supabase/functions/.env`). If that process is
stopped, the staging Edge Functions stop with it and must be restarted with
`supabase functions serve` from `/home/administrator/hufmanager`.

## 9. Repository changes in this session

| File | Change |
|---|---|
| `src/integrations/supabase/types.ts` | The hand-added `create_customer_with_contact` RPC entry (and its "regenerate once applied" comment) replaced by the generator's own output. No other entry touched. |
| `supabase/migrations/20260917150000_add_pending_client_invite_contract_v1.sql` | **new** — the pending-invite contract |
| `supabase/migrations/20260917155000_fix_invite_tenant_auto_assign_v1.sql` | rebuilt in place on the contract (was never production-live) |
| `supabase/migrations/20260917160000_add_create_invited_customer_with_contact_v1.sql` | rebuilt in place on the contract |
| `supabase/functions/invite-client-with-password/index.ts` | invite before `createUser`, bind after, invalidate on every failure path; `app_metadata` marker removed |
| `src/lib/inviteTenantBinding.test.ts` | rewritten for the pending-invite contract (it previously pinned the *broken* marker contract), then extended with the ghost/email/TTL regressions — 47 assertions, all passing |
| `supabase/migrations/20260920120000_fix_pending_invite_ghost_merge_v1.sql` | **new** — closes the ghost-merge bypass (§7b) plus the two P1s |

`hm_pending_client_invites` and the three invite RPCs were deliberately **not**
added to `types.ts`: they are service-role-only and must never be reachable
from the browser client, so a missing browser type is the correct state.

## 10. Rollback

Full pre-activation `pg_dump` (custom format) of staging:
`/home/administrator/hufmanager-staging-backups/20260920-124922-pre-activation-20260917set/staging-full.dump`
