import { supabase } from "@/integrations/supabase/client";

/**
 * Loosely typed Supabase client.
 *
 * Some Hufi tables / views / RPCs (hufi_memory, hufi_routines, agent_tasks, …)
 * are not part of the generated `Database` types, and a few queries blow up the
 * TypeScript instantiation depth limit. Use `db` for those calls — behaviour is
 * identical to `supabase`, only the compile-time typing is relaxed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
