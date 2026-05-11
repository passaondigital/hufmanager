-- ============================================================================
-- Vault Premium Gate
--
-- Purpose:
--   1. Add vault_plan / vault_plan_status / vault_subscription_id to profiles.
--   2. Add SECURITY DEFINER helper public.has_vault_access(uid) that decides
--      whether a user may WRITE to the vault. Hybrid model:
--        - separate vault_plan paid via Copecart (light/pro/gestuet/unlimited)
--        - OR HufManager subscription on pro/duo/team (already paying customer)
--        - OR plan_override grants (lifetime_grant, manual_cash_1y while valid)
--   3. Restrict INSERT/UPDATE on vault_documents to has_vault_access.
--      SELECT and DELETE remain owner-only (so users keep read access to
--      existing files for 12 months after cancellation — explicit product
--      promise on TresorPricing).
--   4. Restrict the horse-vault storage bucket likewise on writes.
--
-- Reversible: yes, see DOWN section in comment block below.
-- ============================================================================

-- ── 1. profiles columns ─────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vault_plan text
    CHECK (vault_plan IS NULL OR vault_plan IN ('light', 'pro', 'gestuet', 'unlimited')),
  ADD COLUMN IF NOT EXISTS vault_plan_status text
    CHECK (vault_plan_status IS NULL OR vault_plan_status IN ('active', 'cancelled', 'past_due', 'trialing')),
  ADD COLUMN IF NOT EXISTS vault_subscription_id text,
  ADD COLUMN IF NOT EXISTS vault_billing_cycle text
    CHECK (vault_billing_cycle IS NULL OR vault_billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN public.profiles.vault_plan IS
  'Standalone Tresor plan tier. NULL = no separate vault subscription (vault access may still be granted via subscription_plan or plan_override).';
COMMENT ON COLUMN public.profiles.vault_plan_status IS
  'Lifecycle status of the standalone vault subscription. Mirrors Copecart events.';

-- ── 2. has_vault_access helper ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_vault_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.is_suspended IS NOT TRUE
      AND (
        -- (a) Standalone vault subscription is active or trialing
        (p.vault_plan IS NOT NULL
         AND p.vault_plan_status IN ('active', 'trialing'))
        OR
        -- (b) HufManager paying plan on pro/duo/team (provider perk)
        (p.subscription_plan IN ('pro', 'duo', 'team', 'advanced')
         AND p.subscription_status IN ('active', 'trialing', 'lifetime'))
        OR
        -- (c) Lifetime grant / employee / beta-tester / cash-paid (while valid)
        (p.plan_override IN ('lifetime_grant', 'employee')
         AND (p.access_valid_until IS NULL OR p.access_valid_until > now()))
        OR
        (p.plan_override IN ('manual_cash_1y', 'beta_tester')
         AND p.access_valid_until IS NOT NULL
         AND p.access_valid_until > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_vault_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_vault_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.has_vault_access(uuid) IS
  'Returns true iff the user may WRITE to the document vault. Hybrid model: standalone vault_plan OR HufManager pro+ plan OR valid plan_override grant.';

-- ── 3. vault_documents premium gate ────────────────────────────────────────
-- Existing "Owner full access" policy is FOR ALL and grants every owner
-- INSERT/UPDATE/DELETE/SELECT. We replace it with split policies so paying
-- status only gates writes; reads + deletes stay open for owners.

DROP POLICY IF EXISTS "Owner full access to own vault docs" ON public.vault_documents;

CREATE POLICY "Owner can read own vault docs"
  ON public.vault_documents FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete own vault docs"
  ON public.vault_documents FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner with vault access can insert vault docs"
  ON public.vault_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.has_vault_access(auth.uid())
  );

CREATE POLICY "Owner with vault access can update vault docs"
  ON public.vault_documents FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND public.has_vault_access(auth.uid())
  );

-- ── 4. horse-vault storage bucket: write requires has_vault_access ─────────
DROP POLICY IF EXISTS "Owner can upload vault files" ON storage.objects;

CREATE POLICY "Owner with vault access can upload vault files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'horse-vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_vault_access(auth.uid())
  );

-- Read + delete policies for horse-vault remain unchanged (owner-only by path).

-- ── 5. Index for webhook lookups by vault_subscription_id ──────────────────
CREATE INDEX IF NOT EXISTS profiles_vault_subscription_id_idx
  ON public.profiles (vault_subscription_id)
  WHERE vault_subscription_id IS NOT NULL;

-- ============================================================================
-- DOWN (manual rollback reference, do not execute as part of this migration):
--
-- DROP POLICY IF EXISTS "Owner with vault access can upload vault files" ON storage.objects;
-- CREATE POLICY "Owner can upload vault files" ON storage.objects FOR INSERT
--   TO authenticated WITH CHECK (
--     bucket_id = 'horse-vault'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- DROP POLICY IF EXISTS "Owner with vault access can update vault docs" ON public.vault_documents;
-- DROP POLICY IF EXISTS "Owner with vault access can insert vault docs" ON public.vault_documents;
-- DROP POLICY IF EXISTS "Owner can delete own vault docs" ON public.vault_documents;
-- DROP POLICY IF EXISTS "Owner can read own vault docs" ON public.vault_documents;
-- CREATE POLICY "Owner full access to own vault docs" ON public.vault_documents FOR ALL
--   TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--
-- DROP INDEX IF EXISTS profiles_vault_subscription_id_idx;
-- DROP FUNCTION IF EXISTS public.has_vault_access(uuid);
-- ALTER TABLE public.profiles
--   DROP COLUMN IF EXISTS vault_billing_cycle,
--   DROP COLUMN IF EXISTS vault_subscription_id,
--   DROP COLUMN IF EXISTS vault_plan_status,
--   DROP COLUMN IF EXISTS vault_plan;
-- ============================================================================
