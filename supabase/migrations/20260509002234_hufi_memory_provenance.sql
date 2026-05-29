-- ============================================================================
-- Provenance migration for the Hufi Memory layer.
--
-- Purpose:
--   Versions the live schema for `public.hufi_memory` and
--   `public.hufi_memories` in the repo. Both tables were created via the
--   Supabase Dashboard and were never represented in any earlier migration.
--   See docs/HUFI_MEMORY_SCHEMA_PROVENANCE.md for the source dump.
--
-- Properties:
--   - Idempotent: every statement is safe to run repeatedly.
--   - Non-destructive: no DROP TABLE, no TRUNCATE, no ALTER COLUMN, no data
--     manipulation.
--   - On a database that already has these tables (the live cloud project),
--     applying this migration is a no-op for tables/columns and re-asserts
--     constraints, indexes, RLS, policies and grants.
--   - On a fresh database (e.g. branch restore), this migration restores the
--     full schema for the two tables to match production at 2026-05-09.
--
-- Migration must NOT be applied without explicit Pascal approval.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hufi_memory (
    id           uuid             NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid,
    category     text             NOT NULL,
    key          text             NOT NULL,
    value        jsonb,
    confidence   double precision          DEFAULT 0.5,
    source       text                      DEFAULT 'system'::text,
    last_updated timestamp with time zone  DEFAULT now(),
    expires_at   timestamp with time zone,
    CONSTRAINT hufi_memory_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.hufi_memories (
    id               uuid             NOT NULL DEFAULT gen_random_uuid(),
    user_id          uuid             NOT NULL,
    horse_id         uuid,
    memory_type      text             NOT NULL,
    content          text             NOT NULL DEFAULT ''::text,
    last_updated_by  text                      DEFAULT 'hufi_brain'::text,
    version          integer                   DEFAULT 1,
    exportable       boolean                   DEFAULT true,
    visible_to_owner boolean                   DEFAULT true,
    created_at       timestamp with time zone  DEFAULT now(),
    updated_at       timestamp with time zone  DEFAULT now(),
    CONSTRAINT hufi_memories_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 2. Constraints
-- ----------------------------------------------------------------------------

-- UNIQUE (user_id, category, key) on hufi_memory
-- Postgres has no IF NOT EXISTS for ADD CONSTRAINT; use a guarded DO block.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'hufi_memory_user_id_category_key_key'
          AND conrelid = 'public.hufi_memory'::regclass
    ) THEN
        ALTER TABLE public.hufi_memory
            ADD CONSTRAINT hufi_memory_user_id_category_key_key
            UNIQUE (user_id, category, key);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

-- Partial unique indexes for hufi_memories: covers the dual-mode
-- (with horse_id / without horse_id) "one row per (user × memory_type[ × horse])"
-- semantics that the application code in src/lib/hufi-memory.ts expects.
CREATE UNIQUE INDEX IF NOT EXISTS hufi_memories_user_type_horse_uq
    ON public.hufi_memories (user_id, memory_type, horse_id)
    WHERE horse_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hufi_memories_user_type_uq
    ON public.hufi_memories (user_id, memory_type)
    WHERE horse_id IS NULL;

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_hufi_memories_horse
    ON public.hufi_memories (horse_id);

CREATE INDEX IF NOT EXISTS idx_hufi_memories_user
    ON public.hufi_memories (user_id);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------

-- ENABLE ROW LEVEL SECURITY is idempotent in Postgres.
ALTER TABLE public.hufi_memory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hufi_memories ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. Policies
-- ----------------------------------------------------------------------------

-- Pattern: DROP IF EXISTS, then CREATE — guarantees a single canonical
-- definition without depending on Postgres-version-specific CREATE OR REPLACE
-- POLICY support.

-- hufi_memory: a single FOR ALL policy bound to the row owner.
-- Note: user_id is nullable on this table, so rows with user_id IS NULL
-- are not selectable through this policy (auth.uid() = NULL is NULL,
-- not TRUE). Such rows are reachable only via service_role (Edge Functions)
-- and behave like system-level memory entries by design.
DROP POLICY IF EXISTS hufi_memory_owner ON public.hufi_memory;
CREATE POLICY hufi_memory_owner
    ON public.hufi_memory
    USING (auth.uid() = user_id);

-- hufi_memories: explicit per-operation policies, all bound to the row owner.
DROP POLICY IF EXISTS hufi_memories_select_own ON public.hufi_memories;
CREATE POLICY hufi_memories_select_own
    ON public.hufi_memories
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS hufi_memories_insert_own ON public.hufi_memories;
CREATE POLICY hufi_memories_insert_own
    ON public.hufi_memories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS hufi_memories_update_own ON public.hufi_memories;
CREATE POLICY hufi_memories_update_own
    ON public.hufi_memories
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS hufi_memories_delete_own ON public.hufi_memories;
CREATE POLICY hufi_memories_delete_own
    ON public.hufi_memories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. Grants
-- ----------------------------------------------------------------------------

-- Supabase default grant pattern. RLS is the actual access boundary;
-- these grants are idempotent.
GRANT ALL ON TABLE public.hufi_memory   TO anon;
GRANT ALL ON TABLE public.hufi_memory   TO authenticated;
GRANT ALL ON TABLE public.hufi_memory   TO service_role;

GRANT ALL ON TABLE public.hufi_memories TO anon;
GRANT ALL ON TABLE public.hufi_memories TO authenticated;
GRANT ALL ON TABLE public.hufi_memories TO service_role;

-- ============================================================================
-- End of provenance migration.
-- No data was changed. No column was altered. No table was dropped.
-- ============================================================================
