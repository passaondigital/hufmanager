# HufManager Shared Supabase Security Gate Audit

Datum: 2026-08-12

Scope: READ-ONLY Live-Befunde des Nutzers, lokale Migrationen, lokale Source-Referenzen, vorbereitete Migrations-/Testartefakte. Keine Production-Migration wurde angewendet.

## Executive Summary

HufManager und HufiApp teilen aktuell dieselbe Supabase-Instanz. Die Product-Splitter-Migration ist vorbereitet, aber nicht angewendet. Bestehende Legacy-Nutzer dürfen weiterhin nicht automatisch anhand von `role`, `signup_app`, `subscription_status`, `user_metadata`, Pferdebesitz oder historischem App-State einem Produkt zugeordnet werden.

Production bleibt blockiert, bis folgende Gates erledigt sind:

- Product-Splitter-Dry-Run mit aggregierter Ausgabe.
- DB-/Storage-Backup verifiziert.
- Prepared-Migrations geprüft und explizit freigegeben.
- Live-RLS- und Storage-Policies gegen Cross-User/Cross-Product getestet.
- Security Advisor Findings erneut geprüft.
- Keine automatische ID-Generierung oder Backfill auf Basis von `horses.eqid IS NULL`.

## Live-Befunde

| Bereich | Befund | Bewertung |
| --- | --- | --- |
| `profiles` | 79 total | Shared legacy Bestand |
| `profiles.signup_app` | 78 `NULL`, 1 `hufiapp` | 78 benötigen Product Choice |
| `horses` | 60 total, 60 gültige `owner_id`, 0 orphan owner relationships | Datenbeziehungen erhalten |
| Pferdebesitz | 36 unterschiedliche Nutzer besitzen mindestens ein Pferd | Pferdebesitz ist kein Produktmarker |
| `provider_subscriptions` | 0 | Keine verified paid Quelle |
| `manual_payments` | 0 | Keine verified paid Quelle |
| `client_subscriptions` | 4 active | KundenApp-/Client-Kontext, nicht SaaS-Provider-Beweis |
| `profiles.copecart_subscription_id` | 1 gesetzt | Ein möglicher Payment Marker |
| `subscription_status` | `active`/`trialing` nicht ausreichend | Nicht `VERIFIED_PAID` |

## Canonical ID Truth

Live-Befund:

- `horses.eqid`: bei allen 60 Pferden leer.
- `horses.readable_id`: 60/60 gesetzt, 60/60 Präfix `EQID`.
- `profiles.readable_id`: `KID` 47, `PID` 30, `EID` 1, `PRID` 1.
- `profiles.ecosystem_id`: 79/79 leer.

Konsequenz:

- `horses.readable_id` ist aktuell die bestehende fachliche EQID-Identität.
- `horses.eqid` ist ein leerer Altbestand und darf nicht als Anlass für neue EQID-Generierung genutzt werden.
- Keine bestehende `readable_id` darf durch Product Choice, Rollenreparatur oder Slim-Migration geändert werden.

## ID System Mapping

| PREFIX | ENTITY | CURRENT_COLUMN | GENERATOR | IMMUTABLE | REFERENCED_BY | TARGET_CANONICAL_COLUMN | MIGRATION_REQUIRED |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EQID` | Horse / Equine | `horses.readable_id` | `generate_horse_readable_id()` via `generate_horse_readable_id_trigger`; uses `generate_random_id('EQID')` | Not enforced today | Pferdeakte, Kundenlisten, Admin-Datenhub, `search_horse_by_readable_id`, UI display; legacy `horses.eqid` only in old quality checks | `horses.readable_id` | YES: immutability guard, no backfill, no new generation |
| `KID` | Customer / client profile | `profiles.readable_id` | `generate_profile_readable_id()` default/client branch; historical raw metadata dependency exists in older migration | Not enforced today | Kundenverwaltung, profile search, access grants, admin views | `profiles.readable_id` | YES: immutability guard and generator review, no value rewrite |
| `PID` | Provider / business user profile | `profiles.readable_id` | `generate_profile_readable_id()` provider branch | Not enforced today | Provider admin, revenue views, customer relationships | `profiles.readable_id` | YES: immutability guard and role/product separation |
| `EID` | Employee profile | `profiles.readable_id` | Role repair / later profile readable ID logic; live count confirms use | Not enforced today | Employee/admin contexts | `profiles.readable_id` | YES: needs generator/path review before future role changes |
| `PRID` | Partner profile and CRM partner contact | `profiles.readable_id`, `contacts.readable_id` | `generate_profile_readable_id()` partner branch; `generate_contact_readable_id()` for contacts | Not enforced today | Partner integration, contacts CRM, admin search | `profiles.readable_id` for accounts; `contacts.readable_id` for CRM contacts | YES: immutability guard; clarify account vs contact namespace |

## SECURITY DEFINER Surface

Local migration scan using `scripts/security-definer-surface-audit.mjs` found 162 unique `SECURITY DEFINER` function names in the local migration history, including newly prepared functions. This is a local minimum/source classification, not a live `pg_proc` export.

| Classification | Count | Examples / Notes |
| --- | ---: | --- |
| `PUBLIC_INTENTIONAL` | 11 | Public landing/review/magic-link functions; must still validate payload, rate limit and avoid private data |
| `AUTHENTICATED_REQUIRED` | 15 | Role/context/RPC helpers such as `get_user_role`, `get_horse_medical_data`, `get_provider_clients`, `get_partner_shared_data`, `get_agent_data_hub`, Hufi credit functions |
| `INTERNAL_TRIGGER_ONLY` | 85 | Trigger/helper functions such as `handle_new_user`, `notify_*`, `validate_*`, `generate_*`, `prevent_*`, `protect_*`; direct API EXECUTE generally not needed |
| `ADMIN_ONLY` | 12 | Admin dashboards, repair, admin metadata, invoice/contract generators; body-level admin checks required |
| `BACKEND_ONLY` | 1 | `add_purchased_voice_credits`; service-role/server-only |
| `UNSAFE_OR_SUSPICIOUS` | 4 | `search_horse_by_readable_id`, `delete_client_cascade`, `delete_horse_safe`, `generate_random_id` |
| `NEEDS_REVIEW` | 34 | Mixed helper/application functions requiring live body/privilege export |

Critical findings:

- `search_horse_by_readable_id(text)` originally returned horse basic data by guessed `readable_id` without `auth.uid()` or relationship check. Previous migration revoked anon but left authenticated enumeration risk.
- `generate_random_id(text)` is an internal helper but may be directly executable if grants are not hardened.
- Trigger functions should not be callable as public RPC endpoints.
- `admin_repair_user_role(...)` can change role-related `readable_id` prefix in historical logic. That conflicts with the new canonical ID immutability rule and requires review before future use.
- Delete cascade functions are highly sensitive and must be denied to anon and protected by actor/owner/admin checks.

## RLS Audit Result

Local migrations show RLS enabled for core tables including:

- `profiles`
- `user_roles`
- `horses`
- `appointments`
- `hoof_photos`
- `horse_documents`
- `horse_media`
- `access_grants`
- `horse_partner_access`
- `invoices`
- `expenses`
- `provider_subscriptions`
- prepared `product_memberships`

Open live verification:

| Table / Area | RLS Status From Local Migrations | Gate |
| --- | --- | --- |
| Profiles | Enabled, multiple relationship/admin policies | Verify anon denied and cross-profile access bounded |
| User roles | Enabled | Verify no `user_metadata` authz and no role enumeration |
| Horses | Enabled | Verify owner/provider/partner/customer boundaries |
| Appointments | Enabled | Verify cross-provider and customer-app boundaries |
| Hoof photos / media | Enabled for table, storage needs separate check | Verify object path policies |
| Horse documents | Enabled plus storage policies | Verify no URL/object bypass |
| Access grants | Enabled | Verify no cross-business grant manipulation |
| Horse partner access | Enabled with partner/provider/client policies | Verify owner approval and active/status gates |
| Invoices / invoice items | Invoices enabled; invoice_items require live schema policy export | Verify business billing separation from SaaS billing |
| Expenses | Enabled | Verify provider-only scope |
| Subscriptions | Provider subscriptions enabled; client subscriptions live active count observed | Verify SaaS billing vs customer billing separation |
| Leads | Enabled | Verify public lead endpoint does not expose tenant IDs or business data |
| Product memberships | Prepared, not applied | Must be applied and tested before production splitter |

## Storage Audit Result

Local migrations show many storage buckets and policies. Relevant buckets include:

- `horse-photos`
- `horse-documents`
- `horse-media`
- `horse-vault`
- `expense-receipts`
- `office-pdfs`
- `admin-invoices`
- `legal-documents`
- `completion-reports`

Findings:

- `horse-photos` was once public/broadly readable, later set non-public, but one migration still contains a broad authenticated read (`auth.uid() IS NOT NULL`). Live policy export is required.
- `horse-documents` has several policy rewrites and relationship-based policies; live state must be verified because migration history contains superseded variants.
- `horse-media` has a dedicated bucket with allowed MIME types and owner path checks; live cross-user object tests still required.
- Some buckets are intentionally public or broadly readable for website/content assets (`logos`, `blog-images`, `gallery`), but they must not contain customer/horse data.
- `office-pdfs` had historical public-read removal; live verification required.

No storage migration was prepared in this step because live bucket/policy export is required before safe targeted changes.

## Security Advisor Additional Findings

| Finding | Classification | Rationale |
| --- | --- | --- |
| `anon_security_definer_function_executable` | PRODUCTION_REQUIRED | Default PUBLIC execute on SECURITY DEFINER can bypass RLS |
| `authenticated_security_definer_function_executable` | PRODUCTION_REQUIRED | Authenticated users still must pass relationship/product checks |
| Leaked password protection disabled | RECOMMENDED | Auth hardening for production; enable after confirming Auth settings and user impact |
| `pg_net` extension in public schema | NEEDS_REVIEW | Extension placement should be verified; moving can impact existing jobs/functions |

## Prepared Migrations

Prepared only, not applied:

1. `supabase/migrations/20260812233000_function_execute_privilege_hardening_prepared.sql`
   - Targeted `REVOKE`/`GRANT` by classified function group.
   - Removes anon from sensitive functions.
   - Removes direct RPC execution for selected trigger/helper functions.

2. `supabase/migrations/20260812233100_security_definer_body_hardening_prepared.sql`
   - Replaces `search_horse_by_readable_id(text)` body with relationship checks.
   - Requires `auth.uid()`.
   - Allows owner, provider-for-horse, active partner access, or admin.

3. `supabase/migrations/20260812233200_canonical_readable_id_guard_prepared.sql`
   - Adds immutability triggers for existing `readable_id`.
   - Protects non-empty legacy `horses.eqid` if present in another environment.
   - Does not backfill, rewrite, delete or generate IDs.

Existing splitter migration remains:

- `supabase/migrations/20260812231000_product_membership_splitter.sql`
- Status: prepared, not applied.

## Prepared Tests

Prepared:

- `scripts/security-definer-surface-audit.mjs`
- `scripts/shared-security-gate-negative-tests.sql`

Test intent:

- Anon cannot execute admin/delete/medical/billing/random-ID functions.
- Trigger/helper functions are not public RPC endpoints.
- Product membership uses `UNIQUE(user_id, product)`.
- Product membership RLS exists after splitter migration.
- Readable ID immutability triggers exist after ID guard migration.
- Readable ID knowledge never grants access without RLS/relationship permission.

Live tests still required:

- USER A cannot see USER B horses, appointments, documents, invoices.
- BUSINESS A cannot see BUSINESS B data.
- CUSTOMER A cannot see CUSTOMER B customer-app data.
- HUFMANAGER membership does not imply HUFIAPP access.
- HUFIAPP membership does not imply HUFMANAGER access.
- Storage object paths cannot be guessed across users.

## Production Gate

Status: `BLOCKED`

Required before production:

1. Export live function privileges and compare with local classification.
2. Export live RLS policies and storage policies.
3. Run product splitter dry run with aggregated output only.
4. Verify database and storage backup.
5. Review prepared migrations.
6. Apply migrations only after explicit approval.
7. Run negative SQL tests and cross-user runtime tests.
8. Re-run Security Advisor.
9. Confirm no existing IDs changed.
