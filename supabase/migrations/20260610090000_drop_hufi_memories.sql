-- Drop orphaned hufi_memories table.
--
-- Background: hufi_memories (System A) was never wired into the active
-- frontend. All memory reads/writes go through hufi_memory (System B,
-- hufi-brain.ts). The table contained 0 rows on 2026-06-10 (verified by
-- Pascal on project vnschgjxkzzwzefqlrji). src/lib/hufi-memory.ts has been
-- deleted in the same cleanup pass.

DROP TABLE IF EXISTS public.hufi_memories;
