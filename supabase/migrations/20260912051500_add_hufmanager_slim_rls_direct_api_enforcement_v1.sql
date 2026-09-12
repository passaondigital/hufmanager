-- HufManager Slim — Access/Entitlement V1, Phase 9: RLS_PROVIDER_ENFORCEMENT +
-- DIRECT_API_ACCESS_ENFORCEMENT.
--
-- Scope decision (protection surface), derived from a real, queried
-- inventory of Production RLS policies this session (see
-- docs/HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md and this migration's own
-- header) — NOT a guess, NOT "every table with RLS on":
--
--   public.contacts, public.appointments, public.hoof_analyses,
--   public.invoices, public.horses
--
-- These are the only tables that are (a) a provider's own productive
-- HufManager business data (client roster, calendar, hoof documentation,
-- billing-to-clients, horse records) and (b) already carry a distinct
-- "the acting provider owns/manages this row" permissive policy today.
-- Deliberately EXCLUDED: public.profiles, public.user_roles,
-- public.provider_subscriptions, public.client_subscriptions,
-- public.manual_payments, public.product_entitlements — gating any of
-- these would break the PAUSED business rule (Login/Profile/Billing/
-- Reaktivierung/Logout/Datenexport must keep working with zero access).
-- public.data-export (Edge Function) already runs under
-- SUPABASE_SERVICE_ROLE_KEY (verified by reading its source this session),
-- so it is unaffected by RLS entirely — Datenexport stays allowed for a
-- PAUSED/FROZEN/LOCKED account with no change needed here.
--
-- Mechanism: one RESTRICTIVE policy per table (Postgres ANDs a RESTRICTIVE
-- policy with whatever PERMISSIVE policy would otherwise have allowed the
-- row), not an edit to any existing PERMISSIVE policy. This is what "Add
-- enforcement" without "touch existing customer-relationship policies"
-- (task requirement 4) means mechanically — every existing policy row
-- inventoried on Production for these 5 tables is untouched, verified by
-- diffing pg_policy before/after on staging (see
-- scripts/verify-phase9-rls-diff.mjs).
--
-- Each restrictive check has the shape:
--   NOT (<this row belongs to auth.uid() acting as its provider>)
--   OR public.has_hufmanager_access_v1()
--   OR public.is_admin(auth.uid())
--   OR public.is_master_admin()
-- i.e. "if I'm not the owning provider on this row, this restriction does
-- not apply to me at all" (so every client-side / partner-side / horse
-- owner policy keeps working untouched), "if I am, I need real
-- HufManager Slim access, unless I'm an admin" (PROVEN_ADMIN_EMPLOYEE
-- bypasses billing state entirely, matching the existing admin-full-access
-- policies already on these tables).
--
-- `has_hufmanager_access_v1()` takes no argument (security review finding
-- F3, 2026-09-12 — see
-- docs/HUFMANAGER_SLIM_ENTITLEMENT_SECURITY_REVIEW_2026-09-12.md): it
-- always evaluates against the querying session (auth.uid()) internally,
-- which is all an RLS policy ever needs — the original `(_user_id uuid)`
-- signature, granted to `authenticated`, made it a direct cross-account
-- entitlement/billing-status oracle.
--
-- public.horses has no provider_id column at all — the provider dimension
-- there is public.access_grants (provider_id, client_id) OR
-- profiles.created_by_provider_id (security review finding F2,
-- 2026-09-12): every permissive policy on this table
-- ("Providers can view/delete/insert client horses",
-- provider_can_manage_client_horses()) grants provider access via EITHER
-- path, independently — access_grants is not the only one. The original
-- version of this migration checked access_grants only, which left the
-- common "provider creates a client directly" flow (no access_grants row
-- at all) completely ungated. The restrictive check below now targets
-- rows reached via EITHER provider path, never "Horse owner full access"
-- (owner_id = auth.uid()), since a true horse owner is never their own
-- provider for the same client_id in practice, and even if they were,
-- that relationship would have to name them as their own provider, which
-- no existing feature creates.

CREATE POLICY "hufmanager_slim_entitlement_gate_v1"
  ON public.contacts
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_v1"
  ON public.appointments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_v1"
  ON public.hoof_analyses
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_v1"
  ON public.invoices
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_v1"
  ON public.horses
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.access_grants ag
         WHERE ag.client_id = horses.owner_id
           AND ag.provider_id = auth.uid()
           AND ag.is_active = true
           AND ag.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = horses.owner_id
           AND p.created_by_provider_id = auth.uid()
      )
    )
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
  );

-- INSERT has no existing row to test provider_id against yet (WITH CHECK,
-- not USING) — same gate, evaluated against the row being inserted.

CREATE POLICY "hufmanager_slim_entitlement_gate_insert_v1"
  ON public.contacts
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_insert_v1"
  ON public.appointments
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_insert_v1"
  ON public.hoof_analyses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

CREATE POLICY "hufmanager_slim_entitlement_gate_insert_v1"
  ON public.invoices
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IS DISTINCT FROM auth.uid()
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
    OR public.is_master_admin()
  );

-- "Provider can create horses for clients" / "Providers can insert horses
-- for granted clients" WITH CHECK already allow owner_id = auth.uid() (a
-- client creating their own horse — never gated, correctly) OR either
-- provider path (access_grants OR created_by_provider_id — the paths this
-- restriction targets).
CREATE POLICY "hufmanager_slim_entitlement_gate_insert_v1"
  ON public.horses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR NOT (
      EXISTS (
        SELECT 1 FROM public.access_grants ag
         WHERE ag.client_id = horses.owner_id
           AND ag.provider_id = auth.uid()
           AND ag.is_active = true
           AND ag.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = horses.owner_id
           AND p.created_by_provider_id = auth.uid()
      )
    )
    OR public.has_hufmanager_access_v1()
    OR public.is_admin(auth.uid())
  );
